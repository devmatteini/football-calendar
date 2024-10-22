import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import * as Config from "effect/Config"
import * as S from "effect/Schema"
import * as Pretty from "effect/Pretty"
import * as ROA from "effect/Array"
import * as ORD from "effect/Order"
import * as O from "effect/Option"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import { FootballCalendar, LeagueRound } from "./football-calendars-config"
import * as Match from "effect/Match"
import { Cache } from "./cache"
import * as crypto from "node:crypto"

export type ApiFootballClient = {
    token: string
    baseUrl: string
    cache: Cache
}
export const ApiFootballClient = Context.GenericTag<ApiFootballClient>("ApiFootballClient")

export const ApiFootballClientLive = Layer.effect(
    ApiFootballClient,
    Effect.gen(function* (_) {
        const token = yield* _(Config.string("API_FOOTBALL_TOKEN"))
        const cache = yield* _(Cache)
        return ApiFootballClient.of({ token, baseUrl: "https://v3.football.api-sports.io", cache })
    }),
)

export const currentSeason = F.pipe(
    Match.type<FootballCalendar>(),
    Match.tag("Team", ({ teamId }) => currentSeasonByTeam(teamId)),
    Match.tag("League", ({ season }) => Effect.succeed(season)),
    Match.exhaustive,
)

// https://www.api-football.com/documentation-v3#tag/Teams/operation/get-teams-seasons
const currentSeasonByTeam = (team: number) =>
    F.pipe(
        get("/teams/seasons", { team: team.toString() }, TeamSeason),
        Effect.flatMap(
            ROA.match({
                onEmpty: () => Effect.fail(new Error(`No seasons for team ${team}`)),
                onNonEmpty: (seasons) => Effect.succeed(ROA.max(seasons, ORD.number)),
            }),
        ),
    )

export const fixtures = (calendar: FootballCalendar, season: number, status: string) =>
    F.pipe(
        Match.value(calendar),
        Match.tag("Team", ({ teamId }) => fixturesByTeam(teamId, season, status)),
        Match.tag("League", ({ leagueId, round }) =>
            fixturesByLeague(leagueId, season, status).pipe(Effect.map(ROA.filter(byRound(round)))),
        ),
        Match.exhaustive,
    )

const KnockoutStages = [
    "Knockout Round Play-offs",
    "Round of 16",
    "Quarter-finals",
    "Semi-finals",
    "3rd Place Final",
    "Final",
]

const byRound = (round: LeagueRound) => (fixture: ApiFootballFixture) =>
    F.pipe(
        Match.value(round),
        Match.when("All", F.constTrue),
        Match.when("KnockoutStage", () => KnockoutStages.includes(fixture.league.round)),
        Match.exhaustive,
    )

// https://www.api-football.com/documentation-v3#tag/Fixtures/operation/get-fixtures
const fixturesByTeam = (team: number, season: number, status: string) =>
    get("/fixtures", { team: team.toString(), season: season.toString(), status }, Fixture)

// https://www.api-football.com/documentation-v3#tag/Fixtures/operation/get-fixtures
const fixturesByLeague = (league: number, season: number, status: string) =>
    get("/fixtures", { league: league.toString(), season: season.toString(), status }, Fixture)

export const FixtureStatus = {
    scheduled: "TBD-NS" as const,
}

type QueryParams = Record<string, string>
const get = <A, I>(endpoint: string, queryParams: QueryParams, schema: S.Schema<A, I>) =>
    Effect.gen(function* (_) {
        const client = yield* _(ApiFootballClient)

        const key = cacheKey(endpoint, queryParams)
        const Body = Response(schema)

        const maybeValue = yield* _(client.cache.load(key, Body.fields.response))
        if (O.isSome(maybeValue)) return maybeValue.value

        const httpClient = (yield* _(HttpClient.HttpClient)).pipe(HttpClient.filterStatusOk)

        const response = yield* _(
            HttpClientRequest.get(new URL(endpoint, client.baseUrl).href, {
                headers: {
                    "x-apisports-key": client.token,
                },
                urlParams: queryParams,
            }),
            httpClient.execute,
            Effect.flatMap(HttpClientResponse.schemaBodyJson(Body)),
            Effect.flatMap((data) =>
                isResponseOk(data)
                    ? Effect.succeed(data.response)
                    : Effect.fail(new Error(`Response for ${endpoint} failed with ${ResponseErrorPrint(data.errors)}`)),
            ),
            Effect.scoped,
        )

        yield* _(client.cache.update(key, Body.fields.response, response))
        return response
    })

const cacheKey = (endpoint: string, queryParams: QueryParams) => {
    const keyRaw = JSON.stringify({ endpoint, queryParams })
    return crypto.createHash("sha256").update(keyRaw).digest("hex")
}

const TeamSeason = S.Number

const FixtureTeam = S.Struct({
    id: S.Number,
    name: S.String,
})
const Fixture = S.Struct({
    fixture: S.Struct({
        id: S.Number,
        date: S.Date,
    }),
    league: S.Struct({
        name: S.String,
        round: S.String,
    }),
    teams: S.Struct({
        home: FixtureTeam,
        away: FixtureTeam,
    }),
})
export type ApiFootballFixture = typeof Fixture.Type

const ResponseError = S.Union(
    S.Array(S.Unknown),
    S.Record({
        key: S.String,
        value: S.Unknown,
    }),
)
type ResponseError = typeof ResponseError.Type
const ResponseErrorPrint = Pretty.make(ResponseError)

const Response = <A, I>(responseItem: S.Schema<A, I>) =>
    S.Struct({
        errors: ResponseError,
        response: S.Array(responseItem),
    })

const isResponseOk = <T extends { errors: ResponseError }>(response: T) =>
    Array.isArray(response.errors) && response.errors.length === 0

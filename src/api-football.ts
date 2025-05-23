import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import * as Config from "effect/Config"
import * as Schema from "effect/Schema"
import * as Pretty from "effect/Pretty"
import * as Array from "effect/Array"
import * as ORD from "effect/Order"
import * as O from "effect/Option"
import * as HttpClient from "@effect/platform/HttpClient"
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
    Effect.gen(function* () {
        const token = yield* Config.string("API_FOOTBALL_TOKEN")
        const cache = yield* Cache
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
            Array.match({
                onEmpty: () => Effect.fail(new Error(`No seasons for team ${team}`)),
                onNonEmpty: (seasons) => Effect.succeed(Array.max(seasons, ORD.number)),
            }),
        ),
    )

export const fixtures = (calendar: FootballCalendar, season: number, status: string) =>
    F.pipe(
        Match.value(calendar),
        Match.tag("Team", ({ teamId }) => fixturesByTeam(teamId, season, status)),
        Match.tag("League", ({ leagueId, round }) =>
            fixturesByLeague(leagueId, season, status).pipe(Effect.map(Array.filter(byRound(round)))),
        ),
        Match.exhaustive,
    )

const Final = "Final"

const KnockoutStages = [
    "Knockout Round Play-offs",
    "Round of 16",
    "Quarter-finals",
    "Semi-finals",
    "3rd Place Final",
    Final,
]

const byRound = (round: LeagueRound) => (fixture: ApiFootballFixture) =>
    F.pipe(
        Match.value(round),
        Match.when("All", F.constTrue),
        Match.when("KnockoutStage", () => KnockoutStages.includes(fixture.league.round)),
        Match.when("Final", () => fixture.league.round === Final),
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
const get = <A, I>(endpoint: string, queryParams: QueryParams, schema: Schema.Schema<A, I>) =>
    Effect.gen(function* () {
        const client = yield* ApiFootballClient

        const key = cacheKey(endpoint, queryParams)
        const Body = Response(schema)

        const maybeValue = yield* client.cache.load(key, Body.fields.response)
        if (O.isSome(maybeValue)) return maybeValue.value

        const httpClient = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk)

        const response = yield* F.pipe(
            httpClient.get(new URL(endpoint, client.baseUrl), {
                headers: {
                    "x-apisports-key": client.token,
                },
                urlParams: queryParams,
            }),
            Effect.flatMap(HttpClientResponse.schemaBodyJson(Body)),
            Effect.flatMap((data) =>
                isResponseOk(data)
                    ? Effect.succeed(data.response)
                    : Effect.fail(new Error(`Response for ${endpoint} failed with ${ResponseErrorPrint(data.errors)}`)),
            ),
            Effect.scoped,
        )

        yield* client.cache.update(key, Body.fields.response, response)
        return response
    })

const cacheKey = (endpoint: string, queryParams: QueryParams) => {
    const keyRaw = JSON.stringify({ endpoint, queryParams })
    return crypto.createHash("sha256").update(keyRaw).digest("hex")
}

const TeamSeason = Schema.Number

const FixtureTeam = Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
})
const Fixture = Schema.Struct({
    fixture: Schema.Struct({
        id: Schema.Number,
        date: Schema.Date,
    }),
    league: Schema.Struct({
        name: Schema.String,
        round: Schema.String,
    }),
    teams: Schema.Struct({
        home: FixtureTeam,
        away: FixtureTeam,
    }),
})
export type ApiFootballFixture = typeof Fixture.Type

const ResponseError = Schema.Union(
    Schema.Array(Schema.Unknown),
    Schema.Record({
        key: Schema.String,
        value: Schema.Unknown,
    }),
)
type ResponseError = typeof ResponseError.Type
const ResponseErrorPrint = Pretty.make(ResponseError)

const Response = <A, I>(responseItem: Schema.Schema<A, I>) =>
    Schema.Struct({
        errors: ResponseError,
        response: Schema.Array(responseItem),
    })

const isResponseOk = <T extends { errors: ResponseError }>(response: T) =>
    Array.isArray(response.errors) && response.errors.length === 0

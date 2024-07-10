import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import * as Config from "effect/Config"
import * as S from "@effect/schema/Schema"
import * as Pretty from "@effect/schema/Pretty"
import * as ROA from "effect/Array"
import * as ORD from "effect/Order"
import * as O from "effect/Option"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import { FootballCalendar } from "./config-file"
import * as Match from "effect/Match"
import { Cache } from "./cache"
import * as crypto from "node:crypto"

export type ApiFootballClient = {
    token: string
    baseUrl: string
}
export const ApiFootballClient = Context.GenericTag<ApiFootballClient>("ApiFootballClient")

export const ApiFootballClientLive = Layer.effect(
    ApiFootballClient,
    F.pipe(
        Config.string("API_FOOTBALL_TOKEN"),
        Effect.map((token) => ApiFootballClient.of({ token, baseUrl: "https://v3.football.api-sports.io" })),
    ),
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
        Match.tag("League", ({ leagueId }) => fixturesByLeague(leagueId, season, status)),
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
        const cache = yield* _(Cache)

        const key = cacheKey(endpoint, queryParams)
        const Body = Response(schema)

        const maybeValue = yield* _(cache.load(key, Body.fields.response))
        if (O.isSome(maybeValue)) return maybeValue.value

        const response = yield* _(
            HttpClientRequest.get(new URL(endpoint, client.baseUrl).href, {
                headers: {
                    "x-apisports-key": client.token,
                },
                urlParams: queryParams,
            }),
            HttpClient.fetchOk,
            Effect.flatMap(HttpClientResponse.schemaBodyJson(Body)),
            Effect.flatMap((data) =>
                isResponseOk(data)
                    ? Effect.succeed(data.response)
                    : Effect.fail(new Error(`Response for ${endpoint} failed with ${ResponseErrorPrint(data.errors)}`)),
            ),
            Effect.scoped,
        )

        yield* _(cache.update(key, Body.fields.response, response))
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
    }),
    teams: S.Struct({
        home: FixtureTeam,
        away: FixtureTeam,
    }),
})
export type ApiFootballFixture = typeof Fixture.Type

const ResponseError = S.Union(S.Array(S.Unknown), S.Record(S.String, S.Unknown))
type ResponseError = typeof ResponseError.Type
const ResponseErrorPrint = Pretty.make(ResponseError)

const Response = <A, I>(responseItem: S.Schema<A, I>) =>
    S.Struct({
        errors: ResponseError,
        response: S.Array(responseItem),
    })

const isResponseOk = <T extends { errors: ResponseError }>(response: T) =>
    Array.isArray(response.errors) && response.errors.length === 0

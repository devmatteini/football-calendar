import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import * as Config from "effect/Config"
import * as S from "@effect/schema/Schema"
import { formatErrors } from "@effect/schema/TreeFormatter"
import * as Pretty from "@effect/schema/Pretty"
import * as E from "effect/Either"
import axios from "axios"
import * as ROA from "effect/ReadonlyArray"
import * as ORD from "effect/Order"

export type ApiFootballClient = {
    token: string
    baseUrl: string
}
export const ApiFootballClient = Context.Tag<ApiFootballClient>()

export const ApiFootballClientLive = Layer.effect(
    ApiFootballClient,
    F.pipe(
        Effect.config(Config.string("API_FOOTBALL_TOKEN")),
        Effect.map((token) => ApiFootballClient.of({ token, baseUrl: "https://v3.football.api-sports.io" })),
    ),
)

// https://www.api-football.com/documentation-v3#tag/Teams/operation/get-teams-seasons
export const currentSeason = (team: number) =>
    F.pipe(
        get("/teams/seasons", { team }, S.number),
        Effect.flatMap(
            ROA.match({
                onEmpty: () => Effect.fail(new Error(`No seasons for team ${team}`)),
                onNonEmpty: (seasons) => F.pipe(seasons, ROA.max(ORD.number), Effect.succeed),
            }),
        ),
    )

// https://www.api-football.com/documentation-v3#tag/Fixtures/operation/get-fixtures
export const fixtures = (team: number, season: number, status: string) =>
    get("/fixtures", { team, season, status }, Fixture)

export const FixtureStatus = {
    scheduled: "TBD-NS" as const,
}

type QueryParams = Record<string, string | number>
const get = <F, T>(endpoint: string, queryParams: QueryParams, schema: S.Schema<F, T>) =>
    ApiFootballClient.pipe(
        Effect.flatMap((client) =>
            F.pipe(
                Effect.promise(() =>
                    axios({
                        method: "GET",
                        baseURL: client.baseUrl,
                        url: endpoint,
                        params: queryParams,
                        headers: {
                            "x-apisports-key": client.token,
                        },
                    }),
                ),
                Effect.flatMap((response) => decode(Response(schema), response.data)),
                Effect.flatMap((data) =>
                    isResponseOk(data)
                        ? Effect.succeed(data.response)
                        : Effect.fail(
                              new Error(`Response for ${endpoint} failed with ${ResponseErrorPrint(data.errors)}`),
                          ),
                ),
            ),
        ),
    )

const FixtureTeam = S.struct({
    id: S.number,
    name: S.string,
})
const Fixture = S.struct({
    fixture: S.struct({
        id: S.number,
        date: S.Date,
    }),
    league: S.struct({
        name: S.string,
    }),
    teams: S.struct({
        home: FixtureTeam,
        away: FixtureTeam,
    }),
})
export type ApiFootballFixture = S.Schema.To<typeof Fixture>

const ResponseError = S.union(S.array(S.unknown), S.record(S.string, S.unknown))
type ResponseError = S.Schema.To<typeof ResponseError>
const ResponseErrorPrint = Pretty.to(ResponseError)

const Response = <F, T>(responseItem: S.Schema<F, T>) =>
    S.struct({
        errors: ResponseError,
        response: S.array(responseItem),
    })

const isResponseOk = <T extends { errors: ResponseError }>(response: T) =>
    Array.isArray(response.errors) && response.errors.length === 0

const decode = <F, T>(schema: S.Schema<F, T>, input: unknown) =>
    F.pipe(
        S.parseEither(schema)(input, { onExcessProperty: "ignore", errors: "all" }),
        E.mapLeft((x) => new Error(formatErrors(x.errors))),
    )

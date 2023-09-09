import * as Effect from "@effect/io/Effect"
import * as F from "@effect/data/Function"
import * as Context from "@effect/data/Context"
import * as Layer from "@effect/io/Layer"
import * as Config from "@effect/io/Config"
import * as S from "@effect/schema/Schema"
import { formatErrors } from "@effect/schema/TreeFormatter"
import * as Pretty from "@effect/schema/Pretty"
import * as E from "@effect/data/Either"
import axios from "axios"
import * as ROA from "@effect/data/ReadonlyArray"
import * as ORD from "@effect/data/Order"

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

export const currentSeason = (team: number) =>
    ApiFootballClient.pipe(
        Effect.flatMap((client) =>
            F.pipe(
                Effect.promise(() => get(client, "/teams/seasons", { team })),
                Effect.flatMap((response) => decode(Response(S.number), response.data)),
                Effect.flatMap((data) =>
                    isResponseOk(data)
                        ? Effect.succeed(data.response)
                        : Effect.fail(new Error(`Response failed with ${ResponseErrorPrint(data.errors)}`)),
                ),
                Effect.flatMap(
                    ROA.match({
                        onEmpty: () => Effect.fail(new Error(`No seasons for team ${team}`)),
                        onNonEmpty: (seasons) => F.pipe(seasons, ROA.max(ORD.number), Effect.succeed),
                    }),
                ),
            ),
        ),
    )

export const fixtures = (team: number, season: number, status: string) =>
    ApiFootballClient.pipe(
        Effect.flatMap((client) =>
            F.pipe(
                Effect.promise(() => get(client, "/fixtures", { team, season, status })),
                Effect.flatMap((response) => decode(Response(Fixture), response.data)),
                Effect.flatMap((data) =>
                    isResponseOk(data)
                        ? Effect.succeed(data.response)
                        : Effect.fail(new Error(`Response failed with ${ResponseErrorPrint(data.errors)}`)),
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

const get = (client: ApiFootballClient, endpoint: string, queryParams?: Record<string, string | number>) =>
    axios({
        method: "GET",
        baseURL: client.baseUrl,
        url: endpoint,
        params: queryParams,
        headers: {
            "x-apisports-key": client.token,
        },
    })

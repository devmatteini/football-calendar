import * as Effect from "@effect/io/Effect"
import * as F from "@effect/data/Function"
import * as Context from "@effect/data/Context"
import * as Layer from "@effect/io/Layer"
import * as Config from "@effect/io/Config"

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

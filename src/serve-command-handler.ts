import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Layer from "effect/Layer"
import * as HttpRouter from "@effect/platform/HttpRouter"
import * as HttpServer from "@effect/platform/HttpServer"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as HttpMiddleware from "@effect/platform/HttpMiddleware"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { createServer } from "node:http"
import * as Schema from "effect/Schema"
import { nextMatchesHandler, NextMatchesResponse } from "./server/next-matches-handler"
import { registerBackgroundJob } from "./server/background-jobs"
import { syncFootballCalendar } from "./server/sync-football-calendar"
import { FileSystemCache } from "./file-system-cache"
import { GoogleCalendarLive } from "./google-calendar"
import { ApiFootballFootballMatchesRepositoryLive } from "./api-football-football-matches-repository"
import * as Locale from "./server/locale"

const NextMatchesQueryParams = Schema.Struct({
    locale: Schema.optionalWith(Locale.Locale, { default: () => Locale.EN_GB }),
    count: Schema.optionalWith(Schema.NumberFromString, { default: () => 5 }),
}).pipe(Schema.annotations({ identifier: "NextMatchesQueryParams" }))

const internalServerError = HttpServerResponse.json({ error: "Internal server error" }, { status: 500 })
const badRequest = HttpServerResponse.json({ error: "Bad request" }, { status: 400 })

const router = HttpRouter.empty.pipe(
    HttpRouter.get(
        "/next-matches",
        Effect.gen(function* () {
            const params = yield* HttpServerRequest.schemaSearchParams(NextMatchesQueryParams)
            const nextMatches = yield* nextMatchesHandler(params.count, params.locale)
            const response = yield* Schema.encode(NextMatchesResponse)(nextMatches)
            return yield* HttpServerResponse.json(response)
        }).pipe(
            Effect.catchTag("ParseError", (error) =>
                F.pipe(Effect.logError("Decode error", error), Effect.zipRight(badRequest)),
            ),
        ),
    ),
    HttpRouter.get("/health", HttpServerResponse.json({ status: "healthy" })),
)

const app = router.pipe(
    Effect.catchAllCause((cause) =>
        Effect.gen(function* () {
            yield* Effect.logError("Internal server error", cause)
            return yield* internalServerError
        }),
    ),
    HttpServer.serve(HttpMiddleware.logger),
    HttpServer.withLogAddress,
)

const port = 6789
const ServerLive = NodeHttpServer.layer(() => createServer(), { port })

const AppServerLive = F.pipe(app, Layer.provide(ServerLive))

const FootballMatchEventsLive = F.pipe(
    GoogleCalendarLive,
    Layer.merge(ApiFootballFootballMatchesRepositoryLive),
    Layer.provide(FileSystemCache),
)

export const serveCommandHandler = Effect.gen(function* () {
    yield* registerBackgroundJob(syncFootballCalendar)
    return yield* Layer.launch(AppServerLive)
}).pipe(Effect.provide(FootballMatchEventsLive))

import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Layer from "effect/Layer"
import * as HttpRouter from "@effect/platform/HttpRouter"
import * as HttpServer from "@effect/platform/HttpServer"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as HttpMiddleware from "@effect/platform/HttpMiddleware"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { createServer } from "node:http"
import * as Schema from "effect/Schema"
import { nextMatchesHandler, NextMatchesResponse } from "./server/next-matches-handler"
import { registerBackgroundJob } from "./server/background-jobs"
import { syncFootballCalendar } from "./server/sync-football-calendar"
import { FootballMatchEventsHandlerDepsLive } from "./football-match-events-handler-live"
import { ApiFootballClientLive } from "./api-football"
import { FileSystemCache } from "./file-system-cache"
import { GoogleCalendarLive } from "./google-calendar"
import { ApiFootballFootballMatchesRepositoryLive } from "./api-football-football-matches-repository"

const DEFAULT_NEXT_MATCHES_COUNT = 5

const router = HttpRouter.empty.pipe(
    HttpRouter.get(
        "/next-matches",
        Effect.gen(function* () {
            const nextMatches = yield* nextMatchesHandler(DEFAULT_NEXT_MATCHES_COUNT)
            const response = yield* Schema.encode(NextMatchesResponse)(nextMatches)
            return yield* HttpServerResponse.json(response)
        }),
    ),
)

const internalServerError = HttpServerResponse.json({ error: "Internal server error" }, { status: 500 })

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
    FootballMatchEventsHandlerDepsLive,
    Layer.merge(GoogleCalendarLive),
    Layer.merge(ApiFootballFootballMatchesRepositoryLive),
    Layer.provide(ApiFootballClientLive),
    Layer.provide(FileSystemCache),
)

export const serveCommandHandler = Effect.gen(function* () {
    yield* registerBackgroundJob(syncFootballCalendar)
    return yield* Layer.launch(AppServerLive)
}).pipe(Effect.provide(FootballMatchEventsLive))

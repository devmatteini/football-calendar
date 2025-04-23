import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Layer from "effect/Layer"
import * as HttpRouter from "@effect/platform/HttpRouter"
import * as HttpServer from "@effect/platform/HttpServer"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as HttpMiddleware from "@effect/platform/HttpMiddleware"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { createServer } from "node:http"

const router = HttpRouter.empty.pipe(
    HttpRouter.get(
        "/",
        Effect.gen(function* () {
            return yield* HttpServerResponse.json({ ok: false })
        }),
    ),
)

const notFound = (message: string) => HttpServerResponse.json({ error: message }, { status: 404 })
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

const ServeLive = F.pipe(app, Layer.provide(ServerLive))

// TODO:
//  1. Create JSON endpoint to return next X calendar events
//  2. setup cron job(s) to sync calendar
export const serveHandler = Layer.launch(ServeLive)

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
import { GoogleCalendarClient, GoogleCalendarClientLive, GoogleCalendarEvent, listEvents } from "./google-calendar"
import * as SchemaExt from "./common/schema-ext"
import { CalendarEvent, NextMatchesDeps, nextMatchesHandler, NextMatchesResponse } from "./server/next-matches-handler"

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

const NextMatchesDepsLive = Layer.effect(
    NextMatchesDeps,
    Effect.gen(function* () {
        const context = yield* Effect.context<GoogleCalendarClient>()

        const validateCalendarEvent = (originalEvent: GoogleCalendarEvent) =>
            F.pipe(
                SchemaExt.decode(CalendarListEvent, originalEvent),
                Effect.map(
                    (validated): CalendarEvent => ({ summary: validated.summary, startDate: validated.start.dateTime }),
                ),
            )

        const CalendarListEvent = Schema.Struct({
            summary: Schema.String,
            start: Schema.Struct({
                dateTime: Schema.Date,
            }),
        })

        const loadMatches = F.pipe(
            listEvents({}),
            Effect.flatMap(Effect.forEach(validateCalendarEvent)),
            Effect.orDie,
            Effect.provide(context),
        )

        return NextMatchesDeps.of({ loadMatches })
    }),
)

const port = 6789
const ServerLive = NodeHttpServer.layer(() => createServer(), { port })

const ServeLive = F.pipe(
    app,
    Layer.provide(NextMatchesDepsLive),
    Layer.provide(GoogleCalendarClientLive),
    Layer.provide(ServerLive),
)

// TODO:
//  2. setup cron job(s) to sync calendar
export const serveHandler = Layer.launch(ServeLive)

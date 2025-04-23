import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Layer from "effect/Layer"
import * as HttpRouter from "@effect/platform/HttpRouter"
import * as HttpServer from "@effect/platform/HttpServer"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as HttpMiddleware from "@effect/platform/HttpMiddleware"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import { createServer } from "node:http"
import * as Context from "effect/Context"
import * as Schema from "effect/Schema"
import * as Array from "effect/Array"
import * as ORD from "effect/Order"
import { GoogleCalendarClient, GoogleCalendarClientLive, GoogleCalendarEvent, listEvents } from "./google-calendar"
import * as SchemaExt from "./common/schema-ext"

const CalendarEvent = Schema.Struct({
    summary: Schema.String,
    startDate: Schema.Date,
})
type CalendarEvent = typeof CalendarEvent.Type

class NextMatchesDeps extends Context.Tag("NextMatchesDeps")<
    NextMatchesDeps,
    { loadMatches: Effect.Effect<CalendarEvent[]> }
>() {}

const MatchResponse = Schema.Struct({
    summary: Schema.String,
    startDate: Schema.Date,
}).pipe(Schema.annotations({ identifier: "MatchResponse" }))

const Response = Schema.Array(MatchResponse).pipe(Schema.annotations({ identifier: "Response" }))

const byMostRecent = F.pipe(
    ORD.Date,
    ORD.mapInput((x: CalendarEvent) => x.startDate),
)

const router = HttpRouter.empty.pipe(
    HttpRouter.get(
        "/",
        // TODO: add error handling
        Effect.gen(function* () {
            const { loadMatches } = yield* NextMatchesDeps

            const matches = yield* loadMatches
            const nextMatches = F.pipe(
                matches,
                Array.sort(byMostRecent),
                // TODO: make this value configurable?
                Array.take(5),
            )

            const response = yield* Schema.encode(Response)(nextMatches)

            return yield* HttpServerResponse.json(response)
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

import * as Layer from "effect/Layer"
import * as Clock from "effect/Clock"
import { CalendarEvent, NextMatchesDeps } from "./next-matches-handler"
import * as Effect from "effect/Effect"
import { GoogleCalendarClient, GoogleCalendarEvent, listEvents } from "../google-calendar"
import * as F from "effect/Function"
import * as SchemaExt from "../common/schema-ext"
import * as Schema from "effect/Schema"

const now = F.pipe(
    Clock.currentTimeMillis,
    Effect.map((currentTime) => new Date(currentTime)),
)

export const NextMatchesDepsLive = Layer.effect(
    NextMatchesDeps,
    Effect.gen(function* () {
        const context = yield* Effect.context<GoogleCalendarClient>()

        const loadMatches = F.pipe(
            now,
            Effect.flatMap((date) => listEvents({}, date)),
            Effect.flatMap(Effect.forEach(validateCalendarEvent)),
            Effect.orDie,
            Effect.provide(context),
        )

        return NextMatchesDeps.of({ loadMatches })
    }),
)

const validateCalendarEvent = (originalEvent: GoogleCalendarEvent) =>
    F.pipe(
        SchemaExt.decode(CalendarListEvent, originalEvent),
        Effect.map((validated): CalendarEvent => ({ summary: validated.summary, startDate: validated.start.dateTime })),
    )

const CalendarListEvent = Schema.Struct({
    summary: Schema.String,
    start: Schema.Struct({
        dateTime: Schema.Date,
    }),
})

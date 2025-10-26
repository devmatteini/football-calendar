import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Array from "effect/Array"
import * as ORD from "effect/Order"
import * as Schema from "effect/Schema"
import { Calendar } from "../calendar"
import { CalendarEvent } from "../football-match-events"

const NextMatchResponse = Schema.Struct({
    summary: Schema.String,
    date: Schema.Date,
    localizedDate: Schema.String,
}).pipe(Schema.annotations({ identifier: "NextMatchResponse" }))

export const NextMatchesResponse = Schema.Array(NextMatchResponse).pipe(
    Schema.annotations({ identifier: "NextMatchesResponse" }),
)

export const nextMatchesHandler = (count: number) =>
    Effect.gen(function* () {
        const { loadEventsFromDate } = yield* Calendar

        const now = new Date()
        const matches = yield* loadEventsFromDate(now)
        return F.pipe(
            matches,
            Array.sort(byMostRecent),
            Array.take(count),
            Array.map((x) =>
                NextMatchResponse.make({
                    summary: x.summary,
                    date: x.startDate,
                    localizedDate: localizeDate(x.startDate),
                }),
            ),
        )
    })

const byMostRecent = F.pipe(
    ORD.Date,
    ORD.mapInput((x: CalendarEvent) => x.startDate),
)

const formatter = new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
})

const localizeDate = (date: Date) => formatter.format(date)

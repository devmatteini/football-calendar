import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Array from "effect/Array"
import * as ORD from "effect/Order"
import * as Context from "effect/Context"
import * as Schema from "effect/Schema"

export const CalendarEvent = Schema.Struct({
    summary: Schema.String,
    startDate: Schema.Date,
})
export type CalendarEvent = typeof CalendarEvent.Type

export class NextMatchesDeps extends Context.Tag("NextMatchesDeps")<
    NextMatchesDeps,
    { loadMatches: Effect.Effect<CalendarEvent[]> }
>() {}

const NextMatchResponse = Schema.Struct({
    summary: Schema.String,
    date: Schema.Date,
}).pipe(Schema.annotations({ identifier: "NextMatchResponse" }))

export const NextMatchesResponse = Schema.Array(NextMatchResponse).pipe(
    Schema.annotations({ identifier: "NextMatchesResponse" }),
)

export const nextMatchesHandler = (count: number) =>
    Effect.gen(function* () {
        const { loadMatches } = yield* NextMatchesDeps

        const matches = yield* loadMatches
        return F.pipe(
            matches,
            Array.sort(byMostRecent),
            Array.take(count),
            Array.map((x) => NextMatchResponse.make({ summary: x.summary, date: x.startDate })),
        )
    })

const byMostRecent = F.pipe(
    ORD.Date,
    ORD.mapInput((x: CalendarEvent) => x.startDate),
)

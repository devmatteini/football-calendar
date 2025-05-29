import * as F from "effect/Function"
import * as Array from "effect/Array"
import * as O from "effect/Option"
import * as Match from "effect/Match"
import * as Schema from "effect/Schema"

export const FootballMatchCalendar = Schema.Struct({
    origin: Schema.Literal("Team", "League"),
    id: Schema.Number,
}).pipe(Schema.annotations({ identifier: "FootballMatchCalendar" }))
export type FootballMatchCalendar = typeof FootballMatchCalendar.Type

export const FootballMatch = Schema.Struct({
    matchId: Schema.Number,
    calendar: FootballMatchCalendar,
    date: Schema.Date,
    homeTeam: Schema.String,
    awayTeam: Schema.String,
    competition: Schema.String,
}).pipe(Schema.annotations({ identifier: "FootballMatch" }))
export type FootballMatch = typeof FootballMatch.Type

export const CalendarEvent = Schema.Struct({
    id: Schema.String,
    matchId: Schema.Number,
    startDate: Schema.Date,
    summary: Schema.String,
}).pipe(Schema.annotations({ identifier: "CalendarEvent" }))
export type CalendarEvent = typeof CalendarEvent.Type

export const CreateFootballMatchEvent = Schema.TaggedStruct("CREATE", { match: FootballMatch }).pipe(
    Schema.annotations({ identifier: "CreateFootballMatchEvent" }),
)
export type CreateFootballMatchEvent = typeof CreateFootballMatchEvent.Type

export const UpdateFootballMatchEvent = Schema.TaggedStruct("UPDATE", {
    match: FootballMatch,
    eventId: CalendarEvent.fields.id,
}).pipe(Schema.annotations({ identifier: "UpdateFootballMatchEvent" }))
export type UpdateFootballMatchEvent = typeof UpdateFootballMatchEvent.Type

export const NothingChangedFootballMatchEvent = Schema.TaggedStruct("NOTHING_CHANGED", {
    matchId: FootballMatch.fields.matchId,
}).pipe(Schema.annotations({ identifier: "NothingChangedFootballMatchEvent" }))
export type NothingChangedFootballMatchEvent = typeof NothingChangedFootballMatchEvent.Type

export const FootballMatchEvent = Schema.Union(
    CreateFootballMatchEvent,
    UpdateFootballMatchEvent,
    NothingChangedFootballMatchEvent,
).pipe(Schema.annotations({ identifier: "FootballMatchEvent" }))
export type FootballMatchEvent = typeof FootballMatchEvent.Type

export const footballMatchEvents = (
    matches: readonly FootballMatch[],
    calendarEvents: readonly CalendarEvent[],
): readonly FootballMatchEvent[] =>
    F.pipe(
        matches,
        Array.map((match) =>
            footballMatchEvent(
                match,
                Array.findFirst(calendarEvents, (x) => x.matchId === match.matchId),
            ),
        ),
    )

const footballMatchEvent = (match: FootballMatch, event: O.Option<CalendarEvent>): FootballMatchEvent =>
    F.pipe(
        Match.value(event),
        Match.when({ _tag: "None" }, () => CreateFootballMatchEvent.make({ match })),
        Match.when({ _tag: "Some", value: (x) => isSameDate(match.date, x.startDate) }, () =>
            NothingChangedFootballMatchEvent.make({ matchId: match.matchId }),
        ),
        Match.when({ _tag: "Some" }, ({ value }) => UpdateFootballMatchEvent.make({ match, eventId: value.id })),
        Match.exhaustive,
    )

const isSameDate = (a: Date, b: Date) => a.getTime() === b.getTime()

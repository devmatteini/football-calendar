import * as F from "effect/Function"
import * as ROA from "effect/Array"
import * as O from "effect/Option"
import * as Match from "effect/Match"
import * as Schema from "effect/Schema"

export const FootballMatchCalendar = Schema.Struct({
    origin: Schema.Literal("Team", "League"),
    id: Schema.Number,
})
export type FootballMatchCalendar = typeof FootballMatchCalendar.Type

export const FootballMatch = Schema.Struct({
    matchId: Schema.Number,
    calendar: FootballMatchCalendar,
    date: Schema.Date,
    homeTeam: Schema.String,
    awayTeam: Schema.String,
    competition: Schema.String,
})
export type FootballMatch = typeof FootballMatch.Type

export const CalendarEvent = Schema.Struct({
    matchId: Schema.Number,
    startDate: Schema.Date,
    originalEvent: Schema.Record({
        key: Schema.String,
        value: Schema.Any,
    }),
})
export type CalendarEvent = typeof CalendarEvent.Type

export const CreateFootballMatchEvent = Schema.TaggedStruct("CREATE", { match: FootballMatch })
export type CreateFootballMatchEvent = typeof CreateFootballMatchEvent.Type

export const UpdateFootballMatchEvent = Schema.TaggedStruct("UPDATE", {
    match: FootballMatch,
    originalCalendarEvent: CalendarEvent.fields.originalEvent,
})
export type UpdateFootballMatchEvent = typeof UpdateFootballMatchEvent.Type

export const NothingChangedFootballMatchEvent = Schema.TaggedStruct("NOTHING_CHANGED", {
    matchId: FootballMatch.fields.matchId,
})
export type NothingChangedFootballMatchEvent = typeof NothingChangedFootballMatchEvent.Type

export const FootballMatchEvent = Schema.Union(
    CreateFootballMatchEvent,
    UpdateFootballMatchEvent,
    NothingChangedFootballMatchEvent,
)
export type FootballMatchEvent = typeof FootballMatchEvent.Type

export const footballMatchEvents = (
    matches: readonly FootballMatch[],
    calendarEvents: readonly CalendarEvent[],
): readonly FootballMatchEvent[] =>
    F.pipe(
        matches,
        ROA.map((match) =>
            footballMatchEvent(
                match,
                ROA.findFirst(calendarEvents, (x) => x.matchId === match.matchId),
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
        Match.when({ _tag: "Some" }, ({ value }) =>
            UpdateFootballMatchEvent.make({ match, originalCalendarEvent: value.originalEvent }),
        ),
        Match.exhaustive,
    )

const isSameDate = (a: Date, b: Date) => a.getTime() === b.getTime()

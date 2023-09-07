import * as F from "@effect/data/Function"
import * as ROA from "@effect/data/ReadonlyArray"
import * as O from "@effect/data/Option"

export type FootballMatch = {
    id: number
    date: Date
}

export type CalendarEvent = {
    matchId: number
    startDate: Date
    originalEvent: Record<string, unknown>
}

export type NewCalendarMatch = {
    type: "NEW"
    match: FootballMatch
}
export type UpdatedCalendarMatch = {
    type: "UPDATED"
    match: FootballMatch
    originalCalendarEvent: CalendarEvent["originalEvent"]
}
export type CalendarMatch =
    | NewCalendarMatch
    | UpdatedCalendarMatch
    | { type: "NOTHING_CHANGED"; matchId: FootballMatch["id"] }

export const calendarMatches = (
    matches: readonly FootballMatch[],
    calendarEvents: readonly CalendarEvent[],
): readonly CalendarMatch[] =>
    F.pipe(
        matches,
        ROA.map((match) =>
            F.pipe(
                calendarEvents,
                ROA.findFirst((x) => x.matchId === match.id),
                O.match({
                    onNone: () => ({ type: "NEW", match }),
                    onSome: (event) =>
                        isSameDate(match.date, event.startDate)
                            ? { type: "NOTHING_CHANGED", matchId: match.id }
                            : { type: "UPDATED", match, originalCalendarEvent: event.originalEvent },
                }),
            ),
        ),
    )

const isSameDate = (a: Date, b: Date) => a.getTime() === b.getTime()

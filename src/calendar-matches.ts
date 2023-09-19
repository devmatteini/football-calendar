import * as F from "@effect/data/Function"
import * as ROA from "@effect/data/ReadonlyArray"
import * as O from "@effect/data/Option"

export type FootballMatch = {
    id: number
    teamId: number
    date: Date
    homeTeam: string
    awayTeam: string
    competition: string
}
export type CalendarEvent = {
    matchId: number
    startDate: Date
    originalEvent: Record<string, any>
}

export type CreateFootballMatchEvent = {
    _tag: "CREATE"
    match: FootballMatch
}
export type UpdatedCalendarMatch = {
    _tag: "UPDATED"
    match: FootballMatch
    originalCalendarEvent: CalendarEvent["originalEvent"]
}
export type NothingChangedCalendarMatch = {
    _tag: "NOTHING_CHANGED"
    matchId: FootballMatch["id"]
}
export type CalendarMatch = CreateFootballMatchEvent | UpdatedCalendarMatch | NothingChangedCalendarMatch

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
                    onNone: () => ({ _tag: "CREATE", match }),
                    onSome: (event) =>
                        isSameDate(match.date, event.startDate)
                            ? { _tag: "NOTHING_CHANGED", matchId: match.id }
                            : { _tag: "UPDATED", match, originalCalendarEvent: event.originalEvent },
                }),
            ),
        ),
    )

const isSameDate = (a: Date, b: Date) => a.getTime() === b.getTime()

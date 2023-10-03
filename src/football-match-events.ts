import * as F from "effect/Function"
import * as ROA from "effect/ReadonlyArray"
import * as O from "effect/Option"

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
export type UpdateFootballMatchEvent = {
    _tag: "UPDATE"
    match: FootballMatch
    originalCalendarEvent: CalendarEvent["originalEvent"]
}
export type NothingChangedFootballMatchEvent = {
    _tag: "NOTHING_CHANGED"
    matchId: FootballMatch["id"]
}
export type FootballMatchEvent = CreateFootballMatchEvent | UpdateFootballMatchEvent | NothingChangedFootballMatchEvent

export const footballMatchEvents = (
    matches: readonly FootballMatch[],
    calendarEvents: readonly CalendarEvent[],
): readonly FootballMatchEvent[] =>
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
                            : { _tag: "UPDATE", match, originalCalendarEvent: event.originalEvent },
                }),
            ),
        ),
    )

const isSameDate = (a: Date, b: Date) => a.getTime() === b.getTime()

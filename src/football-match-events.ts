import * as F from "effect/Function"
import * as ROA from "effect/Array"
import * as O from "effect/Option"
import * as Match from "effect/Match"
import * as Data from "effect/Data"

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
export const CreateFootballMatchEvent = Data.tagged<CreateFootballMatchEvent>("CREATE")

export type UpdateFootballMatchEvent = {
    _tag: "UPDATE"
    match: FootballMatch
    originalCalendarEvent: CalendarEvent["originalEvent"]
}
export const UpdateFootballMatchEvent = Data.tagged<UpdateFootballMatchEvent>("UPDATE")

export type NothingChangedFootballMatchEvent = {
    _tag: "NOTHING_CHANGED"
    matchId: FootballMatch["id"]
}
export const NothingChangedFootballMatchEvent = Data.tagged<NothingChangedFootballMatchEvent>("NOTHING_CHANGED")

export type FootballMatchEvent = CreateFootballMatchEvent | UpdateFootballMatchEvent | NothingChangedFootballMatchEvent

export const footballMatchEvents = (
    matches: readonly FootballMatch[],
    calendarEvents: readonly CalendarEvent[],
): readonly FootballMatchEvent[] =>
    F.pipe(
        matches,
        ROA.map((match) =>
            footballMatchEvent(
                match,
                ROA.findFirst(calendarEvents, (x) => x.matchId === match.id),
            ),
        ),
    )

const footballMatchEvent = (match: FootballMatch, event: O.Option<CalendarEvent>): FootballMatchEvent =>
    F.pipe(
        Match.value(event),
        Match.when({ _tag: "None" }, () => CreateFootballMatchEvent({ match })),
        Match.when({ _tag: "Some", value: (x) => isSameDate(match.date, x.startDate) }, () =>
            NothingChangedFootballMatchEvent({ matchId: match.id }),
        ),
        Match.when({ _tag: "Some" }, ({ value }) =>
            UpdateFootballMatchEvent({ match, originalCalendarEvent: value.originalEvent }),
        ),
        Match.exhaustive,
    )

const isSameDate = (a: Date, b: Date) => a.getTime() === b.getTime()

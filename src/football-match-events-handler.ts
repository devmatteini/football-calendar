import * as Effect from "effect/Effect"
import * as Context from "effect/Context"
import * as ROA from "effect/ReadonlyArray"
import {
    CalendarEvent,
    FootballMatchEvent,
    FootballMatch,
    CreateFootballMatchEvent,
    UpdateFootballMatchEvent,
    footballMatchEvents,
} from "./football-match-events"

export type FootballMatchEventsHandlerDeps = {
    loadMatchesByTeam: (teamId: number) => Effect.Effect<readonly FootballMatch[]>
    loadCalendarEventsByTeam: (teamId: number) => Effect.Effect<readonly CalendarEvent[]>
    createCalendarEvent: (event: CreateFootballMatchEvent) => Effect.Effect<void>
    updateCalendarEvent: (event: UpdateFootballMatchEvent) => Effect.Effect<void>
    saveCalendarEvent: (event: CreateFootballMatchEvent | UpdateFootballMatchEvent) => Effect.Effect<void>
}

export const FootballMatchEventsHandlerDeps = Context.GenericTag<FootballMatchEventsHandlerDeps>(
    "FootballMatchEventsHandlerDeps",
)

type Summary = { created: number; updated: number; nothingChanged: number }

export const footballMatchEventsHandler = (teamId: number) =>
    Effect.gen(function* (_) {
        const { loadMatchesByTeam, loadCalendarEventsByTeam, saveCalendarEvent } =
            yield* _(FootballMatchEventsHandlerDeps)

        const [matches, calendarEvents] = yield* _(
            Effect.all([loadMatchesByTeam(teamId), loadCalendarEventsByTeam(teamId)], { concurrency: 2 }),
        )

        const matchEvents = footballMatchEvents(matches, calendarEvents)

        yield* _(
            matchEvents,
            onlyCreateOrUpdateEvents,
            Effect.forEach((x) => saveCalendarEvent(x), { concurrency: 2, discard: true }),
        )

        return toSummary(matchEvents)
    })

type CreateOrUpdateEvent = Exclude<FootballMatchEvent, { _tag: "NOTHING_CHANGED" }>
const onlyCreateOrUpdateEvents = (events: readonly FootballMatchEvent[]) =>
    ROA.filter(events, (x): x is CreateOrUpdateEvent => x._tag !== "NOTHING_CHANGED")

const toSummary = (events: readonly FootballMatchEvent[]): Summary => ({
    created: ROA.filter(events, (x) => x._tag === "CREATE").length,
    updated: ROA.filter(events, (x) => x._tag === "UPDATE").length,
    nothingChanged: ROA.filter(events, (x) => x._tag === "NOTHING_CHANGED").length,
})

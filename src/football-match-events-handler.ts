import * as F from "effect/Function"
import * as Effect from "effect/Effect"
import * as Context from "effect/Context"
import * as Array from "effect/Array"
import {
    CalendarEvent,
    FootballMatchEvent,
    FootballMatch,
    CreateFootballMatchEvent,
    UpdateFootballMatchEvent,
    footballMatchEvents,
} from "./football-match-events"
import { FootballCalendar } from "./football-calendars-config"
import { Calendar } from "./calendar"

export type FootballMatchEventsHandlerDeps = {
    loadMatches: (calendar: FootballCalendar) => Effect.Effect<readonly FootballMatch[]>
    loadCalendarEvents: (calendar: FootballCalendar) => Effect.Effect<readonly CalendarEvent[]>
    saveCalendarEvent: (event: CreateFootballMatchEvent | UpdateFootballMatchEvent) => Effect.Effect<void>
}

export const FootballMatchEventsHandlerDeps = Context.GenericTag<FootballMatchEventsHandlerDeps>(
    "FootballMatchEventsHandlerDeps",
)

type Summary = { created: number; updated: number; nothingChanged: number }

export const footballMatchEventsHandler = (calendar: FootballCalendar) =>
    Effect.gen(function* () {
        const { loadMatches } = yield* FootballMatchEventsHandlerDeps
        const { loadEvents: loadCalendarEvents, saveEvent: saveCalendarEvent } = yield* Calendar

        const [matches, calendarEvents] = yield* Effect.all(
            // keep new line
            [loadMatches(calendar), loadCalendarEvents(calendar)],
            { concurrency: 2 },
        )

        const matchEvents = footballMatchEvents(matches, calendarEvents)

        yield* F.pipe(
            matchEvents,
            onlyCreateOrUpdateEvents,
            Effect.forEach((x) => saveCalendarEvent(x), { concurrency: 2, discard: true }),
        )

        return toSummary(matchEvents)
    })

type CreateOrUpdateEvent = Exclude<FootballMatchEvent, { _tag: "NOTHING_CHANGED" }>
const onlyCreateOrUpdateEvents = (events: readonly FootballMatchEvent[]) =>
    Array.filter(events, (x): x is CreateOrUpdateEvent => x._tag !== "NOTHING_CHANGED")

const toSummary = (events: readonly FootballMatchEvent[]): Summary => ({
    created: Array.filter(events, (x) => x._tag === "CREATE").length,
    updated: Array.filter(events, (x) => x._tag === "UPDATE").length,
    nothingChanged: Array.filter(events, (x) => x._tag === "NOTHING_CHANGED").length,
})

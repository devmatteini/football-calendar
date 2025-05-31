import * as F from "effect/Function"
import * as Effect from "effect/Effect"
import * as Array from "effect/Array"
import { FootballMatchEvent, footballMatchEvents } from "./football-match-events"
import { FootballCalendar } from "./football-calendars-config"
import { Calendar } from "./calendar"
import { FootballMatchesRepository } from "./football-matches-repository"

type Summary = { created: number; updated: number; nothingChanged: number }

export const footballMatchEventsHandler = (calendar: FootballCalendar) =>
    Effect.gen(function* () {
        const { loadByFootballCalendar: loadMatches } = yield* FootballMatchesRepository
        const { loadEventsByFootballCalendar: loadCalendarEvents, saveEvent: saveCalendarEvent } = yield* Calendar

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

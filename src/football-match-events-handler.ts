import * as Effect from "effect/Effect"
import * as Context from "effect/Context"
import * as F from "effect/Function"
import * as ROA from "effect/ReadonlyArray"
import * as Match from "effect/Match"
import {
    CalendarEvent,
    FootballMatchEvent,
    FootballMatch,
    CreateFootballMatchEvent,
    UpdateFootballMatchEvent,
    footballMatchEvents,
} from "./football-match-events"

export type Deps = {
    loadMatchesByTeam: (teamId: number) => Effect.Effect<never, never, readonly FootballMatch[]>
    loadCalendarEventsByTeam: (teamId: number) => Effect.Effect<never, never, readonly CalendarEvent[]>
    createCalendarEvent: (event: CreateFootballMatchEvent) => Effect.Effect<never, never, void>
    updateCalendarEvent: (event: UpdateFootballMatchEvent) => Effect.Effect<never, never, void>
}

export const Deps = Context.Tag<Deps>()

type Summary = { created: number; updated: number; nothingChanged: number }

export const footballMatchEventsHandler = (teamId: number): Effect.Effect<Deps, never, Summary> =>
    F.pipe(
        Deps,
        Effect.flatMap(({ loadMatchesByTeam, loadCalendarEventsByTeam, createCalendarEvent, updateCalendarEvent }) =>
            F.pipe(
                Effect.all(
                    {
                        matches: loadMatchesByTeam(teamId),
                        calendarEvents: loadCalendarEventsByTeam(teamId),
                    },
                    { concurrency: 2 },
                ),
                Effect.map(({ matches, calendarEvents }) => footballMatchEvents(matches, calendarEvents)),
                Effect.tap((matches) =>
                    F.pipe(
                        matches,
                        onlyCreateOrUpdateEvents,
                        ROA.map(createOrUpdateEvents(createCalendarEvent, updateCalendarEvent)),
                        Effect.allWith({ concurrency: 2, discard: true }),
                    ),
                ),
                Effect.map(toSummary),
            ),
        ),
    )

type CreateOrUpdateEvent = Exclude<FootballMatchEvent, { _tag: "NOTHING_CHANGED" }>
const onlyCreateOrUpdateEvents = (events: readonly FootballMatchEvent[]) =>
    ROA.filter(events, (x): x is CreateOrUpdateEvent => x._tag !== "NOTHING_CHANGED")

const createOrUpdateEvents = (create: Deps["createCalendarEvent"], update: Deps["updateCalendarEvent"]) =>
    F.pipe(
        Match.type<CreateOrUpdateEvent>(),
        Match.tag("CREATE", (x) => create(x)),
        Match.tag("UPDATE", (x) => update(x)),
        Match.exhaustive,
    )

const toSummary = (events: readonly FootballMatchEvent[]): Summary => ({
    created: ROA.filter(events, (x) => x._tag === "CREATE").length,
    updated: ROA.filter(events, (x) => x._tag === "UPDATE").length,
    nothingChanged: ROA.filter(events, (x) => x._tag === "NOTHING_CHANGED").length,
})

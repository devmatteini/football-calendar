import * as Effect from "effect/Effect"
import * as Context from "effect/Context"
import * as F from "effect/Function"
import * as ROA from "effect/ReadonlyArray"
import {
    CalendarEvent,
    CreateFootballMatchEvent,
    FootballMatch,
    FootballMatchEvent,
    footballMatchEvents,
    UpdateFootballMatchEvent,
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
                Effect.map(elaborateData),
                Effect.bind("_", (matches) =>
                    Effect.all(
                        F.pipe(
                            ROA.map(matches.create, (x) => createCalendarEvent(x)),
                            ROA.appendAll(ROA.map(matches.update, (x) => updateCalendarEvent(x))),
                        ),
                        { concurrency: 2, discard: true },
                    ),
                ),
                Effect.map(toSummary),
            ),
        ),
    )

/*






BELOW YOU CAN FIND IMPLEMENTATION DETAILS THAT ARE NOT IMPORTANT FOR THE PURPOSE OF THIS TALK









*/

const toSummary = <
    T extends { create: readonly unknown[]; update: readonly unknown[]; nothingChanged: readonly unknown[] },
>(
    matches: T,
): Summary => ({
    created: matches.create.length,
    updated: matches.update.length,
    nothingChanged: matches.nothingChanged.length,
})

const elaborateData = ({
    matches,
    calendarEvents,
}: {
    matches: readonly FootballMatch[]
    calendarEvents: readonly CalendarEvent[]
}) => F.pipe(footballMatchEvents(matches, calendarEvents), groupByTag)

type Groups<T extends { _tag: string }> = {
    [K in T["_tag"]]: readonly Extract<T, { _tag: K }>[]
}

const groupByTag = (footballMatchEvents: readonly FootballMatchEvent[]) =>
    F.pipe(
        footballMatchEvents,
        ROA.reduce(emptyGroups, (state, curr) => {
            const previous = state[curr._tag]
            return { ...state, [curr._tag]: [...previous, curr] }
        }),
        ({ CREATE, UPDATE, NOTHING_CHANGED }) => ({
            create: CREATE,
            update: UPDATE,
            nothingChanged: NOTHING_CHANGED,
        }),
    )

const emptyGroups: Groups<FootballMatchEvent> = { CREATE: [], UPDATE: [], NOTHING_CHANGED: [] }

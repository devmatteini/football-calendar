import * as Effect from "@effect/io/Effect"
import * as Context from "@effect/data/Context"
import * as F from "@effect/data/Function"
import * as ROA from "@effect/data/ReadonlyArray"
import {
    CalendarEvent,
    CalendarMatch,
    FootballMatch,
    NewCalendarMatch,
    UpdatedCalendarMatch,
    calendarMatches,
} from "./calendar-matches"

export type Deps = {
    loadMatchesByTeam: (teamId: number) => Effect.Effect<never, never, readonly FootballMatch[]>
    loadCalendarEventsByTeam: (teamId: number) => Effect.Effect<never, never, readonly CalendarEvent[]>
    createCalendarEvent: (event: NewCalendarMatch) => Effect.Effect<never, never, void>
    updateCalendarEvent: (event: UpdatedCalendarMatch) => Effect.Effect<never, never, void>
}

export const Deps = Context.Tag<Deps>()

type CalendarMatchesSummary = { new: number; updated: number; nothingChanged: number }

export const calendarMatchesHandler = (teamId: number): Effect.Effect<Deps, never, CalendarMatchesSummary> =>
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
                Effect.map(({ matches, calendarEvents }) =>
                    F.pipe(calendarMatches(matches, calendarEvents), groupByTag),
                ),
                Effect.bind("_", (matches) =>
                    Effect.all(
                        F.pipe(
                            ROA.map(matches.new, (x) => createCalendarEvent(x)),
                            ROA.appendAll(ROA.map(matches.updated, (x) => updateCalendarEvent(x))),
                        ),
                        { concurrency: 2, discard: true },
                    ),
                ),
                Effect.map((matches) => ({
                    new: matches.new.length,
                    updated: matches.updated.length,
                    nothingChanged: matches.nothingChanged.length,
                })),
            ),
        ),
    )

type Groups<T extends { _tag: string }> = {
    [K in T["_tag"]]: readonly Extract<T, { _tag: K }>[]
}

const groupByTag = (calendarMatches: readonly CalendarMatch[]) =>
    F.pipe(
        calendarMatches,
        ROA.reduce(emptyGroups, (state, curr) => {
            const previous = state[curr._tag]
            return { ...state, [curr._tag]: [...previous, curr] }
        }),
        ({ NEW, UPDATED, NOTHING_CHANGED }) => ({ new: NEW, updated: UPDATED, nothingChanged: NOTHING_CHANGED }),
    )

const emptyGroups: Groups<CalendarMatch> = { NEW: [], UPDATED: [], NOTHING_CHANGED: [] }

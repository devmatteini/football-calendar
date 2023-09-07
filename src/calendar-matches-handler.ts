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

export const calendarMatchesHandler = (teamId: number): Effect.Effect<Deps, never, void> =>
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
                    F.pipe(
                        calendarMatches(matches, calendarEvents),
                        ROA.filter(
                            (x): x is Exclude<CalendarMatch, { type: "NOTHING_CHANGED" }> =>
                                x.type !== "NOTHING_CHANGED",
                        ),
                    ),
                ),
                Effect.flatMap(
                    // TODO: replace with pattern matching
                    Effect.forEach((x) => (x.type === "NEW" ? createCalendarEvent(x) : updateCalendarEvent(x)), {
                        discard: true,
                    }),
                ),
            ),
        ),
    )

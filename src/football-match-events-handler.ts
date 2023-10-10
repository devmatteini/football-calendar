import * as Effect from "effect/Effect"
import * as Context from "effect/Context"
import * as F from "effect/Function"
import * as ROA from "effect/ReadonlyArray"
import { CalendarEvent, FootballMatch, FootballMatchEvent, footballMatchEvents } from "./football-match-events"

// TODO list:
// - load matches by team
// - load calendar events by team
// - elaborate data
// - create/update elaborated calendar events
// - return a summary of the operations

export type Deps = {}
export const Deps = Context.Tag<Deps>()

export const footballMatchEventsHandler = (teamId: number): Effect.Effect<never, never, void> => {
    return Effect.die("TBI")
}

/*






BELOW YOU CAN FIND IMPLEMENTATION DETAILS THAT ARE NOT IMPORTANT FOR THE PURPOSE OF THIS TALK









*/

export type Summary = { created: number; updated: number; nothingChanged: number }

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

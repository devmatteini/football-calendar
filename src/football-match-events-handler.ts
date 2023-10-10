import * as Effect from "effect/Effect"
import * as Console from "effect/Console"
import * as F from "effect/Function"
import * as ROA from "effect/ReadonlyArray"
import { CalendarEvent, FootballMatch, FootballMatchEvent, footballMatchEvents } from "./football-match-events"

// TODO list:
// - load matches by team
// - load calendar events by team
// - elaborate data
// - print a summary of the operations to do
// - create/update calendar events

export const footballMatchEventsHandler = (teamId: number) => {
    throw new Error("TBI")
}

/*






BELOW YOU CAN FIND IMPLEMENTATION DETAILS THAT ARE NOT IMPORTANT FOR THE PURPOSE OF THIS TALK









*/

const toSummary = <
    T extends { create: readonly unknown[]; update: readonly unknown[]; nothingChanged: readonly unknown[] },
>(
    matches: T,
) => ({
    create: matches.create.length,
    update: matches.update.length,
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

const logMatchesAndCalendarEvents = ({
    matches,
    calendarEvents,
}: {
    matches: readonly FootballMatch[]
    calendarEvents: readonly CalendarEvent[]
}) => {
    const events = calendarEvents.map((x) => ({
        matchId: x.matchId,
        startDate: x.startDate,
        eventId: x.originalEvent?.id,
    }))
    return Console.log(JSON.stringify({ matches, calendarEvents: events }, null, 2))
}

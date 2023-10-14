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

const toSummary = (events: readonly FootballMatchEvent[]) => ({
    create: events.filter((x) => x._tag === "CREATE").length,
    update: events.filter((x) => x._tag === "UPDATE").length,
    nothingChanged: events.filter((x) => x._tag === "NOTHING_CHANGED").length,
})

const elaborateData = ({
    matches,
    calendarEvents,
}: {
    matches: readonly FootballMatch[]
    calendarEvents: readonly CalendarEvent[]
}) => F.pipe(footballMatchEvents(matches, calendarEvents))

type CreateOrUpdateEvent = Exclude<FootballMatchEvent, { _tag: "NOTHING_CHANGED" }>
const filterCreateOrUpdateEvents = (events: readonly FootballMatchEvent[]) =>
    ROA.filter(events, (x): x is CreateOrUpdateEvent => x._tag !== "NOTHING_CHANGED")

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

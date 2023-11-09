import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as ROA from "effect/ReadonlyArray"
import * as Match from "effect/Match"
import * as Context from "effect/Context"
import {
    CalendarEvent,
    CreateFootballMatchEvent,
    FootballMatch,
    FootballMatchEvent,
    footballMatchEvents,
    UpdateFootballMatchEvent,
} from "./football-match-events"

// TODO list:
// X load matches by team
// X load calendar events by team
// X elaborate data
// X print a summary of the operations to do
// X create/update calendar events

export type Deps = {
    loadMatchesByTeam: (teamId: number) => Effect.Effect<never, never, readonly FootballMatch[]>
    loadCalendarEventsByTeam: (teamId: number) => Effect.Effect<never, never, readonly CalendarEvent[]>
    createCalendarEvent: (command: CreateFootballMatchEvent) => Effect.Effect<never, never, void>
    updateCalendarEvent: (command: UpdateFootballMatchEvent) => Effect.Effect<never, never, void>
}
export const Deps = Context.Tag<Deps>()

export const footballMatchEventsHandler = (teamId: number): Effect.Effect<Deps, never, void> =>
    F.pipe(
        Deps,
        Effect.flatMap(({ loadMatchesByTeam, loadCalendarEventsByTeam, updateCalendarEvent, createCalendarEvent }) =>
            F.pipe(
                Effect.all(
                    {
                        matches: loadMatchesByTeam(teamId),
                        calendarEvents: loadCalendarEventsByTeam(teamId),
                    },
                    { concurrency: 2 },
                ),
                Effect.map(elaborateData),
                Effect.tap((commands) =>
                    F.pipe(
                        // keep new line
                        Effect.logInfo("Commands to execute"),
                        Effect.annotateLogs(toSummary(commands)),
                    ),
                ),
                Effect.map(filterCreateOrUpdateEvents),
                Effect.flatMap((commands) => {
                    const effects = ROA.map(commands, createOrUpdate(createCalendarEvent, updateCalendarEvent))
                    return Effect.all(effects, { discard: true, concurrency: 5 })
                }),
            ),
        ),
    )

/*






BELOW YOU CAN FIND IMPLEMENTATION DETAILS THAT ARE NOT IMPORTANT FOR THE PURPOSE OF THIS TALK









*/

const elaborateData = ({
    matches,
    calendarEvents,
}: {
    matches: readonly FootballMatch[]
    calendarEvents: readonly CalendarEvent[]
}) => F.pipe(footballMatchEvents(matches, calendarEvents))

type Summary = { create: number; update: number; nothingChanged: number }
const toSummary = (events: readonly FootballMatchEvent[]): Summary => ({
    create: events.filter((x) => x._tag === "CREATE").length,
    update: events.filter((x) => x._tag === "UPDATE").length,
    nothingChanged: events.filter((x) => x._tag === "NOTHING_CHANGED").length,
})

type CreateOrUpdateEvent = Exclude<FootballMatchEvent, { _tag: "NOTHING_CHANGED" }>
const filterCreateOrUpdateEvents = (events: readonly FootballMatchEvent[]) =>
    ROA.filter(events, (x): x is CreateOrUpdateEvent => x._tag !== "NOTHING_CHANGED")

const createOrUpdate = (create: Deps["createCalendarEvent"], update: Deps["updateCalendarEvent"]) =>
    F.pipe(
        Match.type<CreateOrUpdateEvent>(),
        Match.tag("CREATE", (x) => create(x)),
        Match.tag("UPDATE", (x) => update(x)),
        Match.exhaustive,
    )

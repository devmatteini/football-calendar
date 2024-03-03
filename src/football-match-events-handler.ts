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

export type FootballMatchEventsHandlerDeps = {
    loadMatchesByTeam: (teamId: number) => Effect.Effect<readonly FootballMatch[]>
    loadCalendarEventsByTeam: (teamId: number) => Effect.Effect<readonly CalendarEvent[]>
    createCalendarEvent: (event: CreateFootballMatchEvent) => Effect.Effect<void>
    updateCalendarEvent: (event: UpdateFootballMatchEvent) => Effect.Effect<void>
    saveCalendarEvent: (event: CreateFootballMatchEvent | UpdateFootballMatchEvent) => Effect.Effect<void>
}

export const FootballMatchEventsHandlerDeps = Context.GenericTag<FootballMatchEventsHandlerDeps>(
    "FootballMatchEventsHandlerDeps",
)

type Summary = { created: number; updated: number; nothingChanged: number }

export const footballMatchEventsHandler = (teamId: number) =>
    Effect.gen(function* (_) {
        const { loadMatchesByTeam, loadCalendarEventsByTeam, createCalendarEvent, updateCalendarEvent } =
            yield* _(FootballMatchEventsHandlerDeps)

        const [matches, calendarEvents] = yield* _(
            Effect.all([loadMatchesByTeam(teamId), loadCalendarEventsByTeam(teamId)], { concurrency: 2 }),
        )

        const matchEvents = footballMatchEvents(matches, calendarEvents)

        yield* _(
            matchEvents,
            onlyCreateOrUpdateEvents,
            ROA.map(createOrUpdateEvents(createCalendarEvent, updateCalendarEvent)),
            Effect.allWith({ concurrency: 2, discard: true }),
        )

        return toSummary(matchEvents)
    })

type CreateOrUpdateEvent = Exclude<FootballMatchEvent, { _tag: "NOTHING_CHANGED" }>
const onlyCreateOrUpdateEvents = (events: readonly FootballMatchEvent[]) =>
    ROA.filter(events, (x): x is CreateOrUpdateEvent => x._tag !== "NOTHING_CHANGED")

const createOrUpdateEvents = (
    create: FootballMatchEventsHandlerDeps["createCalendarEvent"],
    update: FootballMatchEventsHandlerDeps["updateCalendarEvent"],
) =>
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

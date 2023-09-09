import * as F from "@effect/data/Function"
import * as ROA from "@effect/data/ReadonlyArray"
import * as Config from "@effect/io/Config"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import { ApiFootballClientLive, currentSeason, fixtures } from "./api-football"
import { CalendarEvent } from "./calendar-matches"
import { Deps as CalendarMatchesHandlerDeps, calendarMatchesHandler } from "./calendar-matches-handler"
import { AuthenticatedGoogleCalendarLive, listEvents } from "./google-calendar"

const main = async () => {
    await F.pipe(
        // TODO: pass teamId as argument to cli
        Effect.config(Config.number("TEAM_ID")),
        Effect.flatMap(calendarMatchesHandler),
        Effect.tap(() => Effect.logInfo("Football calendar updated!")),
        Effect.provideLayer(
            Layer.mergeAll(ApiFootballClientLive, AuthenticatedGoogleCalendarLive, CalendarMatchesHandlerDepsLive),
        ),
        Effect.runPromise,
    )
}

const CalendarMatchesHandlerDepsLive = Layer.succeed(CalendarMatchesHandlerDeps, {
    createCalendarEvent: (event) =>
        Effect.logInfo(`Create match ${event.match.id} at ${event.match.date.toISOString()}`),
    updateCalendarEvent: (event) =>
        Effect.logInfo(
            `Update match ${event.match.id} from ${(event.originalCalendarEvent as any)?.start
                .dateTime} to ${event.match.date.toISOString()}`,
        ),
    loadMatchesByTeam: (teamId) =>
        F.pipe(
            currentSeason(teamId),
            Effect.flatMap((currentSeason) => fixtures(teamId, currentSeason, "TBD-NS")),
            Effect.map(ROA.map((x) => ({ id: x.fixture.id, date: x.fixture.date }))),
            Effect.provideLayer(ApiFootballClientLive),
            Effect.orDie,
        ),
    loadCalendarEventsByTeam: (teamId) =>
        F.pipe(
            listEvents(`FC-${teamId}`),
            Effect.map(
                ROA.map((event): CalendarEvent => {
                    // TODO: validate event with Schema
                    // NOTE: description can contain HTML
                    const parts = (event.description || "").split("@")
                    const matchId = parseInt(parts[1])
                    // TODO: check originalEvent and event type error
                    return { matchId, startDate: new Date(event.start?.dateTime || ""), originalEvent: event as any }
                }),
            ),
            Effect.provideLayer(AuthenticatedGoogleCalendarLive),
            Effect.orDie,
        ),
})

main().catch((e) => {
    console.error(e)
    process.exit(1)
})

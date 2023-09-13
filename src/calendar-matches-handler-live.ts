import * as F from "@effect/data/Function"
import * as ROA from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as S from "@effect/schema/Schema"
import { formatErrors } from "@effect/schema/TreeFormatter"
import * as E from "@effect/data/Either"
import { ApiFootballClientLive, ApiFootballFixture, FixtureStatus, currentSeason, fixtures } from "./api-football"
import { CalendarEvent, FootballMatch } from "./calendar-matches"
import { Deps as CalendarMatchesHandlerDeps } from "./calendar-matches-handler"
import {
    AuthenticatedGoogleCalendarLive,
    listEvents,
    insertEvent,
    updateEvent,
    GoogleCalendarEvent,
} from "./google-calendar"
import * as EventMatchId from "./event-match-id"

export const CalendarMatchesHandlerDepsLive = Layer.succeed(CalendarMatchesHandlerDeps, {
    createCalendarEvent: ({ match }) =>
        F.pipe(
            insertEvent({
                summary: `${match.homeTeam}-${match.awayTeam} (${match.competition})`,
                start: {
                    dateTime: match.date.toISOString(),
                    timeZone: "UTC",
                },
                end: {
                    dateTime: addHours(match.date, 2).toISOString(),
                    timeZone: "UTC",
                },
                extendedProperties: {
                    private: EventMatchId.encode({ teamId: match.teamId, matchId: match.id }),
                },
            }),
            Effect.tap(() => Effect.logInfo(`Created event for match ${match.homeTeam}-${match.awayTeam}`)),
            Effect.provideLayer(AuthenticatedGoogleCalendarLive),
            Effect.orDie,
        ),
    updateCalendarEvent: ({ match, originalCalendarEvent }) =>
        F.pipe(
            updateEvent({
                ...originalCalendarEvent,
                start: {
                    dateTime: match.date.toISOString(),
                    timeZone: "UTC",
                },
                end: {
                    dateTime: addHours(match.date, 2).toISOString(),
                    timeZone: "UTC",
                },
            }),
            Effect.tap(() => Effect.logInfo(`Updated event for match ${match.homeTeam}-${match.awayTeam}`)),
            Effect.provideLayer(AuthenticatedGoogleCalendarLive),
            Effect.orDie,
        ),
    loadMatchesByTeam: (teamId) =>
        F.pipe(
            currentSeason(teamId),
            Effect.flatMap((currentSeason) => fixtures(teamId, currentSeason, FixtureStatus.scheduled)),
            Effect.map(ROA.map(toFootballMatch(teamId))),
            Effect.provideLayer(ApiFootballClientLive),
            Effect.orDie,
        ),
    loadCalendarEventsByTeam: (teamId) =>
        F.pipe(
            listEvents(EventMatchId.encodeTeam(teamId)),
            Effect.flatMap(Effect.forEach(validateCalendarEvent)),
            Effect.provideLayer(AuthenticatedGoogleCalendarLive),
            Effect.orDie,
        ),
})

const toFootballMatch =
    (teamId: number) =>
    ({ fixture, league, teams }: ApiFootballFixture): FootballMatch => ({
        id: fixture.id,
        teamId,
        date: fixture.date,
        homeTeam: teams.home.name,
        awayTeam: teams.away.name,
        competition: league.name,
    })

const validateCalendarEvent = (originalEvent: GoogleCalendarEvent) =>
    F.pipe(
        decode(CalendarListEvent, originalEvent),
        Effect.map(
            (validated): CalendarEvent => ({
                matchId: validated.extendedProperties.private.matchId,
                startDate: validated.start.dateTime,
                originalEvent,
            }),
        ),
    )

const CalendarListEvent = S.struct({
    start: S.struct({
        dateTime: S.Date,
    }),
    extendedProperties: S.struct({
        private: EventMatchId.Schema,
    }),
})

const decode = <F, T>(schema: S.Schema<F, T>, input: unknown) =>
    F.pipe(
        S.parseEither(schema)(input, { onExcessProperty: "ignore", errors: "all" }),
        E.mapLeft((x) => new Error(formatErrors(x.errors))),
    )

const addHours = (date: Date, hours: number) => {
    const newDate = new Date(date)
    newDate.setHours(date.getHours() + hours)
    return newDate
}

import * as F from "@effect/data/Function"
import * as ROA from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as S from "@effect/schema/Schema"
import { formatErrors } from "@effect/schema/TreeFormatter"
import * as E from "@effect/data/Either"
import { ApiFootballClient, ApiFootballFixture, FixtureStatus, currentSeason, fixtures } from "./api-football"
import { CalendarEvent, FootballMatch, CreateFootballMatchEvent, UpdatedCalendarMatch } from "./calendar-matches"
import { Deps as CalendarMatchesHandlerDeps } from "./calendar-matches-handler"
import {
    listEvents,
    insertEvent,
    updateEvent,
    GoogleCalendarEvent,
    AuthenticatedGoogleCalendar,
} from "./google-calendar"
import * as EventMatchId from "./event-match-id"

export const CalendarMatchesHandlerDepsLive = Layer.effect(
    CalendarMatchesHandlerDeps,
    F.pipe(
        Effect.context<AuthenticatedGoogleCalendar | ApiFootballClient>(),
        Effect.map(
            (context): CalendarMatchesHandlerDeps => ({
                createCalendarEvent: F.flow(createCalendarEvent, Effect.provideContext(context)),
                updateCalendarEvent: F.flow(updateCalendarEvent, Effect.provideContext(context)),
                loadMatchesByTeam: F.flow(loadMatchesByTeam, Effect.provideContext(context)),
                loadCalendarEventsByTeam: F.flow(loadCalendarEventsByTeam, Effect.provideContext(context)),
            }),
        ),
    ),
)

const createCalendarEvent = ({ match }: CreateFootballMatchEvent) =>
    F.pipe(
        insertEvent({
            summary: `${match.homeTeam}-${match.awayTeam} (${match.competition})`,
            start: {
                dateTime: match.date.toISOString(),
                timeZone: "UTC",
            },
            end: {
                dateTime: matchEndTime(match.date).toISOString(),
                timeZone: "UTC",
            },
            extendedProperties: {
                private: EventMatchId.encode({ teamId: match.teamId, matchId: match.id }),
            },
        }),
        Effect.tap(() =>
            F.pipe(
                Effect.logDebug("Calendar event created"),
                Effect.annotateLogs({
                    matchId: match.id,
                    match: `${match.homeTeam}-${match.awayTeam}`,
                    competition: match.competition,
                    matchDate: match.date.toISOString(),
                }),
            ),
        ),
        Effect.orDie,
    )

const updateCalendarEvent = ({ match, originalCalendarEvent }: UpdatedCalendarMatch) =>
    F.pipe(
        updateEvent({
            ...originalCalendarEvent,
            start: {
                dateTime: match.date.toISOString(),
                timeZone: "UTC",
            },
            end: {
                dateTime: matchEndTime(match.date).toISOString(),
                timeZone: "UTC",
            },
        }),
        Effect.tap(() =>
            F.pipe(
                Effect.logDebug("Calendar event updated"),
                Effect.annotateLogs({
                    matchId: match.id,
                    match: `${match.homeTeam}-${match.awayTeam}`,
                    competition: match.competition,
                    matchDate: match.date.toISOString(),
                }),
            ),
        ),
        Effect.orDie,
    )

const loadMatchesByTeam = (teamId: number) =>
    F.pipe(
        currentSeason(teamId),
        Effect.flatMap((currentSeason) => fixtures(teamId, currentSeason, FixtureStatus.scheduled)),
        Effect.map(ROA.map(toFootballMatch(teamId))),
        Effect.orDie,
    )

const loadCalendarEventsByTeam = (teamId: number) =>
    F.pipe(
        listEvents(EventMatchId.encodeTeam(teamId)),
        Effect.flatMap(Effect.forEach(validateCalendarEvent)),
        Effect.orDie,
    )

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

const matchEndTime = (date: Date) => {
    const newDate = new Date(date)
    newDate.setMinutes(date.getMinutes() + matchDurationMin + halfTimeMin)
    return newDate
}

const matchDurationMin = 90
const halfTimeMin = 15

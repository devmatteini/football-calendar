import * as F from "effect/Function"
import * as ROA from "effect/ReadonlyArray"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as S from "@effect/schema/Schema"
import { formatErrors } from "@effect/schema/TreeFormatter"
import * as E from "effect/Either"
import { ApiFootballClient, ApiFootballFixture, FixtureStatus, currentSeason, fixtures } from "./api-football"
import {
    CalendarEvent,
    FootballMatch,
    CreateFootballMatchEvent,
    UpdateFootballMatchEvent,
} from "./football-match-events"
import { Deps as FootballMatchEventsHandlerDeps } from "./football-match-events-handler"
import { listEvents, insertEvent, updateEvent, GoogleCalendarEvent, GoogleCalendarClient } from "./google-calendar"
import * as EventMatchId from "./event-match-id"

export const FootballMatchEventsHandlerDepsLive = Layer.effect(
    FootballMatchEventsHandlerDeps,
    F.pipe(
        Effect.context<GoogleCalendarClient | ApiFootballClient>(),
        Effect.map(
            (context): FootballMatchEventsHandlerDeps => ({
                createCalendarEvent: F.flow(createCalendarEvent, Effect.provide(context)),
                updateCalendarEvent: F.flow(updateCalendarEvent, Effect.provide(context)),
                loadMatchesByTeam: F.flow(loadMatchesByTeam, Effect.provide(context)),
                loadCalendarEventsByTeam: F.flow(loadCalendarEventsByTeam, Effect.provide(context)),
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

const updateCalendarEvent = ({ match, originalCalendarEvent }: UpdateFootballMatchEvent) =>
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
        Effect.logDebug("start loadMatchesByTeam"),
        Effect.flatMap(() => currentSeason(teamId)),
        Effect.flatMap((currentSeason) => fixtures(teamId, currentSeason, FixtureStatus.scheduled)),
        Effect.map(ROA.map(toFootballMatch(teamId))),
        Effect.orDie,
        Effect.tap(() => Effect.logDebug("loadMatchesByTeam done")),
    )

const loadCalendarEventsByTeam = (teamId: number) =>
    F.pipe(
        Effect.logDebug("start loadCalendarEventsByTeam"),
        Effect.flatMap(() => listEvents(EventMatchId.encodeTeam(teamId))),
        Effect.flatMap(Effect.forEach(validateCalendarEvent)),
        Effect.orDie,
        Effect.tap(() => Effect.logDebug("loadCalendarEventsByTeam done")),
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

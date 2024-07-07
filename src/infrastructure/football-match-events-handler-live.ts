import * as F from "effect/Function"
import * as ROA from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as S from "@effect/schema/Schema"
import { formatErrorSync } from "@effect/schema/TreeFormatter"
import * as E from "effect/Either"
import {
    ApiFootballClient,
    ApiFootballFixture,
    FixtureStatus,
    currentSeason,
    currentSeasonByTeam,
    fixtures,
} from "../api-football"
import {
    CalendarEvent,
    FootballMatch,
    CreateFootballMatchEvent,
    UpdateFootballMatchEvent,
} from "../football-match-events"
import { FootballMatchEventsHandlerDeps } from "../football-match-events-handler"
import { listEvents, insertEvent, updateEvent, GoogleCalendarEvent, GoogleCalendarClient } from "../google-calendar"
import * as EventMatchId from "../event-match-id"
import * as EffectExt from "../common/effect-ext"
import * as Match from "effect/Match"

export const FootballMatchEventsHandlerDepsLive = Layer.effect(
    FootballMatchEventsHandlerDeps,
    F.pipe(
        Effect.context<GoogleCalendarClient | ApiFootballClient>(),
        Effect.map(
            (context): FootballMatchEventsHandlerDeps => ({
                loadMatchesByTeam: F.flow(loadMatchesByTeam, Effect.provide(context)),
                loadCalendarEventsByTeam: F.flow(loadCalendarEventsByTeam, Effect.provide(context)),
                saveCalendarEvent: F.flow(saveCalendarEvent, Effect.provide(context)),
            }),
        ),
    ),
)

const saveCalendarEvent = (event: CreateFootballMatchEvent | UpdateFootballMatchEvent) =>
    F.pipe(
        Match.value(event),
        Match.tag("CREATE", (x) => createCalendarEvent(x)),
        Match.tag("UPDATE", (x) => updateCalendarEvent(x)),
        Match.exhaustive,
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
            EffectExt.logDebug("Calendar event created", {
                matchId: match.id,
                match: `${match.homeTeam}-${match.awayTeam}`,
                competition: match.competition,
                matchDate: match.date.toISOString(),
            }),
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
            EffectExt.logDebug("Calendar event updated", {
                matchId: match.id,
                match: `${match.homeTeam}-${match.awayTeam}`,
                competition: match.competition,
                matchDate: match.date.toISOString(),
            }),
        ),
        Effect.orDie,
    )

const loadMatchesByTeam = (teamId: number) =>
    F.pipe(
        currentSeasonByTeam(teamId),
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

const CalendarListEvent = S.Struct({
    start: S.Struct({
        dateTime: S.Date,
    }),
    extendedProperties: S.Struct({
        private: EventMatchId.Schema,
    }),
})

const decode = <A, I>(schema: S.Schema<A, I>, input: unknown) =>
    F.pipe(
        S.decodeUnknownEither(schema)(input, { onExcessProperty: "ignore", errors: "all" }),
        E.mapLeft((x) => new Error(formatErrorSync(x))),
    )

const matchEndTime = (date: Date) => {
    const newDate = new Date(date)
    newDate.setMinutes(date.getMinutes() + matchDurationMin + halfTimeMin)
    return newDate
}

const matchDurationMin = 90
const halfTimeMin = 15

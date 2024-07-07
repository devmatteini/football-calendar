import * as F from "effect/Function"
import * as ROA from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as S from "@effect/schema/Schema"
import { formatErrorSync } from "@effect/schema/TreeFormatter"
import * as E from "effect/Either"
import { ApiFootballClient, ApiFootballFixture, FixtureStatus, currentSeason, fixtures } from "../api-football"
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
import { FootballCalendar } from "../config-file"

export const FootballMatchEventsHandlerDepsLive = Layer.effect(
    FootballMatchEventsHandlerDeps,
    F.pipe(
        Effect.context<GoogleCalendarClient | ApiFootballClient>(),
        Effect.map(
            (context): FootballMatchEventsHandlerDeps => ({
                loadMatches: F.flow(loadMatches, Effect.provide(context)),
                loadCalendarEvents: F.flow(loadCalendarEvents, Effect.provide(context)),
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
                private: EventMatchId.encode({ id: match.calendar.id, matchId: match.matchId }),
            },
        }),
        Effect.tap(() =>
            EffectExt.logDebug("Calendar event created", {
                matchId: match.matchId,
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
                matchId: match.matchId,
                match: `${match.homeTeam}-${match.awayTeam}`,
                competition: match.competition,
                matchDate: match.date.toISOString(),
            }),
        ),
        Effect.orDie,
    )

const loadMatches = (calendar: FootballCalendar) =>
    F.pipe(
        currentSeason(calendar),
        Effect.flatMap((currentSeason) => fixtures(calendar, currentSeason, FixtureStatus.scheduled)),
        Effect.map(ROA.map(toFootballMatch(calendar))),
        Effect.orDie,
    )

const loadCalendarEvents = (calendar: FootballCalendar) =>
    F.pipe(
        listEvents(EventMatchId.encodeId(toEventMatchId(calendar))),
        Effect.flatMap(Effect.forEach(validateCalendarEvent)),
        Effect.orDie,
    )

const toFootballMatchCalendar = (calendar: FootballCalendar): FootballMatch["calendar"] =>
    F.pipe(
        Match.value(calendar),
        Match.tag("Team", ({ teamId }) => ({ _tag: "Team" as const, id: teamId })),
        Match.tag("League", ({ leagueId }) => ({ _tag: "League" as const, id: leagueId })),
        Match.exhaustive,
    )

const toFootballMatch =
    (calendar: FootballCalendar) =>
    ({ fixture, league, teams }: ApiFootballFixture): FootballMatch => ({
        matchId: fixture.id,
        calendar: toFootballMatchCalendar(calendar),
        date: fixture.date,
        homeTeam: teams.home.name,
        awayTeam: teams.away.name,
        competition: league.name,
    })

const toEventMatchId = F.pipe(
    Match.type<FootballCalendar>(),
    Match.tag("Team", ({ teamId }) => teamId),
    Match.tag("League", ({ leagueId }) => leagueId),
    Match.exhaustive,
)

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

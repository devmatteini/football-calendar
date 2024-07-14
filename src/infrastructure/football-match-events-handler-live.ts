import * as F from "effect/Function"
import * as ROA from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as S from "@effect/schema/Schema"
import * as SchemaExt from "../common/schema-ext"
import { ApiFootballClient, ApiFootballFixture, FixtureStatus, currentSeason, fixtures } from "../api-football"
import {
    CalendarEvent,
    FootballMatch,
    CreateFootballMatchEvent,
    UpdateFootballMatchEvent,
    FootballMatchCalendar,
} from "../football-match-events"
import { FootballMatchEventsHandlerDeps } from "../football-match-events-handler"
import { listEvents, insertEvent, updateEvent, GoogleCalendarEvent, GoogleCalendarClient } from "../google-calendar"
import * as EventMatchId from "../event-match-id"
import * as EffectExt from "../common/effect-ext"
import * as Match from "effect/Match"
import { FootballCalendar } from "../football-calendars-config"

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

const toFootballMatchCalendar = (calendar: FootballCalendar) =>
    F.pipe(
        Match.value(calendar),
        Match.tag("Team", ({ teamId }) => FootballMatchCalendar.make({ origin: "Team", id: teamId })),
        Match.tag("League", ({ leagueId }) => FootballMatchCalendar.make({ origin: "League", id: leagueId })),
        Match.exhaustive,
    )

const toFootballMatch =
    (calendar: FootballCalendar) =>
    ({ fixture, league, teams }: ApiFootballFixture) =>
        FootballMatch.make({
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
        SchemaExt.decode(CalendarListEvent, originalEvent),
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

const matchEndTime = (date: Date) => {
    const newDate = new Date(date)
    newDate.setMinutes(date.getMinutes() + matchDurationMin + halfTimeMin)
    return newDate
}

const matchDurationMin = 90
const halfTimeMin = 15

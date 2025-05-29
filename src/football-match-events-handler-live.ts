import * as F from "effect/Function"
import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { ApiFootballClient, ApiFootballFixture, currentSeason, fixtures, FixtureStatus } from "./api-football"
import { FootballMatch, FootballMatchCalendar } from "./football-match-events"
import { FootballMatchEventsHandlerDeps } from "./football-match-events-handler"
import * as Match from "effect/Match"
import { FootballCalendar } from "./football-calendars-config"
import * as HttpClient from "@effect/platform/HttpClient"

export const FootballMatchEventsHandlerDepsLive = Layer.effect(
    FootballMatchEventsHandlerDeps,
    F.pipe(
        Effect.context<ApiFootballClient | HttpClient.HttpClient>(),
        Effect.map(
            (context): FootballMatchEventsHandlerDeps => ({
                loadMatches: F.flow(loadMatches, Effect.provide(context)),
            }),
        ),
    ),
)

const loadMatches = (calendar: FootballCalendar) =>
    F.pipe(
        currentSeason(calendar),
        Effect.flatMap((currentSeason) => fixtures(calendar, currentSeason, FixtureStatus.scheduled)),
        Effect.map(Array.map(toFootballMatch(calendar))),
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

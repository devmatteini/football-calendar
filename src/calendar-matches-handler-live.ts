import * as F from "@effect/data/Function"
import * as ROA from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as S from "@effect/schema/Schema"
import { formatErrors } from "@effect/schema/TreeFormatter"
import * as E from "@effect/data/Either"
import { ApiFootballClientLive, currentSeason, fixtures } from "./api-football"
import { CalendarEvent, FootballMatch } from "./calendar-matches"
import { Deps as CalendarMatchesHandlerDeps } from "./calendar-matches-handler"
import { AuthenticatedGoogleCalendarLive, listEvents, insertEvent, updateEvent } from "./google-calendar"

export const CalendarMatchesHandlerDepsLive = Layer.succeed(CalendarMatchesHandlerDeps, {
    createCalendarEvent: ({ match }) =>
        F.pipe(
            insertEvent({
                summary: `${match.homeTeam}-${match.awayTeam} (${match.competition})`,
                // TODO: group encode+decode of description (+ tests)
                description: `FC-${match.teamId}@${match.id}`,
                start: {
                    dateTime: match.date.toISOString(),
                },
                end: {
                    dateTime: addHours(match.date, 2).toISOString(),
                },
            }),
            Effect.tap(() => Effect.logInfo(`Created event for match ${match.homeTeam}-${match.awayTeam}`)),
            Effect.provideLayer(AuthenticatedGoogleCalendarLive),
            Effect.orDie,
        ),
    updateCalendarEvent: ({ match, originalCalendarEvent }) =>
        F.pipe(
            updateEvent(originalCalendarEvent.id, {
                ...originalCalendarEvent,
                start: {
                    dateTime: match.date.toISOString(),
                },
                end: {
                    dateTime: addHours(match.date, 2).toISOString(),
                },
            }),
            Effect.tap(() => Effect.logInfo(`Updated event for match ${match.homeTeam}-${match.awayTeam}`)),
            Effect.provideLayer(AuthenticatedGoogleCalendarLive),
            Effect.orDie,
        ),
    loadMatchesByTeam: (teamId) =>
        F.pipe(
            currentSeason(teamId),
            Effect.flatMap((currentSeason) => fixtures(teamId, currentSeason, "TBD-NS")),
            Effect.map(
                ROA.map(
                    (x): FootballMatch => ({
                        id: x.fixture.id,
                        teamId,
                        date: x.fixture.date,
                        homeTeam: x.teams.home.name,
                        awayTeam: x.teams.away.name,
                        competition: x.league.name,
                    }),
                ),
            ),
            Effect.provideLayer(ApiFootballClientLive),
            Effect.orDie,
        ),
    loadCalendarEventsByTeam: (teamId) =>
        F.pipe(
            listEvents(`FC-${teamId}`),
            Effect.flatMap(
                Effect.forEach((originalEvent) =>
                    F.pipe(
                        Effect.Do,
                        Effect.bind("validated", () => decode(CalendarListEvent, originalEvent)),
                        Effect.bind("matchId", ({ validated }) => parseFootballMatchId(validated.description)),
                        Effect.map(
                            ({ validated, matchId }): CalendarEvent => ({
                                matchId,
                                startDate: validated.start.dateTime,
                                // TODO: check originalEvent and event type error
                                originalEvent: originalEvent as any,
                            }),
                        ),
                    ),
                ),
            ),
            Effect.provideLayer(AuthenticatedGoogleCalendarLive),
            Effect.orDie,
        ),
})

const NonEmptyString = S.string.pipe(S.nonEmpty())
type NonEmptyString = S.Schema.To<typeof NonEmptyString>
const CalendarListEvent = S.struct({
    description: NonEmptyString,
    start: S.struct({
        dateTime: S.Date,
    }),
})

const parseFootballMatchId = (input: NonEmptyString) => {
    const parts = input.split("@")
    return decode(S.NumberFromString, parts[1])
}

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

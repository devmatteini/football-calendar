import * as F from "@effect/data/Function"
import * as ROA from "@effect/data/ReadonlyArray"
import * as Effect from "@effect/io/Effect"
import * as Layer from "@effect/io/Layer"
import * as S from "@effect/schema/Schema"
import { formatErrors } from "@effect/schema/TreeFormatter"
import * as E from "@effect/data/Either"
import { ApiFootballClientLive, currentSeason, fixtures } from "./api-football"
import { CalendarEvent } from "./calendar-matches"
import { Deps as CalendarMatchesHandlerDeps } from "./calendar-matches-handler"
import { AuthenticatedGoogleCalendarLive, listEvents } from "./google-calendar"

export const CalendarMatchesHandlerDepsLive = Layer.succeed(CalendarMatchesHandlerDeps, {
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

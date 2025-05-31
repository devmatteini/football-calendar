import * as Effect from "effect/Effect"
import { loadFootballCalendarConfig } from "./football-calendars-config"
import * as F from "effect/Function"
import { footballMatchEventsHandler } from "./football-match-events-handler"
import * as Console from "effect/Console"
import * as Layer from "effect/Layer"
import { FileSystemCache } from "./file-system-cache"
import { GoogleCalendarLive } from "./google-calendar"
import { ApiFootballFootballMatchesRepositoryLive } from "./api-football-football-matches-repository"

const FootballMatchEventsLive = F.pipe(
    GoogleCalendarLive,
    Layer.merge(ApiFootballFootballMatchesRepositoryLive),
    Layer.provide(FileSystemCache),
)

export const syncCommandHandler = Effect.gen(function* () {
    const calendars = yield* loadFootballCalendarConfig

    yield* Effect.forEach(calendars, (calendar) =>
        F.pipe(
            footballMatchEventsHandler(calendar),
            Effect.flatMap((summary) =>
                Console.log(
                    `Football matches for ${calendar.name} synced: ${summary.created} created | ${summary.updated} updated | ${summary.nothingChanged} unchanged`,
                ),
            ),
        ),
    )
}).pipe(Effect.provide(FootballMatchEventsLive))

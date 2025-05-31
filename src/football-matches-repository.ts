import * as Effect from "effect/Effect"
import * as Context from "effect/Context"
import { FootballCalendar } from "./football-calendars-config"
import { FootballMatch } from "./football-match-events"

export type FootballMatchesRepositoryService = {
    loadByFootballCalendar: (calendar: FootballCalendar) => Effect.Effect<readonly FootballMatch[]>
}

export class FootballMatchesRepository extends Context.Tag("FootballMatchesRepository")<
    FootballMatchesRepository,
    FootballMatchesRepositoryService
>() {}

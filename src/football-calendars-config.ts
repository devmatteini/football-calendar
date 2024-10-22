import * as Effect from "effect/Effect"
import * as S from "effect/Schema"
import * as FileSystem from "@effect/platform/FileSystem"
import * as F from "effect/Function"
import * as Config from "effect/Config"
import * as os from "node:os"
import * as path from "node:path"
import { parseJsonFile } from "./common/file"

export const Team = S.TaggedStruct("Team", {
    teamId: S.Int,
    name: S.String,
})
export type Team = typeof Team.Type

export const LeagueRound = S.Literal("All", "KnockoutStage")
export type LeagueRound = typeof LeagueRound.Type

export const League = S.TaggedStruct("League", {
    leagueId: S.Int,
    name: S.String,
    season: S.Int.pipe(S.positive()),
    round: S.optionalWith(LeagueRound, { default: () => "All" }),
})
export type League = typeof League.Type

export const FootballCalendar = S.Union(Team, League)
export type FootballCalendar = typeof FootballCalendar.Type

export const FootballCalendars = S.NonEmptyArray(FootballCalendar)
export type FootballCalendars = typeof FootballCalendars.Type

export const loadFootballCalendarConfig = Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem)

    const configFile = yield* _(configFilePath)
    const configExists = yield* _(fs.exists(configFile))
    if (!configExists) return yield* _(Effect.fail(`Configuration file doesn't exists (${configFile})`))

    return yield* _(parseJsonFile(configFile, FootballCalendars))
}).pipe(Effect.orDie)

const configJson = ["football-calendar", "config.json"] as const

const configFilePath = F.pipe(
    Config.string("FOOTBALL_CALENDAR_CONFIG"),
    Config.orElse(() =>
        Config.map(Config.string("XDG_CONFIG_HOME"), (configDir) => path.join(configDir, ...configJson)),
    ),
    Config.withDefault(path.join(os.homedir(), ".config", ...configJson)),
)

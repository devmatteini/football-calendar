import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as FileSystem from "@effect/platform/FileSystem"
import * as F from "effect/Function"
import * as Config from "effect/Config"
import * as os from "node:os"
import * as path from "node:path"
import { parseJsonFile } from "./common/file"

export const Team = Schema.TaggedStruct("Team", {
    teamId: Schema.Int,
    name: Schema.String,
})
export type Team = typeof Team.Type

export const LeagueRound = Schema.Literal("All", "KnockoutStage")
export type LeagueRound = typeof LeagueRound.Type

export const League = Schema.TaggedStruct("League", {
    leagueId: Schema.Int,
    name: Schema.String,
    season: Schema.Int.pipe(Schema.positive()),
    round: Schema.optionalWith(LeagueRound, { default: () => "All" }),
})
export type League = typeof League.Type

export const FootballCalendar = Schema.Union(Team, League)
export type FootballCalendar = typeof FootballCalendar.Type

export const FootballCalendars = Schema.NonEmptyArray(FootballCalendar)
export type FootballCalendars = typeof FootballCalendars.Type

export const loadFootballCalendarConfig = Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    const configFile = yield* configFilePath
    const configExists = yield* fs.exists(configFile)
    if (!configExists) return yield* Effect.fail(`Configuration file doesn't exists (${configFile})`)

    return yield* parseJsonFile(configFile, FootballCalendars)
}).pipe(Effect.orDie)

const configJson = ["football-calendar", "config.json"] as const

const configFilePath = F.pipe(
    Config.string("FOOTBALL_CALENDAR_CONFIG"),
    Config.orElse(() =>
        Config.map(Config.string("XDG_CONFIG_HOME"), (configDir) => path.join(configDir, ...configJson)),
    ),
    Config.withDefault(path.join(os.homedir(), ".config", ...configJson)),
)

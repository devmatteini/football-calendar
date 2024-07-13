import * as Effect from "effect/Effect"
import * as S from "@effect/schema/Schema"
import * as FileSystem from "@effect/platform/FileSystem"
import * as O from "effect/Option"
import * as F from "effect/Function"
import * as os from "node:os"
import * as path from "node:path"
import { parseJsonFile } from "./common/file"

export const Team = S.TaggedStruct("Team", {
    teamId: S.Int,
    name: S.String,
})
export type Team = typeof Team.Type

export const League = S.TaggedStruct("League", {
    leagueId: S.Int,
    name: S.String,
    season: S.Int.pipe(S.positive()),
})
export type League = typeof League.Type

export const FootballCalendar = S.Union(Team, League)
export type FootballCalendar = typeof FootballCalendar.Type

export const FootballCalendars = S.NonEmptyArray(FootballCalendar)
export type FootballCalendars = typeof FootballCalendars.Type

export const loadFootballCalendarConfig = Effect.gen(function* (_) {
    const fs = yield* _(FileSystem.FileSystem)

    const configFile = configFilePath()
    const configExists = yield* _(fs.exists(configFile))
    if (!configExists) return yield* _(Effect.fail(`Configuration file doesn't exists (${configFile})`))

    return yield* _(parseJsonFile(configFile, FootballCalendars))
}).pipe(Effect.orDie)

const configFilePath = () =>
    F.pipe(
        O.fromNullable(process.env.FOOTBALL_CALENDAR_CONFIG),
        O.orElse(() =>
            O.fromNullable(process.env.XDG_CONFIG_HOME).pipe(O.map((configDir) => path.join(configDir, ...configJson))),
        ),
        O.getOrElse(() => path.join(os.homedir(), ".config", ...configJson)),
    )

const configJson = ["football-calendar", "config.json"] as const

import * as Effect from "effect/Effect"
import * as S from "@effect/schema/Schema"
import * as TreeFormatter from "@effect/schema/TreeFormatter"
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import * as FileSystem from "@effect/platform/FileSystem"
import * as O from "effect/Option"
import * as F from "effect/Function"
import * as os from "node:os"
import * as path from "node:path"

export const Team = S.TaggedStruct("Team", {
    id: S.Int,
    name: S.String,
})
export type Team = typeof Team.Type

export const FootballCalendar = S.Union(Team)
export type FootballCalendar = typeof FootballCalendar.Type

export const FootballCalendars = S.NonEmptyArray(Team)
export type FootballCalendars = typeof FootballCalendars.Type

export type FootballCalendarConfig = {
    calendars: FootballCalendars
}
export const FootballCalendarConfig = Context.GenericTag<FootballCalendarConfig>("FootballCalendarConfig")

export const FootballCalendarConfigLive = Layer.effect(
    FootballCalendarConfig,
    Effect.gen(function* (_) {
        const fs = yield* _(FileSystem.FileSystem)

        const configFile = path.join(configDir(), "football-calendar", "config.json")
        const configExists = yield* _(fs.exists(configFile))
        if (!configExists) return yield* _(Effect.fail(`Configuration file doesn't exists (${configFile})`))

        const content = yield* _(fs.readFileString(configFile))
        const json = yield* _(
            Effect.try({
                try: () => JSON.parse(content),
                catch: (e) => `Unable to parse configuration file: ${e}`,
            }),
        )
        const calendars = yield* _(
            S.decodeUnknown(FootballCalendars)(json, { errors: "all" }),
            Effect.mapError((e) => `Configuration file issues: ${TreeFormatter.formatErrorSync(e)}`),
        )

        return FootballCalendarConfig.of({ calendars: calendars })
    }).pipe(Effect.orDie),
)

const configDir = () =>
    F.pipe(
        O.fromNullable(process.env.XDG_CONFIG_HOME),
        O.getOrElse(() => path.join(os.homedir(), ".config")),
    )

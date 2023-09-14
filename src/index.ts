import * as F from "@effect/data/Function"
import * as Config from "@effect/io/Config"
import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import * as LogLevel from "@effect/io/LogLevel"
import * as S from "@effect/schema/Schema"
import * as E from "@effect/data/Either"
import { calendarMatchesHandler } from "./calendar-matches-handler"
import { CalendarMatchesHandlerDepsLive } from "./calendar-matches-handler-live"

const main = async () => {
    await F.pipe(
        // TODO: pass teamId as argument to cli
        Effect.config(Config.number("TEAM_ID")),
        Effect.flatMap((teamId) =>
            F.pipe(
                calendarMatchesHandler(teamId),
                Effect.tap((summary) =>
                    Effect.logInfo("Football matches import completed").pipe(Effect.annotateLogs(summary)),
                ),
                Effect.annotateLogs({ teamId }),
            ),
        ),
        Effect.provideLayer(CalendarMatchesHandlerDepsLive),
        Logger.withMinimumLogLevel(logLevel()),
        Effect.runPromise,
    )
}

const LogLevelSchema = S.union(S.literal("Debug"), S.literal("Info"), S.literal("Error"))
const logLevel = () =>
    F.pipe(
        S.parseEither(LogLevelSchema)(process.env.LOG_LEVEL),
        E.match({
            onLeft: () => LogLevel.Info,
            onRight: LogLevel.fromLiteral,
        }),
    )

main().catch((e) => {
    console.error(e)
    process.exit(1)
})

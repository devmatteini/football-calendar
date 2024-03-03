import * as F from "effect/Function"
import * as Effect from "effect/Effect"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as Layer from "effect/Layer"
import * as Exit from "effect/Exit"
import * as Cause from "effect/Cause"
import { footballMatchEventsHandler } from "./football-match-events-handler"
import { FootballMatchEventsHandlerDepsLive } from "./football-match-events-handler-live"
import { Command } from "commander"
import { parseInteger, logLevel } from "./common/cli"
import { red } from "colorette"
import { structuredLog, structuredLogger } from "./infrastructure/structured-logger"
import { ApiFootballClientLive } from "./api-football"
import { GoogleCalendarClientLive } from "./google-calendar"
import * as EffectExt from "./common/effect-ext"

const cli = new Command("football-calendar")
    .description("Automatically sync your google calendar with football matches of your favorite team!")
    .showHelpAfterError()
    .configureOutput({
        outputError: (str, write) => write(red(str)),
    })

type Options = { teamId: number }

cli.requiredOption(
    "-t, --teamId <teamId>",
    "Football team id (from https://dashboard.api-football.com/soccer/ids/teams)",
    parseInteger,
).action(async ({ teamId }: Options) => {
    const result = await F.pipe(
        footballMatchEvents(teamId),
        Effect.provide(FootballMatchEventsLive),
        Effect.runPromiseExit,
    )

    if (Exit.isFailure(result)) {
        structuredLog({
            logLevel: LogLevel.Error,
            message: "Unexpected application error",
            cause: Cause.pretty(result.cause),
            annotations: { teamId },
        })
        return Promise.reject()
    }
})

const main = () => cli.parseAsync(process.argv)

const FootballMatchEventsLive = F.pipe(
    FootballMatchEventsHandlerDepsLive,
    Layer.provide(ApiFootballClientLive),
    Layer.provide(GoogleCalendarClientLive),
    Layer.provideMerge(Logger.replace(Logger.defaultLogger, structuredLogger)),
)

const footballMatchEvents = (teamId: number) =>
    F.pipe(
        footballMatchEventsHandler(teamId),
        Effect.tap((summary) => EffectExt.logInfo("Football matches import completed", summary)),
        Effect.annotateLogs({ teamId }),
        Effect.asUnit,
        Logger.withMinimumLogLevel(logLevel()),
    )

main().catch(() => {
    process.exit(1)
})

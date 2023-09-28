import * as F from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import * as LogLevel from "@effect/io/LogLevel"
import * as Layer from "@effect/io/Layer"
import * as Exit from "@effect/io/Exit"
import * as Cause from "@effect/io/Cause"
import { footballMatchEventsHandler } from "./football-match-events-handler"
import { FootballMatchEventsHandlerDepsLive } from "./football-match-events-handler-live"
import { Command } from "commander"
import { parseInteger, logLevel } from "./cli"
import { red } from "colorette"
import { structuredLog, structuredLogger } from "./structured-logger"
import { ApiFootballClientLive } from "./api-football"
import { AuthenticatedGoogleCalendarLive } from "./google-calendar"

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
        footballMatchEventsHandler(teamId),
        Effect.tap((summary) => Effect.logInfo("Football matches import completed").pipe(Effect.annotateLogs(summary))),
        Effect.annotateLogs({ teamId }),
        Effect.asUnit,
        Effect.provide(
            F.pipe(
                Layer.merge(ApiFootballClientLive, AuthenticatedGoogleCalendarLive),
                Layer.provideMerge(FootballMatchEventsHandlerDepsLive),
                Layer.provideMerge(Logger.replace(Logger.defaultLogger, structuredLogger)),
            ),
        ),
        Logger.withMinimumLogLevel(logLevel()),
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

main().catch(() => {
    process.exit(1)
})

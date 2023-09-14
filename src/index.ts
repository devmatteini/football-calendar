import * as F from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as Logger from "@effect/io/Logger"
import { calendarMatchesHandler } from "./calendar-matches-handler"
import { CalendarMatchesHandlerDepsLive } from "./calendar-matches-handler-live"
import { Command } from "commander"
import { parseInteger, logLevel } from "./cli"
import { red } from "colorette"

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
).action(({ teamId }: Options) =>
    F.pipe(
        calendarMatchesHandler(teamId),
        Effect.tap((summary) => Effect.logInfo("Football matches import completed").pipe(Effect.annotateLogs(summary))),
        Effect.annotateLogs({ teamId }),
        Effect.asUnit,
        Effect.provideLayer(CalendarMatchesHandlerDepsLive),
        Logger.withMinimumLogLevel(logLevel()),
        Effect.runPromise,
    ),
)

const main = () => cli.parseAsync(process.argv)

main().catch((e) => {
    console.error(e)
    process.exit(1)
})

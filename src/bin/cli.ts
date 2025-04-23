#!/usr/bin/env node

import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Layer from "effect/Layer"
import * as Console from "effect/Console"
import * as Schema from "effect/Schema"
import * as Command from "@effect/cli/Command"
import * as Span from "@effect/cli/HelpDoc/Span"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import { footballMatchEventsHandler } from "../football-match-events-handler"
import { FootballMatchEventsHandlerDepsLive } from "../infrastructure/football-match-events-handler-live"
import { ApiFootballClientLive } from "../api-football"
import { GoogleCalendarClientLive } from "../google-calendar"
import { LoggerLive, logUnexpectedError } from "../infrastructure/logger"
import {
    exampleFootballCalendars,
    FootballCalendars,
    FootballCalendarsJsonSchema,
    loadFootballCalendarConfig,
} from "../football-calendars-config"
import { FileSystemCache } from "../infrastructure/file-system-cache"
import { serveHandler } from "../serve-handler"

const rootCommand = Command.make("football-calendar")

const sync = Command.make("sync", {}, () =>
    Effect.gen(function* () {
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
    }).pipe(Effect.provide(FootballMatchEventsLive)),
)

const configExample = Command.make("example", {}, () =>
    Effect.gen(function* () {
        const encoded = yield* Schema.encode(FootballCalendars)(exampleFootballCalendars)
        yield* Console.log(JSON.stringify(encoded, null, 2))
    }),
).pipe(Command.withDescription("Print example configuration file"))

const configSchema = Command.make("schema", {}, () =>
    // keep new line
    Console.log(JSON.stringify(FootballCalendarsJsonSchema, null, 2)),
).pipe(Command.withDescription("Print configuration file JSON schema"))

const config = Command.make("config", {}, () => Console.log("Use subcommands or run with --help")).pipe(
    Command.withDescription("Configuration file"),
    Command.withSubcommands([configExample, configSchema]),
)

const serve = Command.make("serve", {}, () => serveHandler).pipe(Command.withDescription("Start an HTTP server"))

const command = rootCommand.pipe(Command.withSubcommands([sync, config, serve]))

const cli = Command.run(command, {
    name: "football-calendar",
    summary: Span.text("Automatically sync your google calendar with football matches of your favorite team!"),
    version: "v1.0.0",
})

const FootballMatchEventsLive = F.pipe(
    FootballMatchEventsHandlerDepsLive,
    Layer.provide(ApiFootballClientLive),
    Layer.provide(GoogleCalendarClientLive),
    Layer.provide(FileSystemCache),
)

const MainLive = F.pipe(
    // keep new line
    NodeContext.layer,
    Layer.provideMerge(LoggerLive),
    Layer.provideMerge(FetchHttpClient.layer),
)

F.pipe(
    Effect.suspend(() => cli(process.argv)),
    Effect.provide(MainLive),
    Effect.tapErrorCause(logUnexpectedError),
    (x) => NodeRuntime.runMain(x, { disableErrorReporting: true, disablePrettyLogger: true }),
)

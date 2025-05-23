#!/usr/bin/env node

import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Layer from "effect/Layer"
import * as Console from "effect/Console"
import * as Command from "@effect/cli/Command"
import * as Span from "@effect/cli/HelpDoc/Span"
import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import { LoggerLive, logUnexpectedError } from "../logger"
import { serveCommandHandler } from "../serve-command-handler"
import { syncCommandHandler } from "../sync-command-handler"
import { configExampleCommandHandler } from "../config-example-command-handler"
import { configSchemaCommandHandler } from "../config-schema-command-handler"

const rootCommand = Command.make("football-calendar")

const sync = Command.make("sync", {}, () => syncCommandHandler).pipe(
    Command.withDescription("Sync football matches with your calendar"),
)

const configExample = Command.make("example", {}, () => configExampleCommandHandler).pipe(
    Command.withDescription("Print example configuration file"),
)

const configSchema = Command.make("schema", {}, () => configSchemaCommandHandler).pipe(
    Command.withDescription("Print configuration file JSON schema"),
)

const config = Command.make("config", {}, () => Console.log("Use subcommands or run with --help")).pipe(
    Command.withDescription("Configuration file"),
    Command.withSubcommands([configExample, configSchema]),
)

const serve = Command.make("serve", {}, () => serveCommandHandler).pipe(Command.withDescription("Start an HTTP server"))

const command = rootCommand.pipe(Command.withSubcommands([sync, config, serve]))

const cli = Command.run(command, {
    name: "football-calendar",
    summary: Span.text("Automatically sync your google calendar with football matches of your favorite team!"),
    version: "v1.0.0",
})

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

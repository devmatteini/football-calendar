import * as Effect from "effect/Effect"
import * as Console from "effect/Console"
import { Command, Options, Span } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"

const rootCommand = Command.make("football-calendar")

const team = Options.integer("team").pipe(Options.withAlias("t"))
const sync = Command.make("sync", { team }, ({ team }) => {
    return Console.log(`Running 'football-calendar sync -t ${team}' `)
})

const command = rootCommand.pipe(Command.withSubcommands([sync]))

const cli = Command.run(command, {
    name: "football-calendar",
    summary: Span.text("Automatically sync your google calendar with football matches of your favorite team!"),
    version: "v1.0.0",
})

Effect.suspend(() => cli(process.argv)).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)

#!/usr/bin/env node

import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Layer from "effect/Layer"
import { Command, Span } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { footballMatchEventsHandler } from "../football-match-events-handler"
import * as EffectExt from "../common/effect-ext"
import { FootballMatchEventsHandlerDepsLive } from "../infrastructure/football-match-events-handler-live"
import { ApiFootballClientLive } from "../api-football"
import { GoogleCalendarClientLive } from "../google-calendar"
import { LoggerLive, logUnexpectedError } from "../infrastructure/logger"
import { FootballCalendarConfig, FootballCalendarConfigLive } from "../config-file"

const rootCommand = Command.make("football-calendar")

const sync = Command.make("sync", {}, () =>
    Effect.gen(function* (_) {
        const { calendars } = yield* _(FootballCalendarConfig)

        yield* _(
            Effect.forEach(calendars, (calendar) =>
                F.pipe(
                    footballMatchEventsHandler(calendar),
                    Effect.flatMap((summary) => EffectExt.logDebug("Football matches import completed", summary)),
                    Effect.annotateLogs({ teamId: calendar.teamId }),
                ),
            ),
        )
    }).pipe(Effect.provide(FootballMatchEventsLive)),
)

const command = rootCommand.pipe(Command.withSubcommands([sync]))

const cli = Command.run(command, {
    name: "football-calendar",
    summary: Span.text("Automatically sync your google calendar with football matches of your favorite team!"),
    version: "v1.0.0",
})

const FootballMatchEventsLive = F.pipe(
    FootballMatchEventsHandlerDepsLive,
    Layer.provide(ApiFootballClientLive),
    Layer.provide(GoogleCalendarClientLive),
    Layer.provideMerge(FootballCalendarConfigLive),
)

const MainLive = F.pipe(
    // keep new line
    NodeContext.layer,
    Layer.provideMerge(LoggerLive),
)

F.pipe(
    Effect.suspend(() => cli(process.argv)),
    Effect.provide(MainLive),
    Effect.tapErrorCause(logUnexpectedError),
    (x) => NodeRuntime.runMain(x, { disableErrorReporting: true }),
)

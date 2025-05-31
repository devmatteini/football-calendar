import * as Effect from "effect/Effect"
import * as Config from "effect/Config"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as LogLevel from "effect/LogLevel"
import * as Cause from "effect/Cause"

const LOG_LEVEL = Config.logLevel("LOG_LEVEL").pipe(Config.withDefault(LogLevel.Info))

const LogLevelLive = LOG_LEVEL.pipe(
    Effect.map((level) => Logger.minimumLogLevel(level)),
    Layer.unwrapEffect,
)
export const LoggerLive = Layer.merge(Logger.json, LogLevelLive)

export const logUnexpectedError = (cause: Cause.Cause<unknown>) =>
    Effect.sync(() =>
        console.error(`Unexpected application error:\n${Cause.pretty(cause, { renderErrorCause: true })}`),
    )

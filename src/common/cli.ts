import { InvalidArgumentError } from "commander"
import * as F from "effect/Function"
import * as LogLevel from "effect/LogLevel"
import * as S from "@effect/schema/Schema"
import * as E from "effect/Either"

export const parseInteger = (value: string, _previous: number) => {
    const parsedValue = parseInt(value, 10)
    if (Number.isNaN(parsedValue)) throw new InvalidArgumentError("Not a integer")
    return parsedValue
}

const LogLevelSchema = S.union(S.literal("Debug"), S.literal("Info"), S.literal("Error"))
export const logLevel = () =>
    F.pipe(
        S.decodeUnknownEither(LogLevelSchema)(process.env.LOG_LEVEL),
        E.match({
            onLeft: () => LogLevel.Info,
            onRight: LogLevel.fromLiteral,
        }),
    )

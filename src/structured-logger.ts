import * as FiberId from "@effect/io/FiberId"
import * as Logger from "@effect/io/Logger"
import * as LogLevel from "@effect/io/LogLevel"
import * as Cause from "@effect/io/Cause"
import * as List from "@effect/data/List"
import * as F from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"
import * as LogSpan from "@effect/io/LogSpan"

const logByLevel: Record<LogLevel.Literal, (_: unknown) => void> = {
    All: console.log,
    Debug: console.debug,
    Info: console.info,
    Error: console.error,
    Fatal: console.error,
    Trace: console.trace,
    Warning: console.warn,
    None: () => {},
}

/* 
NOTE: this implementation is a mix of:
    - logMeta.ts example (https://github.com/Effect-TS/io/blob/4c1cdc347acabe85f50358f52a2ac79d6e5c3a4a/examples/logMeta.ts)
    - @effect/io/Logger stringLogger (https://github.com/Effect-TS/io/blob/4c1cdc347acabe85f50358f52a2ac79d6e5c3a4a/src/internal/logger.ts#L161-L216)
*/
export const structuredLogger = Logger.make<unknown, void>(
    ({ message, annotations, cause, date, fiberId, logLevel, spans }) => {
        const nowMillis = date.getTime()

        logByLevel[logLevel._tag](
            JSON.stringify({
                message,
                timestamp: date.toISOString(),
                level: logLevel.label,
                fiberId: FiberId.threadName(fiberId),
                ...formatCause(cause),
                ...formatSpans(spans, nowMillis),
                ...formatAnnotations(annotations),
            }),
        )
    },
)

const formatCause = (cause: Cause.Cause<unknown>) =>
    cause != null && cause != Cause.empty ? { cause: Cause.pretty(cause) } : {}

const formatSpans = (spans: List.List<LogSpan.LogSpan>, nowMillis: number) =>
    List.isNil(spans) ? {} : { spans: F.pipe(spans, List.map(LogSpan.render(nowMillis)), List.toReadonlyArray) }

const formatAnnotations = (annotations: HashMap.HashMap<string, Logger.AnnotationValue>) => {
    const ret: Record<string, Logger.AnnotationValue> = {}
    for (const [key, value] of annotations) ret[filterKeyName(key)] = value
    return ret
}
const filterKeyName = (key: string) => key.replace(/[\s="]/g, "_")

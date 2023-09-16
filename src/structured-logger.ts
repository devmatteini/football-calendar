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

        structuredLog({
            message,
            timestamp: date.toISOString(),
            logLevel,
            fiberId: FiberId.threadName(fiberId),
            cause: formatCause(cause),
            spans: formatSpans(spans, nowMillis),
            annotations: formatAnnotations(annotations),
        })
    },
)

type StructuredLog = {
    message: unknown
    logLevel: LogLevel.LogLevel
    fiberId?: string
    timestamp?: string
    cause?: string
    spans?: readonly string[]
    annotations?: Record<string, Logger.AnnotationValue>
}
export const structuredLog = ({ message, logLevel, fiberId, timestamp, cause, spans, annotations }: StructuredLog) => {
    logByLevel[logLevel._tag](
        JSON.stringify({
            message,
            timestamp: timestamp || new Date().toISOString(),
            level: logLevel.label,
            fiberId,
            cause,
            spans,
            ...(annotations || {}),
        }),
    )
}

const formatCause = (cause: Cause.Cause<unknown>) =>
    cause != null && cause != Cause.empty ? Cause.pretty(cause) : undefined

const formatSpans = (spans: List.List<LogSpan.LogSpan>, nowMillis: number) =>
    List.isNil(spans) ? undefined : F.pipe(spans, List.map(LogSpan.render(nowMillis)), List.toReadonlyArray)

const formatAnnotations = (annotations: HashMap.HashMap<string, Logger.AnnotationValue>) => {
    const ret: Record<string, Logger.AnnotationValue> = {}
    for (const [key, value] of annotations) ret[filterKeyName(key)] = value
    return ret
}
const filterKeyName = (key: string) => key.replace(/[\s="]/g, "_")

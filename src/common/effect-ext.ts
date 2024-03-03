import * as Effect from "effect/Effect"
import * as F from "effect/Function"

export const logDebug = (message: string, annotations: Record<string, unknown>) =>
    F.pipe(Effect.logDebug(message), Effect.annotateLogs(annotations))

export const logInfo = (message: string, annotations: Record<string, unknown>) =>
    F.pipe(Effect.logInfo(message), Effect.annotateLogs(annotations))

import * as Data from "effect/Data"

export class GenericError extends Data.TaggedError("GenericError")<{
    message: string
    cause?: unknown
}> {}

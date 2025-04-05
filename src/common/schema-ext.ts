import * as F from "effect/Function"
import * as Schema from "effect/Schema"
import * as Effect from "effect/Effect"
import * as ParseResult from "effect/ParseResult"

export const decode = <A, I>(schema: Schema.Schema<A, I>, input: unknown) =>
    F.pipe(
        Schema.decodeUnknown(schema)(input, { onExcessProperty: "ignore", errors: "all" }),
        Effect.mapError((e) => new Error(`Schema decode error: ${ParseResult.TreeFormatter.formatErrorSync(e)}`)),
    )

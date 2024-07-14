import * as F from "effect/Function"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as TreeFormatter from "@effect/schema/TreeFormatter"

export const decode = <A, I>(schema: Schema.Schema<A, I>, input: unknown) =>
    F.pipe(
        Schema.decodeUnknown(schema)(input, { onExcessProperty: "ignore", errors: "all" }),
        Effect.mapError((e) => new Error(`Schema decode error: ${TreeFormatter.formatErrorSync(e)}`)),
    )

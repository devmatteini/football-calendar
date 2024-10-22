import * as Effect from "effect/Effect"
import * as Context from "effect/Context"
import * as O from "effect/Option"
import * as Schema from "effect/Schema"

export type Cache = {
    load: <A, I>(key: string, schema: Schema.Schema<A, I>) => Effect.Effect<O.Option<A>>
    update: <A, I>(key: string, schema: Schema.Schema<A, I>, value: A) => Effect.Effect<void>
}
export const Cache = Context.GenericTag<Cache>("Cache")

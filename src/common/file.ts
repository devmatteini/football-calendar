import * as Effect from "effect/Effect"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Schema from "@effect/schema/Schema"
import * as SchemaExt from "./schema-ext"

export const parseJsonFile = <A, I>(filePath: string, schema: Schema.Schema<A, I>) =>
    Effect.gen(function* (_) {
        const fs = yield* _(FileSystem.FileSystem)

        const content = yield* _(fs.readFileString(filePath))
        const json = yield* _(
            Effect.try({
                try: () => JSON.parse(content),
                catch: (e) => new Error(`Unable to parse json ${filePath}: ${e}`),
            }),
        )

        return yield* _(SchemaExt.decode(schema, json))
    })

import * as Effect from "effect/Effect"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Schema from "effect/Schema"
import * as SchemaExt from "./schema-ext"

export const parseJsonFile = <A, I>(filePath: string, schema: Schema.Schema<A, I>) =>
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        const content = yield* fs.readFileString(filePath)
        const json = yield* Effect.try({
            try: () => JSON.parse(content),
            catch: (e) => new Error(`Unable to parse json ${filePath}: ${e}`),
        })

        return yield* SchemaExt.decode(schema, json)
    })

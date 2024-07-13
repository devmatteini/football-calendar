import * as Effect from "effect/Effect"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Schema from "@effect/schema/Schema"
import * as TreeFormatter from "@effect/schema/TreeFormatter"

export const parseJsonFile = <A, I>(filePath: string, schema: Schema.Schema<A, I>) =>
    Effect.gen(function* (_) {
        const fs = yield* _(FileSystem.FileSystem)

        const content = yield* _(fs.readFileString(filePath))
        const json = yield* _(
            Effect.try({
                try: () => JSON.parse(content),
                catch: (e) => `Unable to parse json ${filePath}: ${e}`,
            }),
        )

        return yield* _(
            Schema.decodeUnknown(schema)(json, { errors: "all" }),
            Effect.mapError((e) => `Decode error ${filePath}: ${TreeFormatter.formatErrorSync(e)}`),
        )
    })

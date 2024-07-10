import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as O from "effect/Option"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { beforeAll, expect, test, vitest } from "vitest"
import { Cache } from "../cache"
import { FileSystemCache } from "./file-system-cache"

const tempDir = os.tmpdir()
const cacheDir = path.join(tempDir, "football-calendar", "file-system-cache-tests")

vitest.stubEnv("FOOTBALL_CALENDAR_CACHE", cacheDir)

beforeAll(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true })
    fs.mkdirSync(cacheDir, { recursive: true })
})

test("load - key not exists", async () => {
    const program = Effect.gen(function* (_) {
        const cache = yield* _(Cache)
        const key = "key-not-exists"
        return yield* _(cache.load(key, TestSchema))
    })

    const cachedValue = await run(program)

    expect(cachedValue).toEqual(O.none())
})

test("update and load", async () => {
    const program = Effect.gen(function* (_) {
        const cache = yield* _(Cache)
        const key = "update-and-load-key"

        yield* _(cache.update(key, TestSchema, anyTestSchema))
        return yield* _(cache.load(key, TestSchema))
    })

    const cachedValue = await run(program)

    expect(cachedValue).toEqual(O.some(anyTestSchema))
})

test.todo("load expired key")

const FileSystemCacheLayer = Layer.provide(FileSystemCache, NodeFileSystem.layer)

const run = <A, E>(effect: Effect.Effect<A, E, Cache>) =>
    effect.pipe(Effect.provide(FileSystemCacheLayer), Effect.runPromise)

const TestSchema = Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
})
const anyTestSchema = TestSchema.make({ id: 999, name: "ANY_NAME" })

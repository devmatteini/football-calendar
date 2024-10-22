import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as Schema from "effect/Schema"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as O from "effect/Option"
import * as Duration from "effect/Duration"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { beforeAll, expect, test, vitest } from "vitest"
import { Cache } from "../cache"
import { FileSystemCache, isExpired } from "./file-system-cache"

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

test("load expired key", async () => {
    const program = Effect.gen(function* (_) {
        const cache = yield* _(Cache)
        const key = "load-expired-key"

        const cacheFile = path.join(cacheDir, key)
        yield* _(createFileModifiedAt(cacheFile, yesterday()))

        return yield* _(cache.load(key, TestSchema))
    })

    const cachedValue = await run(program)

    expect(cachedValue).toEqual(O.none())
})

test("isExpired - not expired", () => {
    const now = new Date("2024-07-10T15:00:00.000Z")
    const _30minAgo = new Date("2024-07-10T14:30:00.000Z")
    const _1HourTTL = Duration.hours(1)

    const result = isExpired(now, _30minAgo, _1HourTTL)

    expect(result).toBeFalsy()
})

test("isExpired - not expired, just before ttl", () => {
    const now = new Date("2024-07-10T15:00:00.000Z")
    const _1msBeforeExpires = new Date("2024-07-10T14:00:00.001Z")
    const _1HourTTL = Duration.hours(1)

    const result = isExpired(now, _1msBeforeExpires, _1HourTTL)

    expect(result).toBeFalsy()
})

test("isExpired - expired", () => {
    const now = new Date("2024-07-10T15:00:00Z")
    const _5HorusAgo = new Date("2024-07-10T10:00:00Z")
    const _1HourTTL = Duration.hours(1)

    const result = isExpired(now, _5HorusAgo, _1HourTTL)

    expect(result).toBeTruthy()
})

test("isExpired - expired, exactly ttl time", () => {
    const now = new Date("2024-07-10T15:00:00.000Z")
    const _1HourAgo = new Date("2024-07-10T14:00:00.000Z")
    const _1HourTTL = Duration.hours(1)

    const result = isExpired(now, _1HourAgo, _1HourTTL)

    expect(result).toBeTruthy()
})

const yesterday = () => {
    const now = new Date()
    now.setDate(now.getDate() - 1)
    return now
}

const createFileModifiedAt = (filePath: string, date: Date) =>
    Effect.sync(() => {
        const anyContent = JSON.stringify({})
        fs.writeFileSync(filePath, anyContent)
        fs.utimesSync(filePath, date, date)
    })

const FileSystemCacheLayer = Layer.provide(FileSystemCache, NodeFileSystem.layer)

const run = <A, E>(effect: Effect.Effect<A, E, Cache>) =>
    effect.pipe(Effect.provide(FileSystemCacheLayer), Effect.runPromise)

const TestSchema = Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
})
const anyTestSchema = TestSchema.make({ id: 999, name: "ANY_NAME" })

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as O from "effect/Option"
import * as F from "effect/Function"
import * as FileSystem from "@effect/platform/FileSystem"
import * as PlatformError from "@effect/platform/Error"
import * as Schema from "effect/Schema"
import * as Duration from "effect/Duration"
import * as path from "node:path"
import * as os from "node:os"
import { Cache } from "./cache"
import * as EffectExt from "./common/effect-ext"
import { parseJsonFile } from "./common/file"
import * as Config from "effect/Config"

const TTL = Duration.days(1)

export const FileSystemCache = Layer.effect(
    Cache,
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const context = yield* Effect.context<FileSystem.FileSystem>()

        const cacheDir = yield* cacheDirPath

        yield* fs.makeDirectory(cacheDir, { recursive: true })

        return Cache.of({
            load: (key, schema) =>
                Effect.gen(function* () {
                    const cacheFile = path.join(cacheDir, key)

                    const exists = yield* fs.exists(cacheFile)
                    if (!exists) return O.none()

                    const now = new Date()
                    const lastUpdated = yield* modifiedOrExpiredTime(cacheFile, now, TTL)
                    if (isExpired(now, lastUpdated, TTL)) {
                        yield* EffectExt.logDebug(`Cache file is expired`, { key })
                        return O.none()
                    }

                    const cachedValue = yield* parseJsonFile(cacheFile, schema)
                    return O.some(cachedValue)
                }).pipe(invalidateCacheOnError, Effect.provide(context)),
            update: (key, schema, value) =>
                Effect.gen(function* () {
                    const cacheFile = path.join(cacheDir, key)

                    const encoded = yield* Schema.encode(schema)(value)
                    yield* fs.writeFileString(cacheFile, JSON.stringify(encoded))
                }).pipe(Effect.orDie),
        })
    }),
)

const invalidateCacheOnError = Effect.catchAll((error: Error | PlatformError.PlatformError) =>
    F.pipe(
        EffectExt.logDebug("Cache invalidated because an error occurred", { error }),
        Effect.zipRight(Effect.succeedNone),
    ),
)

const modifiedOrExpiredTime = (cacheFile: string, now: Date, ttl: Duration.Duration) =>
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const stats = yield* fs.stat(cacheFile)
        return O.getOrElse(stats.mtime, () => new Date(now.getTime() - Duration.toMillis(ttl)))
    })

export const isExpired = (now: Date, lastUpdated: Date, ttl: Duration.Duration) => {
    const timePassed = Duration.millis(now.getTime() - lastUpdated.getTime())
    return Duration.greaterThanOrEqualTo(timePassed, ttl)
}

const appDir = "football-calendar" as const

export const cacheDirPath = F.pipe(
    Config.string("FOOTBALL_CALENDAR_CACHE"),
    Config.orElse(() => Config.map(Config.string("XDG_CACHE_HOME"), (cacheDir) => path.join(cacheDir, appDir))),
    Config.withDefault(path.join(os.homedir(), ".cache", appDir)),
)

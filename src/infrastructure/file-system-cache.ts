import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as O from "effect/Option"
import * as F from "effect/Function"
import * as FileSystem from "@effect/platform/FileSystem"
import * as PlatformError from "@effect/platform/Error"
import * as Schema from "@effect/schema/Schema"
import * as Duration from "effect/Duration"
import * as path from "node:path"
import * as os from "node:os"
import { Cache } from "../cache"
import * as EffectExt from "../common/effect-ext"
import { parseJsonFile } from "../common/file"

const TTL = Duration.days(1)

export const FileSystemCache = Layer.effect(
    Cache,
    Effect.gen(function* (_) {
        const fs = yield* _(FileSystem.FileSystem)
        const cacheDir = cacheDirPath()

        yield* _(fs.makeDirectory(cacheDir, { recursive: true }))

        return Cache.of({
            load: (key, schema) =>
                Effect.gen(function* (_) {
                    const cacheFile = path.join(cacheDir, key)

                    const exists = yield* _(fs.exists(cacheFile))
                    if (!exists) return O.none()

                    const stats = yield* _(fs.stat(cacheFile))
                    const now = new Date()
                    const lastUpdated = modifiedOrExpiredTime(stats, now, TTL)
                    if (isExpired(now, lastUpdated, TTL)) {
                        yield* _(Effect.logDebug(`Cache file ${key} is expired`))
                        return O.none()
                    }

                    const cachedValue = yield* _(parseJsonFile(fs, cacheFile, schema))
                    return O.some(cachedValue)
                }).pipe(invalidateCacheOnError),
            update: (key, schema, value) =>
                Effect.gen(function* (_) {
                    const cacheFile = path.join(cacheDir, key)

                    const encoded = yield* _(Schema.encode(schema)(value))
                    yield* _(fs.writeFileString(cacheFile, JSON.stringify(encoded)))
                }).pipe(Effect.orDie),
        })
    }),
)

const invalidateCacheOnError = Effect.catchAll((error: string | PlatformError.PlatformError) =>
    F.pipe(
        EffectExt.logDebug("Cache invalidated because an error occurred", { error }),
        Effect.zipRight(Effect.succeedNone),
    ),
)

const modifiedOrExpiredTime = (stats: FileSystem.File.Info, now: Date, ttl: Duration.Duration) =>
    O.getOrElse(stats.mtime, () => new Date(now.getTime() - Duration.toMillis(ttl)))

export const isExpired = (now: Date, lastUpdated: Date, ttl: Duration.Duration) => {
    const timePassed = Duration.millis(now.getTime() - lastUpdated.getTime())
    return Duration.greaterThanOrEqualTo(timePassed, ttl)
}

const cacheDirPath = () =>
    F.pipe(
        O.fromNullable(process.env.FOOTBALL_CALENDAR_CACHE),
        O.orElse(() =>
            O.fromNullable(process.env.XDG_CACHE_HOME).pipe(O.map((configDir) => path.join(configDir, appDir))),
        ),
        O.getOrElse(() => path.join(os.homedir(), ".cache", appDir)),
    )

const appDir = "football-calendar" as const

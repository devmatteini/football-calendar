import * as Effect from "@effect/io/Effect"

const main = async () => {
    await Effect.runPromise(Effect.logInfo("football-calendar"))
}

main().catch(() => process.exit(1))

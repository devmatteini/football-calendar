import * as Effect from "effect/Effect"
import * as Cron from "effect/Cron"
import * as Schedule from "effect/Schedule"

type BackgroundJob<A, E, R> = {
    job: Effect.Effect<A, E, R>
    cron: Cron.Cron
}

export const registerBackgroundJob = <A, E, R>({ job, cron }: BackgroundJob<A, E, R>) =>
    Effect.forkDaemon(Effect.repeat(job, Schedule.cron(cron)))

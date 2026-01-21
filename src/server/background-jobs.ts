import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Cron from "effect/Cron"
import * as Schedule from "effect/Schedule"
import * as Duration from "effect/Duration"

type BackgroundJob<A, E, R> = {
    job: Effect.Effect<A, E, R>
    cron: Cron.Cron
}

const retrySchedule = F.pipe(
    // keep new line
    Schedule.exponential(Duration.seconds(2)),
    Schedule.compose(Schedule.recurs(3)),
)

export const registerBackgroundJob = <A, E, R>({ job, cron }: BackgroundJob<A, E, R>) =>
    Effect.forkDaemon(
        Effect.repeat(
            F.pipe(
                job,
                Effect.retry(retrySchedule),
                Effect.catchAllCause((cause) => Effect.logError("Background job failed after retries", cause)),
            ),
            Schedule.cron(cron),
        ),
    )

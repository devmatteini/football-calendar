import * as F from "@effect/data/Function"
import * as Config from "@effect/io/Config"
import * as Effect from "@effect/io/Effect"
import { calendarMatchesHandler } from "./calendar-matches-handler"
import { CalendarMatchesHandlerDepsLive } from "./calendar-matches-handler-live"

const main = async () => {
    await F.pipe(
        // TODO: pass teamId as argument to cli
        Effect.config(Config.number("TEAM_ID")),
        Effect.flatMap(calendarMatchesHandler),
        Effect.tap((summary) =>
            F.pipe(Effect.logInfo("Football matches import completed"), Effect.annotateLogs(summary)),
        ),
        Effect.provideLayer(CalendarMatchesHandlerDepsLive),
        Effect.runPromise,
    )
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})

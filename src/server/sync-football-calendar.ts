import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Cron from "effect/Cron"
import { loadFootballCalendarConfig } from "../football-calendars-config"
import { footballMatchEventsHandler } from "../football-match-events-handler"

// https://crontab.guru/#0_10_*_*_1
const everyMondayWednesdayAt10AM = Cron.unsafeParse("0 10 * * 1,3")

const syncFootballCalendarHandler = Effect.gen(function* () {
    const calendars = yield* loadFootballCalendarConfig

    yield* Effect.forEach(
        calendars,
        (calendar) =>
            F.pipe(
                footballMatchEventsHandler(calendar),
                Effect.flatMap((summary) =>
                    F.pipe(Effect.logInfo("Football matches synced"), Effect.annotateLogs(summary)),
                ),
                Effect.annotateLogs({ calendar: calendar.name }),
            ),
        { discard: true },
    )
})

export const syncFootballCalendar = {
    job: syncFootballCalendarHandler,
    cron: everyMondayWednesdayAt10AM,
}

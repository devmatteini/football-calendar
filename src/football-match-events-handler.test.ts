import { expect, test } from "vitest"
import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Layer from "effect/Layer"
import { Deps, footballMatchEventsHandler } from "./football-match-events-handler"
import { CalendarEvent, FootballMatch } from "./football-match-events"

test("update football match events", async () => {
    const updatedMatch = footballMatch(matchId1, date("2023-09-17", "15:00"))

    const DepsTest = Layer.succeed(Deps, {
        loadMatchesByTeam: () => Effect.succeed([updatedMatch]),
        loadCalendarEventsByTeam: () => Effect.succeed([calendarEvent(matchId1, date("2023-09-17", "12:30"), "1234")]),
        createCalendarEvent: () => Effect.unit,
        updateCalendarEvent: () => Effect.unit,
    })

    const result = await F.pipe(footballMatchEventsHandler(anyTeam), Effect.provide(DepsTest), Effect.runPromise)

    expect(result).toStrictEqual({ created: 0, updated: 1, nothingChanged: 0 })
})

const footballMatch = (id: number, date: Date): FootballMatch => ({
    id,
    date,
    teamId: 999,
    homeTeam: "ANY_HOME_TEAM",
    awayTeam: "ANY_AWAY_TEAM",
    competition: "ANY_COMPETITION",
})
const calendarEvent = (matchId: number, startDate: Date, eventId?: string): CalendarEvent => ({
    matchId,
    startDate,
    originalEvent: originalEvent(eventId || "9999"),
})

const date = (date: `${number}-${number}-${number}`, time?: `${number}:${number}`) =>
    new Date(`${date}T${time || "00:00"}Z`)
const originalEvent = (id: string): CalendarEvent["originalEvent"] => ({ id })
const anyTeam = 1
const matchId1 = 1

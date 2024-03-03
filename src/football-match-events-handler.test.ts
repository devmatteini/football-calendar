import { test, expect, vi, beforeEach } from "vitest"
import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Layer from "effect/Layer"
import { FootballMatchEventsHandlerDeps, footballMatchEventsHandler } from "./football-match-events-handler"
import { CalendarEvent, FootballMatch } from "./football-match-events"

const createCalendarEventSpy = vi.fn(() => Effect.unit)
const updateCalendarEventSpy = vi.fn(() => Effect.unit)

beforeEach(() => {
    vi.clearAllMocks()
})

test("create, update, ignore matches", async () => {
    const newMatch = footballMatch(1, date("2023-09-03", "18:30"))
    const updatedMatch = footballMatch(2, date("2023-09-17", "15:00"))
    const sameMatch = footballMatch(3, date("2023-09-24", "20:45"))
    const calendarEvents = [
        calendarEvent(updatedMatch.id, date("2023-09-17", "12:30"), "1234"),
        calendarEvent(sameMatch.id, sameMatch.date, "5678"),
    ]
    const deps = DepsTest({
        loadMatchesByTeam: () => Effect.succeed([newMatch, updatedMatch, sameMatch]),
        loadCalendarEventsByTeam: () => Effect.succeed(calendarEvents),
        createCalendarEvent: createCalendarEventSpy,
        updateCalendarEvent: updateCalendarEventSpy,
        saveCalendarEvent: () => Effect.unit,
    })

    const result = await F.pipe(footballMatchEventsHandler(anyTeam), Effect.provide(deps), Effect.runPromise)

    expect(result).toStrictEqual({ created: 1, updated: 1, nothingChanged: 1 })
    expect(createCalendarEventSpy).toHaveBeenNthCalledWith(1, { _tag: "CREATE", match: newMatch })
    expect(updateCalendarEventSpy).toHaveBeenNthCalledWith(1, {
        _tag: "UPDATE",
        match: updatedMatch,
        originalCalendarEvent: originalEvent("1234"),
    })
})

const DepsTest = (deps: FootballMatchEventsHandlerDeps) => Layer.succeed(FootballMatchEventsHandlerDeps, deps)

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

import { test, expect, vi, beforeEach } from "vitest"
import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Layer from "effect/Layer"
import { FootballMatchEventsHandlerDeps, footballMatchEventsHandler } from "./football-match-events-handler"
import { CalendarEvent, FootballMatch } from "./football-match-events"
import { Team } from "./football-calendars-config"

const saveCalendarEventSpy = vi.fn(() => Effect.void)

beforeEach(() => {
    vi.clearAllMocks()
})

test("create, update, ignore matches", async () => {
    const newMatch = footballMatch(1, date("2023-09-03", "18:30"))
    const updatedMatch = footballMatch(2, date("2023-09-17", "15:00"))
    const sameMatch = footballMatch(3, date("2023-09-24", "20:45"))
    const calendarEvents = [
        calendarEvent(updatedMatch.matchId, date("2023-09-17", "12:30"), "1234"),
        calendarEvent(sameMatch.matchId, sameMatch.date, "5678"),
    ]
    const deps = DepsTest({
        loadMatches: () => Effect.succeed([newMatch, updatedMatch, sameMatch]),
        loadCalendarEvents: () => Effect.succeed(calendarEvents),
        saveCalendarEvent: saveCalendarEventSpy,
    })

    const result = await F.pipe(footballMatchEventsHandler(anyTeam), Effect.provide(deps), Effect.runPromise)

    expect(result).toStrictEqual({ created: 1, updated: 1, nothingChanged: 1 })

    expect(saveCalendarEventSpy).toHaveBeenCalledTimes(2)
    expect(saveCalendarEventSpy).toHaveBeenNthCalledWith(1, { _tag: "CREATE", match: newMatch })
    expect(saveCalendarEventSpy).toHaveBeenNthCalledWith(2, {
        _tag: "UPDATE",
        match: updatedMatch,
        originalCalendarEvent: originalEvent("1234"),
    })
})

const DepsTest = (deps: FootballMatchEventsHandlerDeps) => Layer.succeed(FootballMatchEventsHandlerDeps, deps)

const footballMatch = (id: number, date: Date): FootballMatch => ({
    matchId: id,
    date,
    calendar: { origin: "Team", id: 999 },
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
const anyTeam = Team.make({
    name: "ANY_TEAM",
    teamId: 1,
})

import { test, expect } from "vitest"
import {
    CalendarEvent,
    CreateFootballMatchEvent,
    FootballMatch,
    NothingChangedFootballMatchEvent,
    UpdateFootballMatchEvent,
    footballMatchEvents,
} from "./football-match-events"

test("new match, no calendar event", () => {
    const match = footballMatch(1, date("2023-09-03", "18:30"))

    const result = footballMatchEvents([match], [])

    expect(result).toStrictEqual([create(match)])
})

test("match time updated", () => {
    const match = footballMatch(1, date("2023-09-03", "18:30"))

    const calendarEvent = {
        matchId: match.matchId,
        startDate: date("2023-09-03", "15:00"),
        originalEvent: anyOriginalEvent,
    }
    const result = footballMatchEvents([match], [calendarEvent])

    expect(result).toStrictEqual([update(match, calendarEvent.originalEvent)])
})

test("match date updated", () => {
    const match = footballMatch(1, date("2023-09-03", "18:30"))

    const calendarEvent = {
        matchId: match.matchId,
        startDate: date("2023-09-04", "18:30"),
        originalEvent: anyOriginalEvent,
    }
    const result = footballMatchEvents([match], [calendarEvent])

    expect(result).toStrictEqual([update(match, calendarEvent.originalEvent)])
})

test("match not changed", () => {
    const match1 = footballMatch(1, date("2023-09-03", "18:30"))

    const calendarEvent = {
        matchId: match1.matchId,
        startDate: date("2023-09-03", "18:30"),
        originalEvent: anyOriginalEvent,
    }
    const result = footballMatchEvents([match1], [calendarEvent])

    expect(result).toStrictEqual([nothingChanged(match1.matchId)])
})

test("many matches, many calendar events", () => {
    const newMatch = footballMatch(1, date("2023-09-03", "18:30"))
    const updatedMatch = footballMatch(2, date("2023-09-17", "15:00"))
    const sameMatch = footballMatch(3, date("2023-09-24", "20:45"))

    const result = footballMatchEvents(
        [newMatch, updatedMatch, sameMatch],
        [
            {
                matchId: updatedMatch.matchId,
                startDate: date("2023-09-17", "12:30"),
                originalEvent: originalEvent("1234"),
            },
            {
                matchId: sameMatch.matchId,
                startDate: sameMatch.date,
                originalEvent: originalEvent("5678"),
            },
        ],
    )

    expect(result).toStrictEqual([
        create(newMatch),
        update(updatedMatch, originalEvent("1234")),
        nothingChanged(sameMatch.matchId),
    ])
})

const create = (match: FootballMatch) => CreateFootballMatchEvent({ match })
const update = (match: FootballMatch, originalCalendarEvent: UpdateFootballMatchEvent["originalCalendarEvent"]) =>
    UpdateFootballMatchEvent({ match, originalCalendarEvent })
const nothingChanged = (matchId: FootballMatch["matchId"]) => NothingChangedFootballMatchEvent({ matchId })

const date = (date: `${number}-${number}-${number}`, time?: `${number}:${number}`) =>
    new Date(`${date}T${time || "00:00"}Z`)

const anyOriginalEvent: CalendarEvent["originalEvent"] = { id: "1234" }
const originalEvent = (id: string): CalendarEvent["originalEvent"] => ({ id })

const footballMatch = (id: number, date: Date): FootballMatch => ({
    matchId: id,
    date,
    teamId: 999,
    homeTeam: "ANY_HOME_TEAM",
    awayTeam: "ANY_AWAY_TEAM",
    competition: "ANY_COMPETITION",
})

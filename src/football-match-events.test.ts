import { test, expect } from "vitest"
import { CalendarEvent, FootballMatch, footballMatchEvents } from "./football-match-events"

test("new match, no calendar event", () => {
    const match = footballMatch(1, date("2023-09-03", "18:30"))

    const result = footballMatchEvents([match], [])

    expect(result).toStrictEqual([{ _tag: "CREATE", match }])
})

test("match time updated", () => {
    const match = footballMatch(1, date("2023-09-03", "18:30"))

    const calendarEvent = {
        matchId: match.id,
        startDate: date("2023-09-03", "15:00"),
        originalEvent: anyOriginalEvent,
    }
    const result = footballMatchEvents([match], [calendarEvent])

    expect(result).toStrictEqual([
        {
            _tag: "UPDATE",
            match,
            originalCalendarEvent: calendarEvent.originalEvent,
        },
    ])
})

test("match date updated", () => {
    const match = footballMatch(1, date("2023-09-03", "18:30"))

    const calendarEvent = {
        matchId: match.id,
        startDate: date("2023-09-04", "18:30"),
        originalEvent: anyOriginalEvent,
    }
    const result = footballMatchEvents([match], [calendarEvent])

    expect(result).toStrictEqual([
        {
            _tag: "UPDATE",
            match,
            originalCalendarEvent: calendarEvent.originalEvent,
        },
    ])
})

test("match not changed", () => {
    const match1 = footballMatch(1, date("2023-09-03", "18:30"))

    const calendarEvent = {
        matchId: match1.id,
        startDate: date("2023-09-03", "18:30"),
        originalEvent: anyOriginalEvent,
    }
    const result = footballMatchEvents([match1], [calendarEvent])

    expect(result).toStrictEqual([
        {
            _tag: "NOTHING_CHANGED",
            matchId: match1.id,
        },
    ])
})

test("many matches, many calendar events", () => {
    const newMatch = footballMatch(1, date("2023-09-03", "18:30"))
    const updatedMatch = footballMatch(2, date("2023-09-17", "15:00"))
    const sameMatch = footballMatch(3, date("2023-09-24", "20:45"))

    const result = footballMatchEvents(
        [newMatch, updatedMatch, sameMatch],
        [
            {
                matchId: updatedMatch.id,
                startDate: date("2023-09-17", "12:30"),
                originalEvent: originalEvent("1234"),
            },
            {
                matchId: sameMatch.id,
                startDate: sameMatch.date,
                originalEvent: originalEvent("5678"),
            },
        ],
    )

    expect(result).toStrictEqual([
        {
            _tag: "CREATE",
            match: newMatch,
        },
        {
            _tag: "UPDATE",
            match: updatedMatch,
            originalCalendarEvent: originalEvent("1234"),
        },
        {
            _tag: "NOTHING_CHANGED",
            matchId: sameMatch.id,
        },
    ])
})

const date = (date: `${number}-${number}-${number}`, time?: `${number}:${number}`) =>
    new Date(`${date}T${time || "00:00"}Z`)

const anyOriginalEvent: CalendarEvent["originalEvent"] = { id: "1234" }
const originalEvent = (id: string): CalendarEvent["originalEvent"] => ({ id })

const footballMatch = (id: number, date: Date): FootballMatch => ({
    id,
    date,
    teamId: 999,
    homeTeam: "ANY_HOME_TEAM",
    awayTeam: "ANY_AWAY_TEAM",
    competition: "ANY_COMPETITION",
})

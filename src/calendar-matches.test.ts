import { test, expect } from "vitest"
import { CalendarEvent, FootballMatch, calendarMatches } from "./calendar-matches"

test("new match, no calendar event", () => {
    const match: FootballMatch = {
        id: 1,
        date: date("2023-09-03", "18:30"),
    }

    const result = calendarMatches([match], [])

    expect(result).toStrictEqual([{ type: "NEW", match }])
})

test("match time updated", () => {
    const match: FootballMatch = {
        id: 1,
        date: date("2023-09-03", "18:30"),
    }

    const calendarEvent = {
        matchId: match.id,
        startDate: date("2023-09-03", "15:00"),
        originalEvent: anyOriginalEvent,
    }
    const result = calendarMatches([match], [calendarEvent])

    expect(result).toStrictEqual([
        {
            type: "UPDATED",
            match,
            originalCalendarEvent: calendarEvent.originalEvent,
        },
    ])
})

test("match date updated", () => {
    const match: FootballMatch = {
        id: 1,
        date: date("2023-09-03", "18:30"),
    }

    const calendarEvent = {
        matchId: match.id,
        startDate: date("2023-09-04", "18:30"),
        originalEvent: anyOriginalEvent,
    }
    const result = calendarMatches([match], [calendarEvent])

    expect(result).toStrictEqual([
        {
            type: "UPDATED",
            match,
            originalCalendarEvent: calendarEvent.originalEvent,
        },
    ])
})

test("match not changed", () => {
    const match1: FootballMatch = {
        id: 1,
        date: date("2023-09-03", "18:30"),
    }

    const calendarEvent = {
        matchId: match1.id,
        startDate: date("2023-09-03", "18:30"),
        originalEvent: anyOriginalEvent,
    }
    const result = calendarMatches([match1], [calendarEvent])

    expect(result).toStrictEqual([
        {
            type: "NOTHING_CHANGED",
            matchId: match1.id,
        },
    ])
})

test("many matches, many calendar events", () => {
    const newMatch: FootballMatch = {
        id: 1,
        date: date("2023-09-03", "18:30"),
    }
    const updatedMatch: FootballMatch = {
        id: 2,
        date: date("2023-09-17", "15:00"),
    }
    const sameMatch: FootballMatch = {
        id: 3,
        date: date("2023-09-24", "20:45"),
    }

    const result = calendarMatches(
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
            type: "NEW",
            match: newMatch,
        },
        {
            type: "UPDATED",
            match: updatedMatch,
            originalCalendarEvent: originalEvent("1234"),
        },
        {
            type: "NOTHING_CHANGED",
            matchId: sameMatch.id,
        },
    ])
})

const date = (date: `${number}-${number}-${number}`, time?: `${number}:${number}`) =>
    new Date(`${date}T${time || "00:00"}Z`)

const anyOriginalEvent: CalendarEvent["originalEvent"] = { eventId: "1234" }
const originalEvent = (id: string): CalendarEvent["originalEvent"] => ({ eventId: id })

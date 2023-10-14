import { expect, test, vi } from "vitest"
import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Layer from "effect/Layer"
import * as Exit from "effect/Exit"
import { Deps, footballMatchEventsHandler } from "./football-match-events-handler"
import { CalendarEvent, FootballMatch } from "./football-match-events"

test.todo("create football match event", async () => {})

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
const anyFootballMatch = footballMatch(matchId1, date("2023-10-14", "15:00"))

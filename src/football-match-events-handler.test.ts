import { expect, test, vi } from "vitest"
import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Exit from "effect/Exit"
import { Deps, footballMatchEventsHandler } from "./football-match-events-handler"
import { FootballMatch } from "./football-match-events"

test("create football match event", async () => {
    const createCalendarEvent = vi.fn(() => Effect.unit)

    const DepsTest = Deps.of({
        loadMatchesByTeam: () => Effect.succeed([anyFootballMatch]),
        loadCalendarEventsByTeam: () => Effect.succeed([]),
        createCalendarEvent,
        updateCalendarEvent: () => Effect.unit,
    })

    const result = await F.pipe(
        footballMatchEventsHandler(anyTeam),
        Effect.provideService(Deps, DepsTest),
        Effect.runPromiseExit,
    )

    expect(Exit.isSuccess(result)).toBeTruthy()
    expect(createCalendarEvent).toHaveBeenCalledOnce()
})

const footballMatch = (id: number, date: Date): FootballMatch => ({
    id,
    date,
    teamId: 999,
    homeTeam: "ANY_HOME_TEAM",
    awayTeam: "ANY_AWAY_TEAM",
    competition: "ANY_COMPETITION",
})

const date = (date: `${number}-${number}-${number}`, time?: `${number}:${number}`) =>
    new Date(`${date}T${time || "00:00"}Z`)
const anyTeam = 1
const matchId1 = 1
const anyFootballMatch = footballMatch(matchId1, date("2023-10-14", "15:00"))

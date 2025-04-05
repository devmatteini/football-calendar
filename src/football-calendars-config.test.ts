import { expect, test } from "vitest"
import { FootballCalendarsJsonSchema } from "./football-calendars-config"

test("FootballCalendars JSON Schema - if this test fails the public API contract may be broken", () => {
    expect(FootballCalendarsJsonSchema).toMatchSnapshot()
})

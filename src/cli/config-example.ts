import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { exampleFootballCalendars, FootballCalendars } from "../football-calendars-config"
import * as Console from "effect/Console"

export const configExampleCommandHandler = Effect.gen(function* () {
    const encoded = yield* Schema.encode(FootballCalendars)(exampleFootballCalendars)
    yield* Console.log(JSON.stringify(encoded, null, 2))
})

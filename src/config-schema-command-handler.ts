import { FootballCalendarsJsonSchema } from "./football-calendars-config"
import * as Console from "effect/Console"

export const configSchemaCommandHandler = Console.log(JSON.stringify(FootballCalendarsJsonSchema, null, 2))

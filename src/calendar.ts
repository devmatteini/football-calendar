import * as Context from "effect/Context"
import { FootballCalendar } from "./football-calendars-config"
import * as Effect from "effect/Effect"
import { CalendarEvent, CreateFootballMatchEvent, UpdateFootballMatchEvent } from "./football-match-events"

export type CalendarService = {
    loadEvents: (calendar: FootballCalendar) => Effect.Effect<readonly CalendarEvent[]>
    saveEvent: (event: CreateFootballMatchEvent | UpdateFootballMatchEvent) => Effect.Effect<void>
}
export class Calendar extends Context.Tag("Calendar")<Calendar, CalendarService>() {}

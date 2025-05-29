import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Calendar } from "./calendar"
import * as Config from "effect/Config"
import * as F from "effect/Function"
import { auth, calendar } from "@googleapis/calendar"
import * as EventMatchId from "./event-match-id"
import * as Match from "effect/Match"
import { FootballCalendar } from "./football-calendars-config"
import { GoogleCalendarEvent } from "./google-calendar"
import * as SchemaExt from "./common/schema-ext"
import { CalendarEvent, CreateFootballMatchEvent, UpdateFootballMatchEvent } from "./football-match-events"
import * as Schema from "effect/Schema"
import * as Array from "effect/Array"
import * as EffectExt from "./common/effect-ext"

export const GoogleCalendarLive = Layer.effect(
    Calendar,
    Effect.gen(function* () {
        const { calendarId, keyFile } = yield* Config.all({
            keyFile: Config.string("GOOGLE_CALENDAR_KEY_FILE").pipe(Config.map(realPath)),
            calendarId: Config.string("GOOGLE_CALENDAR_ID"),
        })

        const client = yield* F.pipe(
            Effect.tryPromise({
                try: () => auth.getClient({ keyFile, scopes: "https://www.googleapis.com/auth/calendar.events" }),
                // TODO: remove native Error and use tagged error type
                catch: (e) => new Error(`Unable to authenticate with google api: ${e}`),
            }),
            Effect.map((client) => calendar({ version: "v3", auth: client })),
        )

        // https://developers.google.com/calendar/api/v3/reference/events/list
        const listEvents = (privateProperties: Record<string, string>, today: Date = new Date()) =>
            // TODO: rewrite this to pipeline
            Effect.gen(function* () {
                const response = yield* F.pipe(
                    Effect.tryPromise({
                        try: () =>
                            client.events.list({
                                calendarId,
                                timeMin: today.toISOString(),
                                timeZone: "UTC",
                                singleEvents: true,
                                privateExtendedProperty: F.pipe(
                                    Object.entries(privateProperties),
                                    Array.map(([key, value]) => `${key}=${value}`),
                                ),
                            }),
                        catch: (e) => new Error(`Unable to retrieve list of google calendar events: ${e}`),
                    }),
                    Effect.orDie,
                )

                return response.data.items || []
            })

        // https://developers.google.com/calendar/api/v3/reference/events/insert
        const createCalendarEvent = ({ match }: CreateFootballMatchEvent) =>
            F.pipe(
                Effect.tryPromise({
                    try: () =>
                        client.events.insert({
                            calendarId,
                            requestBody: {
                                summary: `${match.homeTeam}-${match.awayTeam} (${match.competition})`,
                                start: {
                                    dateTime: match.date.toISOString(),
                                    timeZone: "UTC",
                                },
                                end: {
                                    dateTime: matchEndTime(match.date).toISOString(),
                                    timeZone: "UTC",
                                },
                                extendedProperties: {
                                    private: EventMatchId.encode({ id: match.calendar.id, matchId: match.matchId }),
                                },
                            },
                        }),
                    catch: (e) => new Error(`Unable to insert google calendar event: ${e}`),
                }),
                Effect.tap(() =>
                    EffectExt.logDebug("Calendar event created", {
                        matchId: match.matchId,
                        match: `${match.homeTeam}-${match.awayTeam}`,
                        competition: match.competition,
                        matchDate: match.date.toISOString(),
                    }),
                ),
                Effect.asVoid,
                Effect.orDie,
            )

        const updateCalendarEvent = ({ match, originalCalendarEvent }: UpdateFootballMatchEvent) =>
            F.pipe(
                Effect.tryPromise({
                    try: () =>
                        client.events.update({
                            calendarId,
                            eventId: originalCalendarEvent.id || undefined,
                            requestBody: {
                                ...originalCalendarEvent,
                                start: {
                                    dateTime: match.date.toISOString(),
                                    timeZone: "UTC",
                                },
                                end: {
                                    dateTime: matchEndTime(match.date).toISOString(),
                                    timeZone: "UTC",
                                },
                            },
                        }),
                    catch: (e) => new Error(`Unable to update google calendar event: ${e}`),
                }),
                Effect.tap(() =>
                    EffectExt.logDebug("Calendar event updated", {
                        matchId: match.matchId,
                        match: `${match.homeTeam}-${match.awayTeam}`,
                        competition: match.competition,
                        matchDate: match.date.toISOString(),
                    }),
                ),
                Effect.asVoid,
                Effect.orDie,
            )

        return {
            loadEvents: (calendar) =>
                F.pipe(
                    listEvents(EventMatchId.encodeId(toEventMatchId(calendar))),
                    Effect.flatMap(Effect.forEach(validateCalendarEvent)),
                    Effect.orDie,
                ),
            saveEvent: (event) =>
                F.pipe(
                    Match.value(event),
                    Match.tag("CREATE", (x) => createCalendarEvent(x)),
                    Match.tag("UPDATE", (x) => updateCalendarEvent(x)),
                    Match.exhaustive,
                ),
        }
    }),
)

const realPath = (path: string) => {
    if (!process.env.HOME) return path
    return path.startsWith("~") ? path.replace("~", process.env.HOME) : path
}

const toEventMatchId = F.pipe(
    Match.type<FootballCalendar>(),
    Match.tag("Team", ({ teamId }) => teamId),
    Match.tag("League", ({ leagueId }) => leagueId),
    Match.exhaustive,
)

const validateCalendarEvent = (originalEvent: GoogleCalendarEvent) =>
    F.pipe(
        SchemaExt.decode(CalendarListEvent, originalEvent),
        Effect.map(
            (validated): CalendarEvent => ({
                matchId: validated.extendedProperties.private.matchId,
                startDate: validated.start.dateTime,
                originalEvent,
            }),
        ),
    )

// TODO: add identifier annotation
const CalendarListEvent = Schema.Struct({
    start: Schema.Struct({
        dateTime: Schema.Date,
    }),
    extendedProperties: Schema.Struct({
        private: EventMatchId.EventMatchId,
    }),
})

const matchEndTime = (date: Date) => {
    const newDate = new Date(date)
    newDate.setMinutes(date.getMinutes() + matchDurationMin + halfTimeMin)
    return newDate
}

const matchDurationMin = 90
const halfTimeMin = 15

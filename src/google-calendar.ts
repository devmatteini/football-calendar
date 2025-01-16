import { calendar_v3, auth, calendar } from "@googleapis/calendar"
import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import * as Context from "effect/Context"
import * as Layer from "effect/Layer"
import * as Config from "effect/Config"
import * as Array from "effect/Array"

type GoogleCalendar = calendar_v3.Calendar
export type GoogleCalendarEvent = calendar_v3.Schema$Event

export type GoogleCalendarClient = {
    client: GoogleCalendar
    calendarId: string
}
export const GoogleCalendarClient = Context.GenericTag<GoogleCalendarClient>("GoogleCalendarClient")

const realPath = (path: string) => {
    if (!process.env.HOME) return path
    return path.startsWith("~") ? path.replace("~", process.env.HOME) : path
}

export const GoogleCalendarClientLive = Layer.effect(
    GoogleCalendarClient,
    Effect.gen(function* () {
        const { calendarId, keyFile } = yield* Config.all({
            keyFile: Config.string("GOOGLE_CALENDAR_KEY_FILE").pipe(Config.map(realPath)),
            calendarId: Config.string("GOOGLE_CALENDAR_ID"),
        })

        const client = yield* F.pipe(
            Effect.tryPromise({
                try: () => auth.getClient({ keyFile, scopes: "https://www.googleapis.com/auth/calendar.events" }),
                catch: (e) => new Error(`Unable to authenticate with google api: ${e}`),
            }),
            Effect.map((client) => calendar({ version: "v3", auth: client })),
        )

        return GoogleCalendarClient.of({ calendarId, client })
    }).pipe(Effect.orDie),
)

// https://developers.google.com/calendar/api/v3/reference/events/list
export const listEvents = (privateProperties: Record<string, string>, today: Date = new Date()) =>
    Effect.gen(function* () {
        const { client, calendarId } = yield* GoogleCalendarClient

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
export const insertEvent = (event: GoogleCalendarEvent) =>
    Effect.gen(function* () {
        const { client, calendarId } = yield* GoogleCalendarClient

        yield* F.pipe(
            Effect.tryPromise({
                try: () =>
                    client.events.insert({
                        calendarId,
                        requestBody: event,
                    }),
                catch: (e) => new Error(`Unable to insert google calendar event: ${e}`),
            }),
            Effect.orDie,
        )
    })

// https://developers.google.com/calendar/api/v3/reference/events/update
export const updateEvent = (event: GoogleCalendarEvent) =>
    Effect.gen(function* () {
        const { client, calendarId } = yield* GoogleCalendarClient

        yield* F.pipe(
            Effect.tryPromise({
                try: () =>
                    client.events.update({
                        calendarId,
                        eventId: event.id || undefined,
                        requestBody: event,
                    }),
                catch: (e) => new Error(`Unable to update google calendar event: ${e}`),
            }),
            Effect.orDie,
        )
    })

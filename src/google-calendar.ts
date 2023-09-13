import { calendar_v3, auth, calendar } from "@googleapis/calendar"
import * as Effect from "@effect/io/Effect"
import * as F from "@effect/data/Function"
import * as Context from "@effect/data/Context"
import * as Layer from "@effect/io/Layer"
import * as Config from "@effect/io/Config"

type GoogleCalendar = calendar_v3.Calendar
export type GoogleCalendarEvent = calendar_v3.Schema$Event

export type AuthenticatedGoogleCalendar = {
    client: GoogleCalendar
    calendarId: string
}
export const AuthenticatedGoogleCalendar = Context.Tag<AuthenticatedGoogleCalendar>()

export const AuthenticatedGoogleCalendarLive = Layer.effect(
    AuthenticatedGoogleCalendar,
    F.pipe(
        Effect.config(
            Config.all({
                keyFile: Config.string("GOOGLE_CALENDAR_KEY_FILE"),
                calendarId: Config.string("GOOGLE_CALENDAR_ID"),
            }),
        ),
        Effect.bind("client", ({ keyFile }) =>
            F.pipe(
                Effect.tryPromise({
                    try: () => auth.getClient({ keyFile, scopes: "https://www.googleapis.com/auth/calendar.events" }),
                    catch: (e) => new Error(`Unable to authenticate with google api: ${e}`),
                }),
                Effect.map((client) => calendar({ version: "v3", auth: client })),
            ),
        ),
        Effect.map(({ calendarId, client }) => AuthenticatedGoogleCalendar.of({ calendarId, client })),
    ),
)

// https://developers.google.com/calendar/api/v3/reference/events/list
export const listEvents = (freeTextSearch?: string, today: Date = new Date()) =>
    F.pipe(
        AuthenticatedGoogleCalendar,
        Effect.flatMap(({ client, calendarId }) =>
            Effect.tryPromise({
                try: () =>
                    client.events.list({
                        calendarId,
                        timeMin: today.toISOString(),
                        q: freeTextSearch,
                        timeZone: "UTC",
                    }),
                catch: (e) => new Error(`Unable to retrieve list of google calendar events: ${e}`),
            }),
        ),
        Effect.map((response) => response.data.items || []),
    )

// https://developers.google.com/calendar/api/v3/reference/events/insert
export const insertEvent = (event: GoogleCalendarEvent) =>
    F.pipe(
        AuthenticatedGoogleCalendar,
        Effect.flatMap(({ client, calendarId }) =>
            Effect.tryPromise({
                try: () =>
                    client.events.insert({
                        calendarId,
                        requestBody: event,
                    }),
                catch: (e) => new Error(`Unable to insert google calendar event: ${e}`),
            }),
        ),
        Effect.asUnit,
    )

// https://developers.google.com/calendar/api/v3/reference/events/update
export const updateEvent = (event: GoogleCalendarEvent) =>
    F.pipe(
        AuthenticatedGoogleCalendar,
        Effect.flatMap(({ client, calendarId }) =>
            Effect.tryPromise({
                try: () =>
                    client.events.update({
                        calendarId,
                        eventId: event.id || undefined,
                        requestBody: event,
                    }),
                catch: (e) => new Error(`Unable to update google calendar event: ${e}`),
            }),
        ),
        Effect.asUnit,
    )

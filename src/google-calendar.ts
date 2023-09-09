import { calendar_v3, google } from "googleapis"
import * as Effect from "@effect/io/Effect"
import * as F from "@effect/data/Function"
import * as Context from "@effect/data/Context"
import * as Layer from "@effect/io/Layer"
import * as Config from "@effect/io/Config"

type GoogleCalendar = calendar_v3.Calendar

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
                    try: () =>
                        google.auth.getClient({ keyFile, scopes: "https://www.googleapis.com/auth/calendar.events" }),
                    catch: (e) => new Error(`Unable to authenticate with google api: ${e}`),
                }),
                Effect.map((client) => google.calendar({ version: "v3", auth: client })),
            ),
        ),
        Effect.map(({ calendarId, client }) => AuthenticatedGoogleCalendar.of({ calendarId, client })),
    ),
)

import * as Effect from "@effect/io/Effect"
import * as F from "@effect/data/Function"
import { AuthenticatedGoogleCalendar, AuthenticatedGoogleCalendarLive, listEvents } from "../src/google-calendar"
import { calendar_v3 } from "googleapis"

const main = () => {
    const teamId = process.argv[2]
    if (!teamId) throw new Error("Missing teamId as argument")

    return F.pipe(
        listEvents(`FC-${teamId}`),
        Effect.flatMap(Effect.forEach(deleteEvent, { discard: true, concurrency: 2 })),
        Effect.provideLayer(AuthenticatedGoogleCalendarLive),
        Effect.runPromise,
    )
}

const deleteEvent = (event: calendar_v3.Schema$Event) =>
    F.pipe(
        AuthenticatedGoogleCalendar,
        Effect.flatMap(({ calendarId, client }) =>
            Effect.promise(() =>
                client.events.delete({
                    calendarId,
                    eventId: event.id || undefined,
                    sendNotifications: false,
                }),
            ),
        ),
        Effect.tap(() => Effect.logInfo(`Deleted ${event.summary} - ${formatDate(event.start?.dateTime || "")}`)),
    )

const formatDate = (rawDate: string) => new Date(rawDate).toISOString().split("T")[0]

main().catch((e) => {
    console.error(e)
    process.exit(1)
})

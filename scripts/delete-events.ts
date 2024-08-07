import * as Effect from "effect/Effect"
import * as F from "effect/Function"
import { GoogleCalendarClient, GoogleCalendarClientLive, listEvents } from "../src/google-calendar"
import { calendar_v3 } from "@googleapis/calendar"
import * as EventMatchId from "../src/event-match-id"

const main = () => {
    const teamId = Number(process.argv[2])
    if (Number.isNaN(teamId)) throw new Error("Missing teamId as argument or not a number")

    return F.pipe(
        listEvents(EventMatchId.encodeId(teamId)),
        Effect.flatMap(Effect.forEach(deleteEvent, { discard: true, concurrency: 2 })),
        Effect.provide(GoogleCalendarClientLive),
        Effect.runPromise,
    )
}

const deleteEvent = (event: calendar_v3.Schema$Event) =>
    F.pipe(
        GoogleCalendarClient,
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

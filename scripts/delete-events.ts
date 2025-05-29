import * as F from "effect/Function"
import { auth, calendar } from "@googleapis/calendar"
import * as EventMatchId from "../src/event-match-id"
import * as Array from "effect/Array"

const main = async () => {
    const teamId = Number(process.argv[2])
    if (Number.isNaN(teamId)) throw new Error("Missing teamId as argument or not a number")

    const client = await auth.getClient({
        keyFile: process.env.GOOGLE_CALENDAR_KEY_FILE,
        scopes: ["https://www.googleapis.com/auth/calendar.events"],
    })
    const calendarClient = calendar({ version: "v3", auth: client })
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    const listResponse = await calendarClient.events.list({
        calendarId,
        timeMin: new Date().toISOString(),
        timeZone: "UTC",
        singleEvents: true,
        privateExtendedProperty: F.pipe(
            Object.entries(EventMatchId.encodeId(teamId)),
            Array.map(([key, value]) => `${key}=${value}`),
        ),
    })
    const events = listResponse.data.items || []

    for (const event of events) {
        await calendarClient.events.delete({
            calendarId,
            eventId: event.id || undefined,
            sendNotifications: false,
        })
        console.log(`Deleted ${event.summary} - ${formatDate(event.start?.dateTime || "")}`)
    }
}

const formatDate = (rawDate: string) => new Date(rawDate).toISOString().split("T")[0]

main().catch((e) => {
    console.error(e)
    process.exit(1)
})

import { auth, calendar } from "@googleapis/calendar"

const main = async () => {
    const client = await auth.getClient({
        keyFile: process.env.GOOGLE_CALENDAR_KEY_FILE,
        scopes: ["https://www.googleapis.com/auth/calendar.events"],
    })
    const calendarClient = calendar({ version: "v3", auth: client })

    const result = await calendarClient.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        timeMin: new Date().toISOString(),
        timeZone: "UTC",
    })

    console.log(JSON.stringify(result.data, null, 2))
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})

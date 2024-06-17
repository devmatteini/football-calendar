# Football Calendar

[![CI](https://github.com/devmatteini/football-calendar/actions/workflows/main.yml/badge.svg)](https://github.com/devmatteini/football-calendar/actions/workflows/main.yml)

Automatically sync your google calendar with football matches of your favorite team!

Table of content:

-   [Installation](#installation)
-   [Setup](#setup)
    -   [Api-Football](#api-football)
    -   [Google Calendar](#google-calendar)
-   [Usage](#usage)
-   [License](#license)

## Installation

```bash
git clone --depth=1 https://github.com/devmatteini/football-calendar.git
cd football-calendar
pnpm install
```

## Setup

### Api-Football

1. Create a new account with api-football (RapidAPI is not supported): https://dashboard.api-football.com/register
2. Find API key in `Account -> My Access`
3. You can find football teams ids at this page: https://dashboard.api-football.com/soccer/ids/teams

### Google calendar

#### Google Console Project

1. Create a new google cloud project: https://console.cloud.google.com
2. Enable calendar api: API & Services -> Library -> Search "google calendar api" -> open it and click Enable
3. Create api credentials: API & Services -> Google Calendar API -> open `Credentials` tab -> Click `Create Credentials` -> Choose `Service account` -> Enter `football-calendar` as name -> Done
4. Inside the service account page -> open Keys tab -> Add keys -> Create new key -> JSON -> Create

#### Google Calendar

1. Go to https://calendar.google.com/ and login with the same google account that you created the console project
2. Open Settings -> Add calendar -> choose `Create new calendar`

    **NOTE: make sure to set GMT/UTC as time zone (from my tests with other time zones it may cause issues)**

3. Open the newly created calendar -> Share with specific people or groups -> Add people or groups -> Insert the service account email (you can find this in the service account list or detail page) and `Make changes to events` as permissions
4. If you want reminders, open the newly created calendar settings -> Event notifications -> Add notification (for some reasons Google Calendar API is not able to set reminders on non-primary calendars).

## Usage

If you haven't already done so, follow the [setup](#setup) process.

Export this environment variables:

```bash
export API_FOOTBALL_TOKEN="..."

# This is the file that was downloaded after creating the service account credentials
export GOOGLE_CALENDAR_KEY_FILE="/path/to/calendar/keys.json"

# Google Calendar -> Settings -> Open your `calendar` -> Integrate calendar -> Copy Calendar ID
export GOOGLE_CALENDAR_ID="..."
```

Search your team id at this page: https://dashboard.api-football.com/soccer/ids/teams

```bash
pnpm start sync -t <teamId>
```

### Build

```bash
pnpm build
./.build/football-calendar sync -t <teamId>
```

### Logging

Export environment variable `LOG_LEVEL` to change the minimum log level.
The possible values are:

-   `Debug`
-   `Info` (default)
-   `Error`

## License

`football-calendar` is made available under the terms of the MIT License.

See the [LICENSE](LICENSE) file for license details.

# Infrastructure

## Raspberry Pi Zero W

From the root directory of this repository run:

```bash
export API_FOOTBALL_TOKEN="..."
export GOOGLE_CALENDAR_KEY_FILE="..."
export GOOGLE_CALENDAR_ID="..."
export REMOTE_HOST="<user>@<ip>"

./infrastructure/raspberrypi-zero-w.sh <team_id>
```

This script will:

-   build the application
-   deploy the application to Raspberry Pi
-   setup a cronjob to run the application every monday at 10:00

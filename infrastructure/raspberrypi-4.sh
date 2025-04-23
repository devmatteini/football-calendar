#!/usr/bin/env bash

check_mandatory_env_variables() {
    errors=()

    for env in "$@"; do
        if [[ -z ${!env} ]]; then 
            errors+=("$env")
        fi
    done

    error_length="${#errors[@]}"
    if [[ $error_length -ge 1 ]]; then
        error_message=$(IFS=,; echo "${errors[*]}")
        echo "Missing environment variables: $error_message"
        return 1
    fi
}

build_app() {
    pnpm build
}

deploy_app() {    
    ssh "$REMOTE_HOST" 'mkdir -p ~/.local/bin'
    ssh "$REMOTE_HOST" 'mkdir -p ~/.local/share/football-calendar'
    scp dist/football-calendar "$REMOTE_HOST:$BIN"
}

APP="~/.local/share/football-calendar"
BIN="~/.local/bin/football-calendar"

deploy_infra() {
    user=$(echo "$REMOTE_HOST" | cut -d "@" -f 1)
    
    # Copy GOOGLE_CALENDAR_KEY_FILE to remote
    remote_google_calendar_key_file="$APP/.calendar_keys.json"
    scp "$GOOGLE_CALENDAR_KEY_FILE" "$REMOTE_HOST:${remote_google_calendar_key_file}"

    # Create cronjob fot teamId
    ssh "$REMOTE_HOST" 'sudo bash -s' <<SCRIPT
cat > /etc/cron.d/football-calendar <<EOL
SHELL=/bin/bash
API_FOOTBALL_TOKEN=$API_FOOTBALL_TOKEN
GOOGLE_CALENDAR_KEY_FILE=$remote_google_calendar_key_file
GOOGLE_CALENDAR_ID=$GOOGLE_CALENDAR_ID
LOG=Debug
# Run every monday/wednesday at 10:00 (https://crontab.guru/#0_10_*_*_1)
0 10 * * 1,3 $user bash -lc '$BIN sync' >> $APP/football-calendar-logs.txt 2>&1
EOL
SCRIPT
}

check_mandatory_env_variables API_FOOTBALL_TOKEN GOOGLE_CALENDAR_KEY_FILE GOOGLE_CALENDAR_ID REMOTE_HOST || exit 1
build_app || exit 1
deploy_app || exit 1
deploy_infra || exit 1

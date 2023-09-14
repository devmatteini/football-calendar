# Football Calendar

Automatically sync your google calendar with football matches of your favorite team!

## Installation

```bash
git clone https://github.com/devmatteini/football-calendar.git
cd football-calendar
npm install
```

## Usage

TODO: setup api-football and google project + export environment variables

Search your team id at this page: https://dashboard.api-football.com/soccer/ids/teams

```bash
npm run start -- -t <teamId>
```

### Log level

Export environment variable `LOG_LEVEL` to change the minimum log level.
The possible values are:

-   `Debug`
-   `Info` (default)
-   `Error`

## License

`football-calendar` is made available under the terms of the MIT License.

See the [LICENSE](LICENSE) file for license details.

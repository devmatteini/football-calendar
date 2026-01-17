import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { FootballMatchesRepository } from "./football-matches-repository"
import * as F from "effect/Function"
import * as Array from "effect/Array"
import { FootballCalendar, LeagueRound } from "./football-calendars-config"
import * as Match from "effect/Match"
import { FootballMatch, FootballMatchCalendar } from "./football-match-events"
import * as Config from "effect/Config"
import { Cache } from "./cache"
import * as Schema from "effect/Schema"
import * as O from "effect/Option"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientResponse from "@effect/platform/HttpClientResponse"
import crypto from "node:crypto"
import * as Pretty from "effect/Pretty"
import * as ORD from "effect/Order"
import * as Data from "effect/Data"

type QueryParams = Record<string, string>

class ApiFootballError extends Data.TaggedError("ApiFootballError")<{
    message: string
}> {
    constructor(message: string) {
        super({ message })
    }
}

export const ApiFootballFootballMatchesRepositoryLive = Layer.effect(
    FootballMatchesRepository,
    Effect.gen(function* () {
        const token = yield* Config.string("API_FOOTBALL_TOKEN")
        const cache = yield* Cache
        const baseUrl = "https://v3.football.api-sports.io"
        const httpClient = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk)

        const get = <A, I>(endpoint: string, queryParams: QueryParams, schema: Schema.Schema<A, I>) =>
            Effect.gen(function* () {
                const key = cacheKey(endpoint, queryParams)
                const Body = Response(schema)

                const maybeValue = yield* cache.load(key, Body.fields.response)
                if (O.isSome(maybeValue)) return maybeValue.value

                const response = yield* F.pipe(
                    httpClient.get(new URL(endpoint, baseUrl), {
                        headers: {
                            "x-apisports-key": token,
                        },
                        urlParams: queryParams,
                    }),
                    Effect.flatMap(HttpClientResponse.schemaBodyJson(Body)),
                    Effect.flatMap((data) =>
                        isResponseOk(data)
                            ? Effect.succeed(data.response)
                            : Effect.fail(
                                  new ApiFootballError(
                                      `Response for ${endpoint} failed with ${ResponseErrorPrint(data.errors)}`,
                                  ),
                              ),
                    ),
                    Effect.scoped,
                )

                yield* cache.update(key, Body.fields.response, response)
                return response
            })

        // https://www.api-football.com/documentation-v3#tag/Teams/operation/get-teams-seasons
        const currentSeasonByTeam = (team: number) =>
            F.pipe(
                get("/teams/seasons", { team: team.toString() }, TeamSeason),
                Effect.flatMap(
                    Array.match({
                        onEmpty: () => Effect.fail(new ApiFootballError(`No seasons for team ${team}`)),
                        onNonEmpty: (seasons) => Effect.succeed(Array.max(seasons, ORD.number)),
                    }),
                ),
            )

        const currentSeason = F.pipe(
            Match.type<FootballCalendar>(),
            Match.tag("Team", ({ teamId }) => currentSeasonByTeam(teamId)),
            Match.tag("League", ({ season }) => Effect.succeed(season)),
            Match.exhaustive,
        )

        // https://www.api-football.com/documentation-v3#tag/Fixtures/operation/get-fixtures
        const fixturesByTeam = (team: number, season: number, status: string) =>
            get("/fixtures", { team: team.toString(), season: season.toString(), status }, Fixture)

        // https://www.api-football.com/documentation-v3#tag/Fixtures/operation/get-fixtures
        const fixturesByLeague = (league: number, season: number, status: string) =>
            get("/fixtures", { league: league.toString(), season: season.toString(), status }, Fixture)

        const fixtures = (calendar: FootballCalendar, season: number, status: string) =>
            F.pipe(
                Match.value(calendar),
                Match.tag("Team", ({ teamId }) => fixturesByTeam(teamId, season, status)),
                Match.tag("League", ({ leagueId, round }) =>
                    fixturesByLeague(leagueId, season, status).pipe(Effect.map(Array.filter(byLeagueRound(round)))),
                ),
                Match.exhaustive,
            )

        return {
            loadByFootballCalendar: (calendar) =>
                F.pipe(
                    currentSeason(calendar),
                    Effect.flatMap((currentSeason) => fixtures(calendar, currentSeason, FixtureStatus.scheduled)),
                    Effect.map(Array.map(toFootballMatch(calendar))),
                    Effect.orDie,
                ),
        }
    }),
)

const cacheKey = (endpoint: string, queryParams: QueryParams) => {
    const keyRaw = JSON.stringify({ endpoint, queryParams })
    return crypto.createHash("sha256").update(keyRaw).digest("hex")
}

const byLeagueRound = (round: LeagueRound) => (fixture: ApiFootballFixture) =>
    F.pipe(
        Match.value(round),
        Match.when("All", F.constTrue),
        Match.when("KnockoutStage", () => KnockoutStages.includes(fixture.league.round)),
        Match.when("Final", () => fixture.league.round === Final),
        Match.exhaustive,
    )

const toFootballMatchCalendar = (calendar: FootballCalendar) =>
    F.pipe(
        Match.value(calendar),
        Match.tag("Team", ({ teamId }) => FootballMatchCalendar.make({ origin: "Team", id: teamId })),
        Match.tag("League", ({ leagueId }) => FootballMatchCalendar.make({ origin: "League", id: leagueId })),
        Match.exhaustive,
    )

const toFootballMatch =
    (calendar: FootballCalendar) =>
    ({ fixture, league, teams }: ApiFootballFixture) =>
        FootballMatch.make({
            matchId: fixture.id,
            calendar: toFootballMatchCalendar(calendar),
            date: fixture.date,
            homeTeam: teams.home.name,
            awayTeam: teams.away.name,
            competition: league.name,
        })

const FixtureStatus = {
    scheduled: "TBD-NS" as const,
}

const Final = "Final"

const KnockoutStages = [
    "Knockout Round Play-offs",
    "Round of 16",
    "Quarter-finals",
    "Semi-finals",
    "3rd Place Final",
    "3rd place",
    Final,
]

const TeamSeason = Schema.Number

const FixtureTeam = Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
}).pipe(Schema.annotations({ identifier: "FixtureTeam" }))

const Fixture = Schema.Struct({
    fixture: Schema.Struct({
        id: Schema.Number,
        date: Schema.Date,
    }),
    league: Schema.Struct({
        name: Schema.String,
        round: Schema.String,
    }),
    teams: Schema.Struct({
        home: FixtureTeam,
        away: FixtureTeam,
    }),
}).pipe(Schema.annotations({ identifier: "Fixture" }))
type ApiFootballFixture = typeof Fixture.Type

const ResponseError = Schema.Union(
    Schema.Array(Schema.Unknown),
    Schema.Record({
        key: Schema.String,
        value: Schema.Unknown,
    }),
).pipe(Schema.annotations({ identifier: "ResponseError" }))
type ResponseError = typeof ResponseError.Type

const ResponseErrorPrint = Pretty.make(ResponseError)

const Response = <A, I>(responseItem: Schema.Schema<A, I>) =>
    Schema.Struct({
        errors: ResponseError,
        response: Schema.Array(responseItem),
    }).pipe(Schema.annotations({ identifier: "Response" }))

const isResponseOk = <T extends { errors: ResponseError }>(response: T) =>
    Array.isArray(response.errors) && response.errors.length === 0

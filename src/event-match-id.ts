import * as S from "@effect/schema/Schema"

export const Schema = S.struct({
    matchId: S.NumberFromString,
    teamId: S.NumberFromString,
})
export type EventMatchId = S.Schema.To<typeof Schema>
export type EventMatchIdEncoded = S.Schema.From<typeof Schema>

export const encodeTeam = (teamId: number): Pick<EventMatchIdEncoded, "teamId"> => ({ teamId: teamId.toString() })
export const encode = ({ matchId, teamId }: EventMatchId): EventMatchIdEncoded => ({
    ...encodeTeam(teamId),
    matchId: matchId.toString(),
})

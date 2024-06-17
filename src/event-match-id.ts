import * as S from "@effect/schema/Schema"

export const Schema = S.Struct({
    matchId: S.NumberFromString,
    teamId: S.NumberFromString,
})
export type EventMatchId = typeof Schema.Type
export type EventMatchIdEncoded = typeof Schema.Encoded

export const encodeTeam = (teamId: number): Pick<EventMatchIdEncoded, "teamId"> => ({ teamId: teamId.toString() })
export const encode = ({ matchId, teamId }: EventMatchId): EventMatchIdEncoded => ({
    ...encodeTeam(teamId),
    matchId: matchId.toString(),
})

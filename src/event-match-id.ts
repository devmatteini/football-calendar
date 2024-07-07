import * as S from "@effect/schema/Schema"

export const Schema = S.Struct({
    matchId: S.NumberFromString,
    id: S.NumberFromString,
})
export type EventMatchId = typeof Schema.Type
export type EventMatchIdEncoded = typeof Schema.Encoded

export const encodeId = (id: number): Pick<EventMatchIdEncoded, "id"> => ({ id: id.toString() })
export const encode = ({ matchId, id }: EventMatchId): EventMatchIdEncoded => ({
    ...encodeId(id),
    matchId: matchId.toString(),
})

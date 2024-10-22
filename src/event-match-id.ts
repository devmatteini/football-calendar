import * as S from "effect/Schema"

export const EventMatchId = S.Struct({
    matchId: S.NumberFromString,
    id: S.NumberFromString,
})
export type EventMatchId = typeof EventMatchId.Type
export type EventMatchIdEncoded = typeof EventMatchId.Encoded

export const encodeId = (id: number): Pick<EventMatchIdEncoded, "id"> => ({ id: id.toString() })
export const encode = ({ matchId, id }: EventMatchId): EventMatchIdEncoded => ({
    ...encodeId(id),
    matchId: matchId.toString(),
})

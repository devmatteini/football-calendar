import * as Schema from "effect/Schema"

export const EventMatchId = Schema.Struct({
    matchId: Schema.NumberFromString,
    id: Schema.NumberFromString,
}).pipe(Schema.annotations({ identifier: "EventMatchId" }))
export type EventMatchId = typeof EventMatchId.Type
export type EventMatchIdEncoded = typeof EventMatchId.Encoded

export const encodeId = (id: number): Pick<EventMatchIdEncoded, "id"> => ({ id: id.toString() })
export const encode = ({ matchId, id }: EventMatchId): EventMatchIdEncoded => ({
    ...encodeId(id),
    matchId: matchId.toString(),
})

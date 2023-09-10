import * as E from "@effect/data/Either"
import * as F from "@effect/data/Function"
import * as S from "@effect/schema/Schema"
import { formatErrors } from "@effect/schema/TreeFormatter"

const SEPARATOR = "@"
const IDENTIFIER = "FC"

export type EventMatchId = {
    matchId: number
    teamId: number
}

export const encodeTeam = (teamId: number) => `${IDENTIFIER}${SEPARATOR}${teamId}`
export const encode = ({ matchId, teamId }: EventMatchId) => `${encodeTeam(teamId)}${SEPARATOR}${matchId}`

export const decode = (
    input: string,
): E.Either<DecodeError | WrongIdentifier | MissingTeamId | MissingMatchId, EventMatchId> => {
    if (!input.startsWith(IDENTIFIER)) return E.left(new WrongIdentifier())
    const [_identifier, teamId, matchId] = input.split(SEPARATOR)

    if (!teamId) return E.left(new MissingTeamId())
    if (!matchId) return E.left(new MissingMatchId())

    return E.all({
        teamId: decodeSchema(S.NumberFromString, teamId),
        matchId: decodeSchema(S.NumberFromString, matchId),
    })
}

export class WrongIdentifier {
    readonly _tag = "WrongIdentifier"
}
export class MissingTeamId {
    readonly _tag = "MissingTeamId"
}
export class MissingMatchId {
    readonly _tag = "MissingMatchId"
}
export class DecodeError {
    readonly _tag = "DecodeError"
    constructor(readonly error: string) {}
}

const decodeSchema = <F, T>(schema: S.Schema<F, T>, input: unknown) =>
    F.pipe(
        S.parseEither(schema)(input, { onExcessProperty: "ignore", errors: "all" }),
        E.mapLeft((x) => new DecodeError(formatErrors(x.errors))),
    )

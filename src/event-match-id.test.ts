import { expect, test } from "vitest"
import * as E from "@effect/data/Either"
import { EventMatchId, MissingMatchId, MissingTeamId, WrongIdentifier, decode, encode } from "./event-match-id"

test("encode", () => {
    const result = encode({ teamId: 502, matchId: 1234 })

    expect(result).toEqual("FC-502-1234")
})

test("decode successful", () => {
    const result = decode("FC-502-1234")

    expect(result).toEqual(E.right({ teamId: 502, matchId: 1234 }))
})

test("decode, wrong identifier", () => {
    const result = decode("MYFC-502-1234")

    expect(result).toEqual(E.left(new WrongIdentifier()))
})

test("decode, missing teamId", () => {
    const result = decode("FC--1234")

    expect(result).toEqual(E.left(new MissingTeamId()))
})

test.each(["FC-502-", "FC-502"])("decode, missing matchId - %s", (input) => {
    const result = decode(input)

    expect(result).toEqual(E.left(new MissingMatchId()))
})

test.each(["FC-abc-1234", "FC-502-def"])("decode, matchId or teamId are not numbers (%s)", (input) => {
    const result = decode(input)

    expect(result).toEqual(E.left(expect.objectContaining({ _tag: "DecodeError" })))
})

test("encode then decode", () => {
    const original: EventMatchId = { matchId: 111, teamId: 5678 }

    const result = decode(encode(original))

    expect(result).toEqual(E.right(original))
})

import { expect, test } from "vitest"
import * as Schema from "effect/Schema"
import * as E from "effect/Either"
import { Locale } from "./locale"

const decode = Schema.decodeUnknownEither(Locale)

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#locales_argument
test.each(["it", "en-GB", "de-AT", "zh-Hans-CN"])("valid locale %s", (input) => {
    const result = decode(input)

    expect(result).toEqual(E.right(Locale.make(input)))
})

test.each(["zz", "xx-YY", "english", "abc-123"])("invalid locale %s", (input) => {
    const result = decode(input)

    expect(result).toEqual(E.left(expect.objectContaining({ message: `Unknown locale ${input}` })))
})

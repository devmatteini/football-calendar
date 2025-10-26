import * as Schema from "effect/Schema"
import * as F from "effect/Function"

export const Locale = F.pipe(
    Schema.String,
    Schema.filter((locale) => Intl.DateTimeFormat.supportedLocalesOf(locale).length > 0, {
        message: (locale) => `Unknown locale ${locale.actual}`,
    }),
    Schema.brand("Locale"),
    Schema.annotations({ identifier: "Locale" }),
)
export type Locale = typeof Locale.Type

export const EN_GB = Locale.make("en-GB")

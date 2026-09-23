import type { PluralForms } from './format';
import type { uk } from './uk';

/**
 * The shape of a dictionary, derived from uk.ts.
 * Every text becomes `string`; plural groups become PluralForms (English needs only one/other).
 */
type Shape<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends PluralForms
      ? PluralForms
      : Shape<T[K]>;
};

export type Messages = Shape<typeof uk>;

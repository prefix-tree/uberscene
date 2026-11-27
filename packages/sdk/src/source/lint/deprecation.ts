// What one old spelling is, and how its rows are written. The rows themselves are in `deprecations.ts`, and a kind
// with a folder of its own keeps its rows there (`elements/<kind>/`).
import { RESPELLED_VALUES } from "@uberscene/kit/schema";

/**
 * An old spelling of a prop and what replaced it. The `deprecated-props` rule reports every use and, where the new
 * spelling can be written for certain, carries the fix, so `uberscene lint --fix` moves a file across a breaking
 * release. A release that respells something adds its rows to `DEPRECATIONS`.
 */
export interface Deprecation {
  /** The tag it is on (`"Title"`), or `"*"` for every element and component of the kit. */
  readonly element: string;
  /** The prop, or a dotted path into an object prop (`"animation.preset"`). */
  readonly prop: string;
  readonly to:
    | {
        /** The prop's new name; for a dotted path, the new name of its last key. */
        readonly rename: string;
      }
    | {
        /** The object prop it moved into (`"style"`). */
        readonly into: string;
        /** Its key there; the prop's own name when left out. */
        readonly key?: string;
        /** When `into` already holds a plain value (`style="h1"`), the key that value takes in the object. */
        readonly wrap?: string;
      }
    | {
        /** A value that is spelled another way now. */
        readonly value: { readonly from: string; readonly to: string };
      };
  /**
   * Only where the element's literal `type` is this (`{ type: "shadow" }`), for a prop whose meaning depends on the
   * kind; with `in`, the `type` of the nearest element of that tag it sits in (a `<Keyframe>` inside an `<Effect>`).
   */
  readonly when?: { readonly type: string; readonly in?: string };
  /** The version that changed it. */
  readonly since: string;
  /** A few words more, shown after the message. */
  readonly note?: string;
}

/** The old spellings (`RESPELLED_VALUES`, respelled in camelCase in 0.6) of the values in a list. */
export const oldOf = (values: readonly string[]): string[] =>
  Object.keys(RESPELLED_VALUES).filter((old) => values.includes(RESPELLED_VALUES[old] as string));

/** A row for each old value of a list, at each path that takes it. */
export const respelled = (
  element: string,
  props: readonly string[],
  values: readonly string[],
  when?: Deprecation["when"],
): Deprecation[] =>
  props.flatMap((prop) =>
    values.map(
      (from): Deprecation => ({
        element,
        prop,
        to: { value: { from, to: RESPELLED_VALUES[from] as string } },
        since: "0.6.0",
        ...(when ? { when } : {}),
      }),
    ),
  );

export const rename = (element: string, prop: string, to: string, when?: Deprecation["when"]): Deprecation => ({
  element,
  prop,
  to: { rename: to },
  since: "0.6.0",
  ...(when ? { when } : {}),
});

/** The rows for keys renamed on a tag, from `renamed`: the object each key is in (`""` for the tag's own props), old to new. */
export const renames = (
  element: string,
  renamed: Readonly<Record<string, Readonly<Record<string, string>>>>,
): Deprecation[] =>
  Object.entries(renamed).flatMap(([at, keys]) =>
    Object.entries(keys).map(([from, to]) => rename(element, at ? `${at}.${from}` : from, to)),
  );

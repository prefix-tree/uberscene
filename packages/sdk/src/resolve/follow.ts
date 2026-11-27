// `follow`: an overlay that moves with another. The one accessor every reader of the prop goes through.
import { kindsWithProp } from "@uberscene/kit/schema";

/** The kinds that take a `follow`, and the kinds one may follow: the overlays. */
export const FOLLOW_KINDS: ReadonlySet<string> = new Set(kindsWithProp("follow"));

/** The id an element follows (its `follow` prop), if it names one. */
export function followOf(p: { readonly props: Readonly<Record<string, unknown>> }): string | undefined {
  return typeof p.props.follow === "string" ? p.props.follow : undefined;
}

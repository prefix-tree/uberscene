// `follow`: an overlay that moves with another. The one accessor every reader of the prop goes through. Who may
// follow whom, and what is wrong with a follow, is the `follow` entry of the reference kinds (`./refs`).

/** The id an element follows (its `follow` prop), if it names one. */
export function followOf(p: { readonly props: Readonly<Record<string, unknown>> }): string | undefined {
  return typeof p.props.follow === "string" ? p.props.follow : undefined;
}

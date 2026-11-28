// What every transition type takes: its params by type, and their defaults. A transition's schema is in its folder.
import { TRANSITION_PARAMS } from "../../effects/registry";
import { TRANSITION_TYPES, type TransitionType } from "../enums";

/** Per-type parameter schemas, with defaults that validate: the registry's. */
export { TRANSITION_PARAMS };

export function isBuiltInTransition(type: string): type is TransitionType {
  return (TRANSITION_TYPES as readonly string[]).includes(type);
}

export function defaultTransitionParams(type: TransitionType): Record<string, unknown> {
  return TRANSITION_PARAMS[type].parse({}) as Record<string, unknown>;
}

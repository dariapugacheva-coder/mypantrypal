/** One-shot navigation intents, e.g. "open Cook focused on spinach". Works with both routers. */
export type Intent =
  | { type: "cook-with"; key: string; name: string }
  | { type: "fridge-add" }
  | { type: "fridge-scan" }
  | { type: "shop-receipt" };

let pending: Intent | null = null;
export const setIntent = (i: Intent) => { pending = i; };
export function takeIntent<T extends Intent["type"]>(type: T): Extract<Intent, { type: T }> | null {
  if (pending?.type === type) { const i = pending as Extract<Intent, { type: T }>; pending = null; return i; }
  return null;
}

/** Each run-specific value found in a call, and the placeholder that stands for it. */
export type Bindings = Map<string, string>;

/**
 * Replaces every match of each variable's pattern with a numbered placeholder, the same value
 * with the same placeholder. Placeholders are numbered in order of first appearance, so two
 * calls that differ only in those values give the same text.
 */
export function bindVariables(json: string, variables: Record<string, RegExp>): { json: string; bindings: Bindings } {
  const bindings: Bindings = new Map();

  for (const [name, pattern] of Object.entries(variables)) {
    let count = 0;
    json = json.replace(globally(pattern), (value) => {
      let placeholder = bindings.get(value);
      if (!placeholder) {
        count += 1;
        placeholder = `«${name}:${count}»`;
        bindings.set(value, placeholder);
      }
      return placeholder;
    });
  }

  return { json, bindings };
}

/** Puts each bound value's placeholder in its place, the longest value first. */
export function toPlaceholders(json: string, bindings: Bindings): string {
  const longestFirst = [...bindings].sort(([a], [b]) => b.length - a.length);
  return longestFirst.reduce((text, [value, placeholder]) => text.split(value).join(placeholder), json);
}

/** Puts each bound value back in place of its placeholder. */
export function fromPlaceholders(json: string, bindings: Bindings): string {
  return [...bindings].reduce((text, [value, placeholder]) => text.split(placeholder).join(value), json);
}

function globally(pattern: RegExp): RegExp {
  return pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
}

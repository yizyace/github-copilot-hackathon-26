/**
 * Pulls a JSON blob out of a raw LLM response.
 *
 * Handles three shapes, in order of preference:
 *   1. A fenced ```json … ``` (or bare ``` … ```) block.
 *   2. The first balanced-looking JSON value — object `{…}` or array `[…]`.
 *   3. The trimmed input as-is (last resort; let the caller's JSON.parse fail loudly).
 */
export function extractJson(raw: string): string {
  const trimmed = raw.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const firstObj = trimmed.indexOf('{');
  const firstArr = trimmed.indexOf('[');
  const starts   = [firstObj, firstArr].filter(i => i !== -1);
  if (starts.length === 0) return trimmed;

  const start = Math.min(...starts);
  const close = trimmed[start] === '{' ? '}' : ']';
  const end   = trimmed.lastIndexOf(close);

  return end > start ? trimmed.slice(start, end + 1) : trimmed;
}

/**
 * Sanitize strings containing isolated Unicode surrogates.
 *
 * Isolated surrogates (unpaired high or low surrogate code units) are technically
 * invalid Unicode. They can appear in OmniFocus data — for example when a task name
 * or note contains a broken or partially-pasted emoji. Both JSON.stringify and the
 * Anthropic API JSON parser throw on isolated surrogates, causing tool calls to fail
 * with a 400 "no low surrogate in string" error.
 *
 * This module strips isolated surrogates so the data remains readable and safe to
 * serialize. Valid surrogate pairs (i.e. normal emoji such as 🚨) are preserved.
 */

/**
 * Remove isolated high/low surrogates from a string.
 * Valid surrogate pairs (e.g. emoji 🚨) are left intact.
 */
export function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  return str
    // Isolated high surrogate: not followed by a low surrogate
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    // Isolated low surrogate: not preceded by a high surrogate
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
}

/**
 * Recursively sanitize all string values in any JS value (string, array, object).
 * Primitives other than strings are returned unchanged.
 */
export function sanitizeForJson(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeForJson);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as object)) {
      result[key] = sanitizeForJson((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

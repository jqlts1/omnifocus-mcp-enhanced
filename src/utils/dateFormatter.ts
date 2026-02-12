/**
 * Utility functions for date formatting
 */

/**
 * Convert an input date string to an AppleScript-compatible, locale-independent
 * YYYY-MM-DD value.
 *
 * AppleScript parses ISO-like YYYY-MM-DD reliably across system locales.
 * English month names (e.g. "31 December 2026") can fail on non-English systems.
 *
 * @param isoDate ISO date string (e.g., "2026-01-09" or "2026-01-09T12:00:00")
 * @returns AppleScript-compatible date string (e.g., "2026-01-09")
 * @throws Error if the date string is invalid
 */
export function formatDateForAppleScript(isoDate: string): string {
  if (!isoDate || isoDate.trim() === '') {
    throw new Error('Date string cannot be empty');
  }

  const trimmed = isoDate.trim();
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);

  // Preserve explicit YYYY-MM-DD values as-is, with calendar validation.
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    const validator = new Date(year, month - 1, day);

    if (
      validator.getFullYear() !== year ||
      validator.getMonth() !== month - 1 ||
      validator.getDate() !== day
    ) {
      throw new Error(`Invalid date string: ${isoDate}`);
    }

    return `${y}-${m}-${d}`;
  }

  // Fallback for full ISO timestamps or other Date-parseable inputs.
  const date = new Date(trimmed);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${isoDate}`);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

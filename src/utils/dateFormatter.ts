/**
 * Utility functions for date formatting
 */

const APPLE_SCRIPT_VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

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

/**
 * Build AppleScript code that constructs a Date from numeric components.
 *
 * This avoids locale-dependent parsing (e.g. `date "28 February 2026"`) and
 * should be inserted before any `tell application "OmniFocus"` block to avoid
 * property name collisions with OmniFocus terms.
 *
 * @param isoDate Date string accepted by `formatDateForAppleScript`
 * @param variableName Target AppleScript variable name (e.g. "dueDateValue")
 * @returns AppleScript statements for creating a date variable
 */
export function appleScriptDateCode(isoDate: string, variableName: string): string {
  if (!APPLE_SCRIPT_VARIABLE_NAME_PATTERN.test(variableName)) {
    throw new Error(`Invalid AppleScript variable name: ${variableName}`);
  }

  const normalizedDate = formatDateForAppleScript(isoDate);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedDate);

  if (!match) {
    throw new Error(`Failed to normalize date string: ${isoDate}`);
  }

  const [, year, month, day] = match;

  // Preserve the wall-clock time when the ISO input includes one, reading the
  // hour/minute/second straight from the string exactly as the date components
  // above are read. The time is taken verbatim, with no timezone conversion, so
  // it stays consistent with the locale-independent date construction; any
  // offset or "Z" suffix is ignored. Date-only input keeps hours/minutes/seconds
  // at zero (midnight), leaving the original behavior untouched.
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  const timeMatch = /T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(isoDate.trim());
  if (timeMatch) {
    const parsedHours = Number(timeMatch[1]);
    const parsedMinutes = Number(timeMatch[2]);
    const parsedSeconds = timeMatch[3] ? Number(timeMatch[3]) : 0;
    if (parsedHours <= 23 && parsedMinutes <= 59 && parsedSeconds <= 59) {
      hours = parsedHours;
      minutes = parsedMinutes;
      seconds = parsedSeconds;
    }
  }

  return `
    set ${variableName} to current date
    set day of ${variableName} to 1
    set year of ${variableName} to ${Number(year)}
    set month of ${variableName} to ${Number(month)}
    set day of ${variableName} to ${Number(day)}
    set hours of ${variableName} to ${hours}
    set minutes of ${variableName} to ${minutes}
    set seconds of ${variableName} to ${seconds}`;
}

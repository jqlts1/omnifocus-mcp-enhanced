/**
 * Utility functions for date formatting
 */

/**
 * Convert ISO date string (YYYY-MM-DD or full ISO format) to AppleScript-compatible format
 *
 * @deprecated Use generateAppleScriptDateCode instead for locale-independent date handling
 * 
 * AppleScript expects dates in the format "D Month YYYY" (e.g., "9 January 2026")
 * ISO format (YYYY-MM-DD) is incorrectly parsed by AppleScript's date command
 * 
 * WARNING: This function is locale-dependent and may fail on non-English systems.
 *
 * @param isoDate ISO date string (e.g., "2026-01-09" or "2026-01-09T12:00:00")
 * @returns AppleScript-compatible date string (e.g., "9 January 2026")
 * @throws Error if the date string is invalid
 */
export function formatDateForAppleScript(isoDate: string): string {
	if (!isoDate || isoDate.trim() === '') {
		throw new Error('Date string cannot be empty');
	}

	// Parse the ISO date string
	const date = new Date(isoDate);

	// Check if the date is valid
	if (isNaN(date.getTime())) {
		throw new Error(`Invalid date string: ${isoDate}`);
	}

	// English month names (AppleScript requires English regardless of system locale)
	const months = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const day = date.getDate();
	const month = months[date.getMonth()];
	const year = date.getFullYear();

	return `${day} ${month} ${year}`;
}

/**
 * Parse an ISO date string and return its components
 * 
 * @param isoDate ISO date string (e.g., "2026-01-09" or "2026-01-09T12:00:00")
 * @returns Object with year, month (1-12), day, hours, minutes, seconds
 * @throws Error if the date string is invalid
 */
export function parseDateComponents(isoDate: string): {
	year: number;
	month: number;
	day: number;
	hours: number;
	minutes: number;
	seconds: number;
} {
	if (!isoDate || isoDate.trim() === '') {
		throw new Error('Date string cannot be empty');
	}

	// Parse the ISO date string
	const date = new Date(isoDate);

	// Check if the date is valid
	if (isNaN(date.getTime())) {
		throw new Error(`Invalid date string: ${isoDate}`);
	}

	return {
		year: date.getFullYear(),
		month: date.getMonth() + 1, // JavaScript months are 0-indexed, AppleScript uses 1-12
		day: date.getDate(),
		hours: date.getHours(),
		minutes: date.getMinutes(),
		seconds: date.getSeconds()
	};
}

/**
 * Generate AppleScript code to construct a date object in a locale-independent way
 * 
 * This approach uses date arithmetic instead of string parsing, which works
 * regardless of the user's system locale settings.
 * 
 * @param isoDate ISO date string (e.g., "2026-01-09" or "2026-01-09T17:30:00")
 * @param variableName The AppleScript variable name to assign the date to
 * @returns AppleScript code that creates the date object
 * @throws Error if the date string is invalid
 * 
 * @example
 * // Returns AppleScript code like:
 * // set theDueDate to (current date)
 * // set year of theDueDate to 2026
 * // set month of theDueDate to 1
 * // set day of theDueDate to 29
 * // set hours of theDueDate to 17
 * // set minutes of theDueDate to 30
 * // set seconds of theDueDate to 0
 * generateAppleScriptDateCode("2026-01-29T17:30:00", "theDueDate")
 */
export function generateAppleScriptDateCode(isoDate: string, variableName: string): string {
	const components = parseDateComponents(isoDate);
	
	return `set ${variableName} to (current date)
          set year of ${variableName} to ${components.year}
          set month of ${variableName} to ${components.month}
          set day of ${variableName} to ${components.day}
          set hours of ${variableName} to ${components.hours}
          set minutes of ${variableName} to ${components.minutes}
          set seconds of ${variableName} to ${components.seconds}`;
}

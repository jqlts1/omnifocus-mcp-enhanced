/**
 * Utility functions for date formatting
 */

/**
 * Convert ISO date string (YYYY-MM-DD or full ISO format) to AppleScript-compatible format
 *
 * AppleScript expects dates in the format "D Month YYYY" (e.g., "9 January 2026")
 * ISO format (YYYY-MM-DD) is incorrectly parsed by AppleScript's date command
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

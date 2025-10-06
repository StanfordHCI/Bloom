import { Timestamp } from "firebase/firestore";
import { DateTime } from "luxon";

export class DateTimeUtils {
  /**
   * Gets the current date-time in ISO 8601 format in UTC.
   * @returns {string} - The current UTC date-time as an ISO string.
   */
  public static getCurrentUTCDateTime(): string {
    return DateTime.utc().toFormat("yyyy-MM-dd'T'HH:mm:ssZZ");
  }

  public static getCurrentLocalDateTime(): string {
    return DateTime.local().toISO();
  }

  /**
   * Converts a JavaScript Date object or an ISO date string to a Firestore Timestamp.
   * @param {Date | string} date - The date to convert.
   * @returns {Timestamp} - The Firestore Timestamp.
   */
  public static convertToTimestamp(date: Date | string): Timestamp {
    if (date instanceof Date) {
      return Timestamp.fromDate(date);
    } else if (typeof date === "string" && DateTimeUtils.isISO8601(date)) {
      return Timestamp.fromDate(new Date(date));
    } else {
      throw new Error(
        "Invalid date input. Expected a Date object or ISO string."
      );
    }
  }

  /**
   * Validates if a string is a valid ISO 8601 date string.
   * @param {string} dateStr - The string to check.
   * @returns {boolean} - True if the string is valid, false otherwise.
   */
  private static isISO8601(dateStr: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
    return regex.test(dateStr);
  }

  /**
   * Converts UTC ISO 8601 string to local time string.
   * @param {string} isoString - ISO 8601 string in UTC.
   * @returns {string} - Local time string.
   */
  public static convertToLocalTime(isoString: string): string {
    return DateTime.fromISO(isoString).toLocal().toString();
  }

  /**
   * Formats a date as month-day-year.
   * @param {Date | string} date - The date to format.
   * @returns {string} - The formatted date string.
   */
  public static formatDateToMDY(date: Date | string): string {
    const dt =
      typeof date === "string"
        ? DateTime.fromISO(date)
        : DateTime.fromJSDate(date);
    return dt.toFormat("MM-dd-yyyy");
  }

  /**
   * Gets the Sunday and Saturday of the week for a given reference date.
   * @param {Date} referenceDate - The reference date.
   * @returns {Object} - An object with the Sunday and Saturday dates.
   */
  public static getSundayAndSaturday(referenceDate: Date): {
    sunday: Date;
    saturday: Date;
  } {
    const dayOfWeek = referenceDate.getDay(); // Sunday = 0, Saturday = 6
    const sunday = new Date(referenceDate);
    sunday.setHours(0, 0, 0, 0);
    sunday.setDate(sunday.getDate() - dayOfWeek);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(0, 0, 0, 0);

    return { sunday, saturday };
  }
}

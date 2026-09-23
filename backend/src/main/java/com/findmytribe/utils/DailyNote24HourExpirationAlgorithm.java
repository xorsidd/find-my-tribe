package com.findmytribe.utils;

/**
 * DailyNote24HourExpirationAlgorithm
 * 
 * Enforces a strict 24-hour expiration rule (86,400,000 milliseconds) for daily status notes.
 * Automatically validates if a note is active or expired.
 */
public class DailyNote24HourExpirationAlgorithm {

    public static final long TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000L; // 86,400,000 ms

    public static boolean isDailyNoteActive(Long timestamp) {
        if (timestamp == null || timestamp <= 0) {
            return false;
        }
        long currentTime = System.currentTimeMillis();
        long age = currentTime - timestamp;
        return age >= 0 && age <= TWENTY_FOUR_HOURS_MS;
    }

    public static long getRemainingTimeMs(Long timestamp) {
        if (!isDailyNoteActive(timestamp)) {
            return 0L;
        }
        long age = System.currentTimeMillis() - timestamp;
        return Math.max(0L, TWENTY_FOUR_HOURS_MS - age);
    }
}

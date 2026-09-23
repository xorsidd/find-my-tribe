package com.findmytribe.utils;

import com.findmytribe.models.User;

/**
 * ReputationPointCalculationAlgorithm
 * 
 * Computes dynamic user reputation points based on real-time academic actions:
 * - Joined Tribes: +10 points per tribe
 * - Discussion Posts: +15 points per post
 * - Logged Study Hours: +25 points per completed hour
 * - Important Pinned Community Messages: +20 points per pinned message
 * - Active 24-Hour Daily Status Note: +5 bonus points
 */
public class ReputationPointCalculationAlgorithm {

    public static final int PTS_PER_TRIBE = 10;
    public static final int PTS_PER_POST = 15;
    public static final int PTS_PER_STUDY_HOUR = 25;
    public static final int PTS_PER_PINNED_MSG = 20;
    public static final int PTS_DAILY_NOTE_BONUS = 5;

    public static int calculateReputationPoints(User user) {
        if (user == null) return 0;

        int tribePoints = (user.getJoinedCommunities() != null ? user.getJoinedCommunities().size() : 0) * PTS_PER_TRIBE;
        int postPoints = user.getDiscussionPostsCount() * PTS_PER_POST;
        int studyPoints = (int) (user.getStudyHours() * PTS_PER_STUDY_HOUR);
        int pinnedPoints = user.getPinnedMessagesCount() * PTS_PER_PINNED_MSG;
        
        int dailyNoteBonus = 0;
        if (DailyNote24HourExpirationAlgorithm.isDailyNoteActive(user.getDailyNoteTimestamp())) {
            dailyNoteBonus = PTS_DAILY_NOTE_BONUS;
        }

        return tribePoints + postPoints + studyPoints + pinnedPoints + dailyNoteBonus;
    }
}

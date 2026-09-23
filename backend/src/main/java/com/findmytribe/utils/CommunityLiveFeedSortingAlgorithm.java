package com.findmytribe.utils;

import com.findmytribe.models.Message;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * CommunityLiveFeedSortingAlgorithm
 * 
 * Filters live feed messages based strictly on the user's joined communities,
 * and sorts the feed prioritizing Pinned Messages first, followed by newest messages.
 */
public class CommunityLiveFeedSortingAlgorithm {

    public static List<Message> filterAndSortLiveFeed(List<Message> allMessages, List<String> joinedCommunities) {
        if (allMessages == null || allMessages.isEmpty()) {
            return new ArrayList<>();
        }

        // Filter messages belonging to user's joined communities (or general public feed)
        List<Message> userFeed = allMessages.stream()
                .filter(msg -> msg.getCommunityName() == null || 
                               joinedCommunities == null || 
                               joinedCommunities.isEmpty() || 
                               joinedCommunities.contains(msg.getCommunityName()))
                .collect(Collectors.toList());

        // Sort algorithm: Pinned messages first (true > false), then by timestamp descending
        userFeed.sort((m1, m2) -> {
            if (m1.isPinned() != m2.isPinned()) {
                return m1.isPinned() ? -1 : 1; // Pinned messages come first
            }
            Long t1 = m1.getTimestamp() != null ? m1.getTimestamp() : 0L;
            Long t2 = m2.getTimestamp() != null ? m2.getTimestamp() : 0L;
            return t2.compareTo(t1); // Descending order of timestamp
        });

        return userFeed;
    }
}

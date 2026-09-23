package com.findmytribe.utils;

import com.findmytribe.models.Community;
import java.util.Comparator;
import java.util.List;

/**
 * CommunityBinarySearchAlgorithm
 * 
 * Provides O(log N) binary search for communities after O(N log N) sorting.
 */
public class CommunityBinarySearchAlgorithm {

    public static void sortCommunitiesByName(List<Community> communities) {
        if (communities != null) {
            communities.sort(Comparator.comparing(Community::getCommunityName, String.CASE_INSENSITIVE_ORDER));
        }
    }

    public static Community binarySearchCommunities(List<Community> sortedCommunities, String searchName) {
        if (sortedCommunities == null || searchName == null || searchName.isEmpty()) {
            return null;
        }

        int low = 0;
        int high = sortedCommunities.size() - 1;

        while (low <= high) {
            int mid = (low + high) >>> 1;
            Community midCommunity = sortedCommunities.get(mid);
            int cmp = midCommunity.getCommunityName().compareToIgnoreCase(searchName);

            if (cmp < 0) {
                low = mid + 1;
            } else if (cmp > 0) {
                high = mid - 1;
            } else {
                return midCommunity; // Found exact match
            }
        }
        return null; // Not found
    }
}

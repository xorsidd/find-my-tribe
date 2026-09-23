package com.findmytribe.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;

@Document(collection = "Users")
public class User {

    @Id
    private String id;
    private String username;
    private String email;
    private String password;
    private String profilePicture = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop";
    private String bio = "Passionate student, learner, and tribe community member!";
    private String language = "en";
    private List<String> joinedCommunities = new ArrayList<>();
    private String role = "USER";
    private Map<String, Boolean> settings = new HashMap<>();

    // Real-Time Action-Based User Statistics
    private double studyHours = 0.0;
    private int discussionPostsCount = 0;
    private int reputationPoints = 0;
    private int pinnedMessagesCount = 0;

    // 24-Hour Daily Status Note (Max 100 characters)
    private String dailyNote = "";
    private Long dailyNoteTimestamp = 0L;

    public User() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getProfilePicture() {
        return profilePicture;
    }

    public void setProfilePicture(String profilePicture) {
        this.profilePicture = profilePicture;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public List<String> getJoinedCommunities() {
        if (joinedCommunities == null) {
            joinedCommunities = new ArrayList<>();
        }
        return joinedCommunities;
    }

    public void setJoinedCommunities(List<String> joinedCommunities) {
        this.joinedCommunities = joinedCommunities;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Map<String, Boolean> getSettings() {
        if (settings == null) {
            settings = new HashMap<>();
        }
        return settings;
    }

    public void setSettings(Map<String, Boolean> settings) {
        this.settings = settings;
    }

    public double getStudyHours() {
        return studyHours;
    }

    public void setStudyHours(double studyHours) {
        this.studyHours = studyHours;
    }

    public int getDiscussionPostsCount() {
        return discussionPostsCount;
    }

    public void setDiscussionPostsCount(int discussionPostsCount) {
        this.discussionPostsCount = discussionPostsCount;
    }

    public int getReputationPoints() {
        return reputationPoints;
    }

    public void setReputationPoints(int reputationPoints) {
        this.reputationPoints = reputationPoints;
    }

    public int getPinnedMessagesCount() {
        return pinnedMessagesCount;
    }

    public void setPinnedMessagesCount(int pinnedMessagesCount) {
        this.pinnedMessagesCount = pinnedMessagesCount;
    }

    public String getDailyNote() {
        return dailyNote;
    }

    public void setDailyNote(String dailyNote) {
        this.dailyNote = dailyNote;
    }

    public Long getDailyNoteTimestamp() {
        return dailyNoteTimestamp;
    }

    public void setDailyNoteTimestamp(Long dailyNoteTimestamp) {
        this.dailyNoteTimestamp = dailyNoteTimestamp;
    }
}

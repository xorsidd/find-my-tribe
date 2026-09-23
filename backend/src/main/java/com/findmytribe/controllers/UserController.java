package com.findmytribe.controllers;

import com.findmytribe.models.User;
import com.findmytribe.repositories.UserRepository;
import com.findmytribe.utils.DailyNote24HourExpirationAlgorithm;
import com.findmytribe.utils.ReputationPointCalculationAlgorithm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin("*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Optional<User> findUserByIdOrUsername(String idOrUsername) {
        if (idOrUsername == null || idOrUsername.trim().isEmpty()) {
            return Optional.empty();
        }
        String clean = idOrUsername.trim();
        Optional<User> user = Optional.empty();
        if (clean.length() == 24 && clean.matches("^[0-9a-fA-F]{24}$")) {
            user = userRepository.findById(clean);
        }
        if (!user.isPresent()) {
            user = userRepository.findByUsernameIgnoreCase(clean);
        }
        if (!user.isPresent()) {
            user = userRepository.findByEmailIgnoreCase(clean);
        }
        return user;
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserProfile(@PathVariable String id) {
        return findUserByIdOrUsername(id).map(user -> {
            // Check 24-hour daily note expiration
            if (!DailyNote24HourExpirationAlgorithm.isDailyNoteActive(user.getDailyNoteTimestamp())) {
                user.setDailyNote("");
            }
            // Recalculate dynamic reputation points
            user.setReputationPoints(ReputationPointCalculationAlgorithm.calculateReputationPoints(user));
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUserProfile(@PathVariable String id, @RequestBody User updatedUser) {
        return findUserByIdOrUsername(id).map(user -> {
            if (updatedUser.getUsername() != null && !updatedUser.getUsername().trim().isEmpty()) {
                user.setUsername(updatedUser.getUsername().trim());
            }
            if (updatedUser.getBio() != null) user.setBio(updatedUser.getBio());
            if (updatedUser.getProfilePicture() != null) user.setProfilePicture(updatedUser.getProfilePicture());
            if (updatedUser.getLanguage() != null) user.setLanguage(updatedUser.getLanguage());
            if (updatedUser.getSettings() != null) user.setSettings(updatedUser.getSettings());
            
            user.setReputationPoints(ReputationPointCalculationAlgorithm.calculateReputationPoints(user));
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/daily-note")
    public ResponseEntity<?> updateDailyNote(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String note = payload.get("note");
        if (note == null) note = "";

        // Enforce strict 100-character limit requirement
        if (note.length() > 100) {
            return ResponseEntity.badRequest().body("Daily note must not exceed 100 characters");
        }

        final String finalNote = note.trim();
        return findUserByIdOrUsername(id).map(user -> {
            user.setDailyNote(finalNote);
            user.setDailyNoteTimestamp(System.currentTimeMillis());
            user.setReputationPoints(ReputationPointCalculationAlgorithm.calculateReputationPoints(user));
            User saved = userRepository.save(user);

            Map<String, Object> res = new HashMap<>();
            res.put("user", saved);
            res.put("remainingTimeMs", DailyNote24HourExpirationAlgorithm.getRemainingTimeMs(saved.getDailyNoteTimestamp()));
            return ResponseEntity.ok(res);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/study-hours")
    public ResponseEntity<?> addStudyHours(@PathVariable String id, @RequestBody Map<String, Double> payload) {
        Double addedHours = payload.get("hours");
        if (addedHours == null || addedHours <= 0) {
            return ResponseEntity.badRequest().body("Invalid study hours");
        }

        return findUserByIdOrUsername(id).map(user -> {
            user.setStudyHours(user.getStudyHours() + addedHours);
            user.setReputationPoints(ReputationPointCalculationAlgorithm.calculateReputationPoints(user));
            return ResponseEntity.ok(userRepository.save(user));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/reputation-breakdown")
    public ResponseEntity<?> getReputationBreakdown(@PathVariable String id) {
        return findUserByIdOrUsername(id).map(user -> {
            Map<String, Object> breakdown = new HashMap<>();
            int joinedTribesCount = user.getJoinedCommunities() != null ? user.getJoinedCommunities().size() : 0;
            boolean hasActiveNote = DailyNote24HourExpirationAlgorithm.isDailyNoteActive(user.getDailyNoteTimestamp());

            breakdown.put("joinedTribesPoints", joinedTribesCount * ReputationPointCalculationAlgorithm.PTS_PER_TRIBE);
            breakdown.put("discussionPostsPoints", user.getDiscussionPostsCount() * ReputationPointCalculationAlgorithm.PTS_PER_POST);
            breakdown.put("studyHoursPoints", (int) (user.getStudyHours() * ReputationPointCalculationAlgorithm.PTS_PER_STUDY_HOUR));
            breakdown.put("pinnedMessagesPoints", user.getPinnedMessagesCount() * ReputationPointCalculationAlgorithm.PTS_PER_PINNED_MSG);
            breakdown.put("dailyNoteBonus", hasActiveNote ? ReputationPointCalculationAlgorithm.PTS_DAILY_NOTE_BONUS : 0);
            breakdown.put("totalReputationPoints", ReputationPointCalculationAlgorithm.calculateReputationPoints(user));
            breakdown.put("rules", Map.of(
                "perTribe", ReputationPointCalculationAlgorithm.PTS_PER_TRIBE,
                "perPost", ReputationPointCalculationAlgorithm.PTS_PER_POST,
                "perStudyHour", ReputationPointCalculationAlgorithm.PTS_PER_STUDY_HOUR,
                "perPinnedMsg", ReputationPointCalculationAlgorithm.PTS_PER_PINNED_MSG,
                "dailyNoteBonus", ReputationPointCalculationAlgorithm.PTS_DAILY_NOTE_BONUS
            ));

            return ResponseEntity.ok(breakdown);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<?> changePassword(@PathVariable String id, @RequestBody Map<String, String> passwords) {
        String oldPassword = passwords.get("oldPassword");
        String newPassword = passwords.get("newPassword");

        if (oldPassword == null || newPassword == null || newPassword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Old password and new password are required");
        }

        return findUserByIdOrUsername(id).map(user -> {
            if (passwordEncoder.matches(oldPassword, user.getPassword())) {
                user.setPassword(passwordEncoder.encode(newPassword.trim()));
                userRepository.save(user);
                return ResponseEntity.ok("Password updated successfully in MongoDB database!");
            }
            return ResponseEntity.badRequest().body("Incorrect old password");
        }).orElse(ResponseEntity.status(404).body("User not found"));
    }
}



package com.findmytribe.controllers;

import com.findmytribe.models.Community;
import com.findmytribe.models.Message;
import com.findmytribe.models.User;
import com.findmytribe.repositories.CommunityRepository;
import com.findmytribe.repositories.MessageRepository;
import com.findmytribe.repositories.UserRepository;
import com.findmytribe.utils.CommunityBinarySearchAlgorithm;
import com.findmytribe.utils.CommunityLiveFeedSortingAlgorithm;
import com.findmytribe.utils.ReputationPointCalculationAlgorithm;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@RestController
@RequestMapping("/api/communities")
@CrossOrigin("*")
public class CommunityController {

    @Autowired
    private CommunityRepository communityRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    private Optional<User> findUserByIdOrUsername(String idOrUsername) {
        if (idOrUsername == null || idOrUsername.trim().isEmpty()) return Optional.empty();
        String clean = idOrUsername.trim();
        Optional<User> u = Optional.empty();
        if (clean.length() == 24 && clean.matches("^[0-9a-fA-F]{24}$")) {
            u = userRepository.findById(clean);
        }
        if (!u.isPresent()) u = userRepository.findByUsernameIgnoreCase(clean);
        if (!u.isPresent()) u = userRepository.findByEmailIgnoreCase(clean);
        return u;
    }


    @GetMapping
    public ResponseEntity<List<Community>> getAllCommunities() {
        return ResponseEntity.ok(communityRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Community> createCommunity(@RequestBody Community community) {
        return ResponseEntity.ok(communityRepository.save(community));
    }

    @GetMapping("/search")
    public ResponseEntity<Community> searchCommunity(@RequestParam String name) {
        List<Community> communities = communityRepository.findAll();
        
        CommunityBinarySearchAlgorithm.sortCommunitiesByName(communities);
        Community found = CommunityBinarySearchAlgorithm.binarySearchCommunities(communities, name);
        
        if (found != null) {
            return ResponseEntity.ok(found);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<?> joinCommunity(@PathVariable String id, @RequestParam String userId) {
        String communityName = id;
        Optional<Community> optCommunity = communityRepository.findById(id);
        Community community = null;

        if (optCommunity.isPresent()) {
            community = optCommunity.get();
            communityName = community.getCommunityName() != null ? community.getCommunityName() : id;
        } else {
            Optional<Community> optByName = communityRepository.findByCommunityName(id);
            if (optByName.isPresent()) {
                community = optByName.get();
                communityName = community.getCommunityName();
            } else {
                community = new Community();
                community.setCommunityName(id);
                community.setCategory("Academic & Professional");
                community.getMembers().add(userId);
                community = communityRepository.save(community);
                communityName = id;
            }
        }

        if (community != null && !community.getMembers().contains(userId)) {
            community.getMembers().add(userId);
            communityRepository.save(community);
        }

        Optional<User> optUser = findUserByIdOrUsername(userId);

        if (optUser.isPresent()) {
            User user = optUser.get();
            if (!user.getJoinedCommunities().contains(communityName)) {
                user.getJoinedCommunities().add(communityName);
            }
            user.setReputationPoints(ReputationPointCalculationAlgorithm.calculateReputationPoints(user));
            User savedUser = userRepository.save(user);
            return ResponseEntity.ok(savedUser);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "Joined community " + communityName);
        resp.put("communityName", communityName);
        resp.put("joinedCommunities", java.util.Collections.singletonList(communityName));
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<?> leaveCommunity(@PathVariable String id, @RequestParam String userId) {
        String communityName = id;
        Optional<Community> optCommunity = communityRepository.findById(id);
        if (optCommunity.isPresent()) {
            Community community = optCommunity.get();
            community.getMembers().remove(userId);
            communityRepository.save(community);
            communityName = community.getCommunityName() != null ? community.getCommunityName() : id;
        }

        Optional<User> optUser = findUserByIdOrUsername(userId);

        if (optUser.isPresent()) {
            User user = optUser.get();
            user.getJoinedCommunities().remove(communityName);
            user.getJoinedCommunities().remove(id);
            user.setReputationPoints(ReputationPointCalculationAlgorithm.calculateReputationPoints(user));
            User savedUser = userRepository.save(user);
            return ResponseEntity.ok(savedUser);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "Left community successfully");
        resp.put("joinedCommunities", new java.util.ArrayList<String>());
        return ResponseEntity.ok(resp);
    }

    // Community Messages & Pinning Endpoints
    @GetMapping("/messages/{communityName}")
    public ResponseEntity<List<Message>> getCommunityMessages(@PathVariable String communityName) {
        List<Message> messages = messageRepository.findByCommunityNameOrderByTimestampDesc(communityName);
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/messages")
    public ResponseEntity<?> postCommunityMessage(@RequestBody Message message) {
        if (message.getTimestamp() == null) {
            message.setTimestamp(System.currentTimeMillis());
        }
        Message saved = messageRepository.save(message);

        // Update user stats & reputation
        if (message.getSenderId() != null || message.getSender() != null) {
            String identifier = message.getSenderId() != null ? message.getSenderId() : message.getSender();
            Optional<User> optUser = findUserByIdOrUsername(identifier);
            if (optUser.isPresent()) {
                User user = optUser.get();
                user.setDiscussionPostsCount(user.getDiscussionPostsCount() + 1);
                if (message.isPinned()) {
                    user.setPinnedMessagesCount(user.getPinnedMessagesCount() + 1);
                }
                user.setReputationPoints(ReputationPointCalculationAlgorithm.calculateReputationPoints(user));
                userRepository.save(user);
            }
        }

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/messages/{messageId}/pin")
    public ResponseEntity<?> togglePinMessage(@PathVariable String messageId, @RequestParam String userId) {
        Optional<Message> optMsg = messageRepository.findById(messageId);
        if (!optMsg.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        Message msg = optMsg.get();
        boolean newPinnedState = !msg.isPinned();
        msg.setPinned(newPinnedState);
        msg.setPinnedBy(newPinnedState ? userId : null);
        messageRepository.save(msg);

        // Update pinning user's stats
        Optional<User> optUser = findUserByIdOrUsername(userId);
        if (optUser.isPresent()) {
            User user = optUser.get();
            if (newPinnedState) {
                user.setPinnedMessagesCount(user.getPinnedMessagesCount() + 1);
            } else {
                user.setPinnedMessagesCount(Math.max(0, user.getPinnedMessagesCount() - 1));
            }
            user.setReputationPoints(ReputationPointCalculationAlgorithm.calculateReputationPoints(user));
            userRepository.save(user);
        }

        return ResponseEntity.ok(msg);
    }

    // Front Page Live Feed Algorithm Endpoint
    @PostMapping("/live-feed")
    public ResponseEntity<List<Message>> getJoinedTribesLiveFeed(@RequestBody Map<String, Object> payload) {
        List<String> joinedCommunities = (List<String>) payload.get("joinedCommunities");
        List<Message> allMessages = messageRepository.findAll();

        // Apply CommunityLiveFeedSortingAlgorithm
        List<Message> sortedFeed = CommunityLiveFeedSortingAlgorithm.filterAndSortLiveFeed(allMessages, joinedCommunities);
        return ResponseEntity.ok(sortedFeed);
    }
}


package com.findmytribe.controllers;

import com.findmytribe.models.User;
import com.findmytribe.repositories.CommunityRepository;
import com.findmytribe.repositories.MessageRepository;
import com.findmytribe.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin("*")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CommunityRepository communityRepository;

    @Autowired
    private MessageRepository messageRepository;

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

    @GetMapping("/status")
    public ResponseEntity<?> getAdminSystemStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("backendStatus", "UP & RUNNING");
        status.put("serverPort", 8080);
        status.put("database", "MongoDB (localhost:27017/findmytribe)");
        status.put("totalUsers", userRepository.count());
        status.put("totalCommunities", communityRepository.count());
        status.put("totalMessages", messageRepository.count());
        status.put("totalPinnedMessages", messageRepository.findByIsPinnedTrue().size());
        status.put("systemUptimeMs", System.currentTimeMillis());
        return ResponseEntity.ok(status);
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userRepository.findAll();
        // Hide password hash for security
        users.forEach(u -> u.setPassword("[PROTECTED]"));
        return ResponseEntity.ok(users);
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> toggleUserRole(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String newRole = payload.get("role");
        if (newRole == null || (!newRole.equals("ADMIN") && !newRole.equals("USER"))) {
            return ResponseEntity.badRequest().body("Role must be ADMIN or USER");
        }

        Optional<User> optUser = findUserByIdOrUsername(id);

        if (optUser.isPresent()) {
            User user = optUser.get();
            user.setRole(newRole);
            User saved = userRepository.save(user);
            saved.setPassword("[PROTECTED]");
            return ResponseEntity.ok(saved);
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        Optional<User> optUser = findUserByIdOrUsername(id);

        if (optUser.isPresent()) {
            userRepository.delete(optUser.get());
            return ResponseEntity.ok("User deleted successfully");
        }
        return ResponseEntity.notFound().build();
    }
}


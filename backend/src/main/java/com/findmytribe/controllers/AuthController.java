package com.findmytribe.controllers;

import com.findmytribe.models.User;
import com.findmytribe.repositories.UserRepository;
import com.findmytribe.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin("*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody User user) {
        if (user.getUsername() == null || user.getUsername().trim().isEmpty() ||
            user.getEmail() == null || user.getEmail().trim().isEmpty() ||
            user.getPassword() == null || user.getPassword().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("All fields (username, email, password) are required");
        }

        String cleanUsername = user.getUsername().trim();
        String cleanEmail = user.getEmail().trim();

        if (userRepository.existsByUsernameIgnoreCase(cleanUsername)) {
            return ResponseEntity.badRequest().body("Username is already taken");
        }
        if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
            return ResponseEntity.badRequest().body("Email is already registered");
        }

        user.setUsername(cleanUsername);
        user.setEmail(cleanEmail);
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userRepository.save(user);

        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "User registered successfully in MongoDB database");
        resp.put("user", savedUser);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (username == null || username.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Username and password are required");
        }

        String input = username.trim();

        // Check if user exists in database by username or email (case-insensitive)
        Optional<User> optUser = userRepository.findByUsernameIgnoreCase(input);
        if (!optUser.isPresent()) {
            optUser = userRepository.findByEmailIgnoreCase(input);
        }

        if (!optUser.isPresent()) {
            return ResponseEntity.status(404).body("USER_NOT_FOUND: User does not exist in database. Please Sign Up first!");
        }

        User user = optUser.get();
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401).body("INVALID_PASSWORD: Incorrect password. Please check your credentials!");
        }

        String token = jwtUtil.generateToken(user.getUsername());
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", user);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok("Logged out successfully");
    }
}


package com.findmytribe;

import com.findmytribe.models.User;
import com.findmytribe.repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class FindMyTribeApplication {

    public static void main(String[] args) {
        SpringApplication.run(FindMyTribeApplication.class, args);
    }

    @Bean
    public CommandLineRunner initDatabase(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (!userRepository.existsByUsernameIgnoreCase("admin")) {
                User admin = new User();
                admin.setUsername("admin");
                admin.setEmail("admin@findmytribe.edu");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setRole("ADMIN");
                admin.setBio("System Administrator for FindMyTribe MongoDB Infrastructure");
                userRepository.save(admin);
                System.out.println(">>> SEEDED ADMIN USER (admin / admin123) IN MONGODB DATABASE <<<");
            }
        };
    }
}


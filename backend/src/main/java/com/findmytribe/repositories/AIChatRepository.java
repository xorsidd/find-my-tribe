package com.findmytribe.repositories;

import com.findmytribe.models.AIChat;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AIChatRepository extends MongoRepository<AIChat, String> {
    List<AIChat> findByUserId(String userId);
}

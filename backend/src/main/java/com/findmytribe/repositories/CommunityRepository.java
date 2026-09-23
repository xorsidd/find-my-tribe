package com.findmytribe.repositories;

import com.findmytribe.models.Community;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface CommunityRepository extends MongoRepository<Community, String> {
    List<Community> findByCategory(String category);
    List<Community> findByCommunityNameContainingIgnoreCase(String name);
    java.util.Optional<Community> findByCommunityName(String communityName);
}

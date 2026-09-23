package com.findmytribe.repositories;

import com.findmytribe.models.StudyResource;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface StudyResourceRepository extends MongoRepository<StudyResource, String> {
    Optional<StudyResource> findByTopicIgnoreCase(String topic);
}

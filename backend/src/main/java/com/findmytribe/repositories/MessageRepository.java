package com.findmytribe.repositories;

import com.findmytribe.models.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findByReceiverOrderByTimestampAsc(String receiver);
    List<Message> findByCommunityNameOrderByTimestampDesc(String communityName);
    List<Message> findByCommunityNameIn(List<String> communityNames);
    List<Message> findByIsPinnedTrue();
}

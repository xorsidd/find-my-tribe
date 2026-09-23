package com.findmytribe.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "AIChat")
public class AIChat {
    @Id
    private String id;
    private String userId;
    private String prompt;
    private String response;
}

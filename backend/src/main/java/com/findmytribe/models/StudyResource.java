package com.findmytribe.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@Document(collection = "StudyResources")
public class StudyResource {
    @Id
    private String id;
    private String topic;
    private List<String> videos;
    private List<String> wikipediaLinks;
    private List<String> notes;
}

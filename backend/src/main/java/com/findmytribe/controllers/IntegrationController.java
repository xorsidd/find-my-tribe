package com.findmytribe.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

@RestController
@RequestMapping("/api/integrations")
@CrossOrigin("*")
public class IntegrationController {

    @GetMapping("/resources")
    public ResponseEntity<?> getStudyResources(@RequestParam String topic) {
        // Mocking API fetch for YouTube, Wikipedia, etc.
        Map<String, Object> resources = new HashMap<>();
        resources.put("topic", topic);
        resources.put("youtube", "https://youtube.com/results?search_query=" + topic + "+tutorials");
        resources.put("wikipedia", "https://en.wikipedia.org/wiki/" + topic);
        resources.put("articles", "https://medium.com/search?q=" + topic);
        return ResponseEntity.ok(resources);
    }

    @Value("${gemini.api.key:YOUR_MOCK_KEY}")
    private String geminiApiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent}")
    private String geminiApiUrl;

    @PostMapping("/ai-chat")
    public ResponseEntity<?> aiChat(@RequestBody Map<String, String> payload) {
        String prompt = payload.get("prompt");
        String clientApiKey = payload.get("apiKey");
        
        if (prompt == null || prompt.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Prompt is required"));
        }

        String activeApiKey = (clientApiKey != null && !clientApiKey.trim().isEmpty()) ? clientApiKey : geminiApiKey;

        if (activeApiKey == null || activeApiKey.equals("YOUR_MOCK_KEY") || activeApiKey.isEmpty()) {
            String mockResponse = "This is a simulated AI response to: " + prompt + ". "
                    + "Please provide a valid GEMINI_API_KEY environment variable or input your key in the UI to use the real AI.";
            return ResponseEntity.ok(Map.of("response", mockResponse));
        }

        RestTemplate restTemplate = new RestTemplate();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt)
                ))
            )
        );
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        
        String url = geminiApiUrl + "?key=" + activeApiKey;
        try {
            ResponseEntity<Map> apiResponse = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> body = apiResponse.getBody();
            if (body != null && body.containsKey("candidates")) {
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    if (!parts.isEmpty()) {
                        String text = (String) parts.get(0).get("text");
                        return ResponseEntity.ok(Map.of("response", text));
                    }
                }
            }
            return ResponseEntity.ok(Map.of("response", "Could not parse response from Gemini API."));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to connect to Gemini API: " + e.getMessage()));
        }
    }
}

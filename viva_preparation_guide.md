# Viva Preparation Guide: "Find My Tribe" Project

This document is your complete cheat sheet for tomorrow's Viva. It details the technology stack, project architecture, directory structure, API connections, database design, and key code implementations (OOP & Data Structures) that you must present to the examiner.

---

## 1. Project Overview
**Find My Tribe** is a responsive, modern full-stack web application that allows users to find and join community groups ("tribes") based on 50 different professional and academic domains (e.g., Java Developers, BTech CSE, Doctors, Chartered Accountants).
- **Core Features**: User registration & login, profile management, joining/leaving tribes, interactive tribe group chats, curated study resources finder (YouTube, Wikipedia, Medium), and an **AI Chatbot** integrated with the Google Gemini API.

---

## 2. Technology Stack & Languages

You should memorize this list. If the examiner asks: *"What technologies did you use?"*, answer with this:

| Layer | Technology / Tool | Purpose |
| :--- | :--- | :--- |
| **Frontend Languages** | HTML5, CSS3, JavaScript (ES6) | Structure, custom styles (glassmorphism/dark mode), and DOM logic |
| **Frontend Server** | Python (http.server) | Serves the static HTML/CSS/JS files on Port `3000` |
| **Backend Language** | Java (version 17) | Core backend business logic |
| **Backend Framework** | Spring Boot (version 3.2.3) | REST API endpoints, routing, and database integrations |
| **Security Framework** | Spring Security & JWT | Authentication, authorization, and BCrypt password encryption |
| **Database** | MongoDB | NoSQL database for flexible document storage |
| **AI Integration** | Google Gemini API (`gemini-flash-latest`) | Contextual AI chat assistant |
| **Containerization** | Docker & Docker Compose | Containerizing services (database, backend, frontend) |
| **Build Tool** | Maven | Managing Java dependencies (`pom.xml`) |

---

## 3. Directory Structure Explainers

If asked: *"Walk me through the directory structure,"* explain it as follows:

```text
impact_project/
│
├── docker-compose.yml              # Configures & orchestrates MongoDB, Backend, and Frontend containers
├── .env                            # Environment variables (e.g., GEMINI_API_KEY)
│
├── frontend/                       # Client-side files (Port 3000)
│   ├── index.html / login.html     # Landing page and login/signup screens
│   ├── home.html / discover.html   # Main dashboard and community directory page
│   ├── community.html              # Chatroom screen for individual tribes
│   ├── ai-chat.html / study.html   # AI Chat interface and study resource directory
│   ├── app.js                      # Core frontend logic (API calls, localStorage, themes)
│   └── styles.css                  # Custom styling (glassmorphism, dark/light variables)
│
└── backend/                        # Server-side Spring Boot application (Port 8080)
    ├── pom.xml                     # Maven project configuration and dependencies
    ├── Dockerfile                  # Instructions to containerize the Java application
    └── src/main/java/com/findmytribe/
        ├── FindMyTribeApplication.java  # Main entry point of the Spring Boot application
        │
        ├── models/                 # Database Document Entities (Schemas)
        │   ├── User.java           # Stores username, email, password (hashed), bio, joined communities
        │   ├── Community.java      # Stores community name, category, image, description, members list
        │   ├── Message.java        # Stores chat message content, sender, timestamp, community ID
        │   └── AIChat.java         # Stores AI chatbot history
        │
        ├── repositories/           # Spring Data MongoDB Repository Interfaces (CRUD queries)
        │   └── UserRepository.java, CommunityRepository.java, etc.
        │
        ├── controllers/            # REST API Controllers (Handles Request Mapping)
        │   ├── AuthController.java        # Handles User Signup, Login, and JWT generation
        │   ├── UserController.java        # Handles Profile updates and custom settings
        │   ├── CommunityController.java   # Handles joining/leaving/fetching communities
        │   └── IntegrationController.java # Connects to Google Gemini API & resources endpoints
        │
        ├── security/               # Spring Security configuration
        │   ├── JwtUtil.java               # Helper to generate/verify JSON Web Tokens
        │   └── SecurityConfig.java        # CORS, CSRF, and Router Security/Filters
        │
        └── utils/                  # Utility classes (specifically written to demo OOP & DSA)
            ├── OOPConceptsDemo.java       # Illustrates Inheritance, Polymorphism, Encapsulation
            └── CustomAlgorithms.java      # Custom implementations of Searches, Sorts, Palindromes
```

---

## 4. How the APIs & Connections Work (Data Flow)

This is a classic Viva question: *"How does the frontend communicate with the backend? How is the database connected?"*

### A. Frontend-to-Backend Connection
- The frontend runs on Port `3000`. The Spring Boot backend runs on Port `8080`.
- Communication happens via the **Fetch API** in JavaScript (`app.js`).
- **CORS (Cross-Origin Resource Sharing)** is enabled in the backend (`SecurityConfig.java` & `@CrossOrigin("*")` on controllers) to allow the frontend to call the API without security blockages.

### B. Authentication Flow (JWT)
1. **Registration**: Frontend posts `{username, email, password}` to `/api/auth/signup`. The backend uses `BCryptPasswordEncoder` to hash the password and saves it to MongoDB.
2. **Login**: Frontend posts credentials to `/api/auth/login`. The backend verifies the password. If valid, `JwtUtil.java` signs a token with a secret key.
3. **Session**: The backend sends the JWT token back to the frontend. The frontend stores it in `localStorage.setItem('token', token)`.
4. **Authorized Requests**: For protected pages (e.g., getting private profile details), the frontend includes the token in the HTTP Authorization headers:
   `Authorization: Bearer <token>`. The backend filter decodes and validates this token before letting the request pass.

### C. Gemini AI Chatbot Connection
- When the user asks the chatbot a question:
  1. JavaScript sends a POST request with the user's prompt to `/api/integrations/ai-chat` on the Spring Boot backend.
  2. The backend controller (`IntegrationController.java`) intercepts the request.
  3. It fetches the system `GEMINI_API_KEY` (from environment variables or configuration).
  4. It constructs a JSON request body expected by Gemini:
     `{ "contents": [{ "parts":[{"text": "<PROMPT>"}] }] }`
  5. Using Spring's `RestTemplate`, it sends an HTTP POST request to the official Google Gemini API URL:
     `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=<API_KEY>`
  6. Gemini processes the prompt and returns a JSON payload. The backend parses the response path (`candidates[0].content.parts[0].text`) and returns the clean response text to the frontend.

---

## 5. DSA & OOP Concepts Implemented (Critical Viva Code)

Examiners love asking how you applied academic concepts (Data Structures, Algorithms, and Object-Oriented Programming) in your project. Refer them directly to the `utils` package:

### A. Object-Oriented Programming (OOP) Demonstration (`OOPConceptsDemo.java`)
- **Encapsulation**: Using `private` fields (like `private String createdBy;`) and exposing them only via public getters and setters (`getCreatedBy()`, `setCreatedBy()`).
- **Inheritance**: Class `SpecializedEntity` inherits from `BaseEntity` (`public static class SpecializedEntity extends BaseEntity`).
- **Polymorphism (Method Overriding)**: The subclass overrides the `printDetails()` method of the base class (`@Override public void printDetails()`).
- **Polymorphism (Method Overloading)**: Declaring `printDetails(boolean showTypeOnly)` in the same class with a different parameter list.

### B. Data Structures & Algorithms (`CustomAlgorithms.java`)
- **Arrays**: Used `char[] arr = input.toCharArray();` to reverse a string.
- **Two-Pointer Approach**: Efficiently checking for a palindrome by scanning from both ends (`left` moving forward, `right` moving backward) in $O(N)$ time.
- **Linear Search**: Scanning the community list element-by-element to match a target name ($O(N)$ time).
- **Bubble Sort**: A sorting algorithm that compares adjacent communities and swaps them if they are in the wrong alphabetical order ($O(N^2)$ time).
- **Binary Search**: Searching for a community name in $O(\log N)$ time on a pre-sorted list by dividing the search interval in half.
- **Linked Lists**: Demonstrating `java.util.LinkedList` node traversal.

---

## 6. Expected Viva Questions & Answers

Be prepared to answer these questions directly:

**Q1: Why did you choose MongoDB instead of a Relational Database like MySQL/PostgreSQL?**
> *"We chose MongoDB because it is a NoSQL, document-based database. Our communities, user profiles, and chat messages contain variable, dynamic data that doesn't fit into strict tabular schemas. MongoDB's JSON-like document structure (BSON) allows us to store nested lists (like arrays of joined communities) easily, making it highly scalable and flexible for a social platform."*

**Q2: What is JWT and why is it used?**
> *"JWT stands for JSON Web Token. We use it for stateless session authentication. Instead of storing session IDs in the server's memory, the server signs a secure token containing the user's identity and returns it to the client. The client sends this token in the header of subsequent requests, allowing our backend to verify the user without querying a session database on every request."*

**Q3: How does Spring Boot handle dependency injection?**
> *"Spring Boot uses inversion of control (IoC). We use annotations like `@Autowired` to let Spring automatically inject instances of our repository or service classes into our controllers at runtime, reducing tight coupling between classes."*

**Q4: How do you handle password security?**
> *"We never store plain text passwords in the database. We use Spring Security's `BCryptPasswordEncoder` which implements a strong one-way hashing function with a random salt value. Even if the database gets compromised, the passwords cannot be decrypted."*

**Q5: What is the purpose of Docker in your project?**
> *"Docker containerizes our frontend, backend, and MongoDB database into isolated environments. This ensures the app runs identically on any machine (eliminates 'it works on my machine' issues) and makes deployment seamless using `docker-compose up`."*

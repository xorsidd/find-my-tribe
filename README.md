# Find My Tribe 🌐

**Find My Tribe** is a modern full-stack web application that allows users to discover, join, and collaborate in academic and professional communities ("tribes") across 50 different domains (such as Java Developers, BTech CSE, Medical Sciences, Chartered Accountancy, and more).

---

## 🌟 Key Features

- **Domain-Specific Tribe Communities**: Discover and join 50+ curated tribes with domain filters, search, and member counts.
- **Tribe Feeds & Group Chats**: Post discussions, share study notes, links, and pin key messages to the live feed.
- **AI Chatbot (Gemini Powered)**: Integrated AI assistant powered by the Google Gemini API to answer study and domain queries.
- **Study Resources Hub**: Dynamic finder for curated learning resources across YouTube, Wikipedia, and technical articles.
- **Reputation & Gamification**: Earn reputation points for active participation and pinning helpful resources.
- **Stateless Authentication**: Secure user registration and login using Spring Security, BCrypt password hashing, and JWT tokens.
- **Multilingual Support**: Built-in internationalization (i18n) supporting English, Hindi, and Gujarati.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Custom Glassmorphism UI), JavaScript (ES6) |
| **Backend** | Java 17, Spring Boot 3.2.3 |
| **Security** | Spring Security 6, JJWT (JSON Web Token), BCrypt |
| **Database** | MongoDB |
| **AI Integration** | Google Gemini API (`gemini-flash-latest`) |
| **Orchestration** | Docker & Docker Compose |
| **Build Tool** | Apache Maven |

---

## 🚀 Getting Started

### Prerequisites

- [Docker & Docker Compose](https://www.docker.com/) (Recommended)
- Or locally:
  - Java 17+ JDK
  - Maven 3.9+
  - MongoDB 6.0+
  - Python 3.10+ (for serving static frontend)

---

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Add your Google Gemini API key in `.env`:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```
   *(Note: The AI chatbot gracefully falls back to mock responses if no key is provided.)*

---

### Running with Docker Compose

To start all services (Backend, Frontend, and MongoDB) in one command:

```bash
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **MongoDB**: localhost:27017

---

### Running Manually

#### 1. Backend
```bash
cd backend
mvn clean spring-boot:run
```
Backend will start on `http://localhost:8080`.

#### 2. Frontend
```bash
cd frontend
python -m http.server 3000
```
Open `http://localhost:3000` in your browser.

---

## 🔒 Security Best Practices

- Passwords are encrypted with `BCryptPasswordEncoder` with high work factor.
- JWT tokens handle stateless authorization on protected endpoints.
- Secrets and environment variables (`.env`) are strictly excluded from version control.
- Sample configuration is provided via `.env.example`.

---

## 📄 License

This project is licensed under the MIT License.

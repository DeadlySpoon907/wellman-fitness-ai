# Sequence Diagrams

## Table of Contents
1. [Fitness Plan Generation](#fitness-plan-generation)
2. [Macro Analysis](#macro-analysis)
3. [BMI Estimation](#bmi-estimation)
4. [Posture Check](#posture-check)
5. [NutriBot Chat](#nutribot-chat)

---

## Fitness Plan Generation

```mermaid
sequenceDiagram
    participant U as User
    participant UI as FitnessPlanDesigner
    participant DB as LocalStorage
    participant AI as Gemini API
    participant Cache as Cache Layer

    U->>UI: Select goal, intensity, location, focus areas
    UI->>UI: Update profile state
    U->>UI: Click "Generate Personalized Plan"
    UI->>Cache: Check cache (workout_key)
    
    alt Cache Hit
        Cache-->>UI: Return cached plan
        UI-->>U: Display plan on dashboard
    else Cache Miss
        UI->>UI: Extract weight/height from user data
        UI->>UI: Build fitness prompt
        UI->>AI: generateContent(prompt)
        AI-->>UI: Return JSON response
        UI->>UI: Parse JSON, add generatedAt timestamp
        UI->>Cache: Store in localStorage (15min TTL)
        UI->>DB: saveUser(updatedUser)
        UI-->>U: Display plan on dashboard
    end
```

**Flow Description:**
1. User configures fitness preferences (goal, intensity, location, focus areas)
2. System generates a unique cache key from profile parameters
3. If cached result exists and is within 15-min TTL, return immediately
4. Otherwise, call Gemini API with structured prompt
5. Parse response and store in localStorage for future requests
6. Save to user profile in database
7. Display generated plan on dashboard

---

## Macro Analysis

```mermaid
sequenceDiagram
    participant U as User
    participant UI as CameraCapture
    participant IMG as Image Processor
    participant AI as Gemini API
    participant Cache as Cache Layer

    U->>UI: Capture food photo
    UI->>UI: Convert to base64
    UI->>IMG: compressImage(base64, 800px, 70% quality)
    IMG-->>UI: Return compressed base64
    UI->>Cache: Check cache (image_hash)
    
    alt Cache Hit
        Cache-->>UI: Return cached macro data
        UI-->>U: Display nutritional analysis
    else Cache Miss
        UI->>AI: generateContent(prompt + image)
        AI-->>UI: Return JSON (calories, protein, carbs, fat)
        UI->>UI: Parse JSON response
        UI->>Cache: Store in localStorage
        UI-->>U: Display meal name + macro breakdown
    end
```

**Flow Description:**
1. User captures or uploads photo of food
2. Image is compressed (max 800px, 70% JPEG quality) before sending
3. Cache key generated from first 50 chars of image hash
4. If cached, return immediately without API call
5. Send prompt + image to Gemini Vision API
6. Parse and display nutritional estimates

---

## BMI Estimation

```mermaid
sequenceDiagram
    participant U as User
    participant UI as BmiEstimator
    participant IMG as Image Processor
    participant AI as Gemini API
    participant Cache as Cache Layer

    U->>UI: Upload full-body photo
    UI->>IMG: compressImage(base64)
    IMG-->>UI: Return optimized image
    UI->>Cache: Check cache
    
    alt Cache Hit
        Cache-->>UI: Return cached BMI data
    else Cache Miss
        UI->>AI: generateContent(vision prompt)
        AI-->>UI: Return estimated height, weight, BMI
        UI->>Cache: Store result
    end
    
    UI-->>U: Display BMI metrics + visualization
```

---

## Posture Check

```mermaid
sequenceDiagram
    participant U as User
    participant UI as PostureChecker
    participant IMG as Image Processor
    participant AI as Gemini API
    participant Cache as Cache Layer

    U->>UI: Capture posture photo (side/front)
    UI->>IMG: compressImage(base64)
    IMG-->>UI: Return optimized image
    UI->>Cache: Check cache
    
    alt Cache Hit
        Cache-->>UI: Return cached posture data
    else Cache Miss
        UI->>AI: generateContent(posture analysis prompt)
        AI-->>UI: Return score (0-100), findings, recommendations
        UI->>Cache: Store result
    end
    
    UI-->>U: Display posture score + feedback
```

---

## NutriBot Chat

```mermaid
sequenceDiagram
    participant U as User
    participant UI as NutriBot Chat
    participant AI as Gemini Chat API
    participant DB as Message History

    U->>UI: Type message and send
    UI->>UI: Add user message to chat
    UI->>U: Show "typing" indicator
    UI->>AI: sendMessageStream(userMessage)
    
    rect rgb(200, 230, 255)
        note right of AI: Streaming response
        loop While chunks available
            AI-->>UI: Stream text chunk
            UI->>UI: Append to bot response
            UI->>U: Update chat UI in real-time
        end
    end
    
    UI->>DB: Store messages (up to limit)
    UI-->>U: Final response displayed
    U->>UI: Continue conversation
```

**Flow Description:**
1. User sends message in chat interface
2. System initializes Gemini Chat with system instruction on load
3. Messages sent as streaming to show real-time responses
4. Chat history stored in component state
5. System instruction ensures NutriBot behaves as nutritionist

---

## Architecture Overview

```mermaid
flowchart TB
    subgraph Frontend
        UI1[FitnessPlanDesigner]
        UI2[NutriBot]
        UI3[Macro Scanner]
        UI4[BMI Estimator]
        UI5[Posture Checker]
    end
    
    subgraph Services
        Cache[Caching Layer]
        Rate[Rate Limiter]
        Compress[Image Compression]
    end
    
    subgraph External
        API[Google Gemini API]
    end
    
    UI1 & UI2 & UI3 & UI4 & UI5 --> Cache
    Cache --> Rate
    Rate --> Compress
    Compress --> API
    
    style API fill:#f9f,stroke:#333
    style Cache fill:#ff9,stroke:#333
    style Rate fill:#9ff,stroke:#333
```

---

## Rate Limiting Strategy

| Feature | Free Tier Limit | Optimization |
|---------|-----------------|--------------|
| Fitness Plan | 15 req/min | Cache 15min TTL |
| Macro Analysis | 15 req/min | Compress images |
| BMI Estimation | 15 req/min | Cache by image hash |
| Posture Check | 15 req/min | Cache by image hash |
| NutriBot | 15 req/min | Streaming (no extra overhead) |

---

*Generated: 2026-04-11*
*Project: Wellman Fitness v1.3.6*
# Wellman Fitness - Frontend Architecture

This document details the client-side architecture of the Wellman Fitness application, built with React 19 and Vite.

## 1. Technology Stack

| Component | Package | Version | Purpose |
|-----------|---------|---------|---------|
| **Core Framework** | `react` | ^19.2.4 | Component-based UI library. |
| **Build Tool** | `vite` | ^7.3.1 | Fast development server and bundler. |
| **Language** | `typescript` | ^5.0.0 | Type-safe development. |
| **Styling** | `tailwindcss` | ^3.4.0 | Utility-first CSS framework for responsive design. |
| **State Management** | React Context API | - | Local and global state management for user sessions and data. |
| **Visualization** | `recharts` | ^3.7.0 | Rendering weight history and activity charts. |
| **AI Client** | `@google/genai` | ^1.0.0 | Client-side interaction with Gemini for vision tasks. |
| **ML/Vision** | `@mediapipe/tasks-vision` | ^0.10.34 | In-browser pose detection and body metric estimation. |

## 2. Project Structure

The frontend source code is located in the project root:

```text
├── components/         # Reusable UI components (AuthGuard, WeightChart, CameraCapture).
├── views/              # Main application views (Dashboard, Login, AdminDashboard, etc.).
├── services/           # API service layers (DB.ts, geminiService.ts).
├── utils/              # Utility functions and helpers.
├── App.tsx             # Root component and routing configuration.
├── index.tsx           # Application entry point.
├── types.ts            # TypeScript type definitions.
└── package.json        # npm dependencies.
```

## 3. Key Features & Implementation

### Dashboard
- **Implementation**: Aggregates data from `WeightLog` and `ActivityLog`.
- **Visualization**: Uses `recharts` to render the "Weight History" line chart and "Consistency" heatmap.

### AI Integration (Client-Side)
The frontend interacts directly with Google's Gemini API for low-latency, interactive features, particularly those involving computer vision.
- **Nutritionist**: Captures/uploads images to Gemini for caloric and macro-nutrient estimation.
- **Posture Checker**: Analyzes video/image frames using MediaPipe Tasks Vision for alignment feedback.
- **BMI Estimator**: Uses MediaPipe Tasks Vision for in-browser body metric estimation.

### State Management
React Context API is used to manage:
- **Authentication State**: User tokens and profile info. Handles persistence via `localStorage`.
- **UI State**: Sidebar toggles, active modals, and theme preferences (Dark/Light mode).
- **Data State**: Caching of fetched plans and logs to minimize API calls.

## 4. Configuration

### Environment Variables
The frontend requires specific environment variables defined in a `.env` file at the project root:
- `VITE_API_KEY`: The Google GenAI API key used for client-side AI requests.
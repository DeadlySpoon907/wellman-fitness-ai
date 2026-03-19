# Wellman Fitness - Frontend Architecture

This document details the client-side architecture of the Wellman Fitness application, built with React 19 and Vite.

## 1. Technology Stack

| Component | Package | Purpose |
|-----------|---------|---------|
| **Core Framework** | `react` (v19) | Component-based UI library. |
| **Build Tool** | `vite` | Fast development server and bundler. |
| **State Management** | `@reduxjs/toolkit` | Global state management for user sessions and data. |
| **Styling** | `tailwindcss` | Utility-first CSS framework for responsive design. |
| **Visualization** | `recharts` | Rendering weight history and activity charts. |
| **AI Client** | `@google/genai` | Client-side interaction with Gemini for vision tasks. |

## 2. Project Structure

The frontend source code is located in the `src/` directory:

```text
src/
├── assets/             # Static images and global styles.
├── components/         # Reusable UI components (Buttons, Cards, Charts).
├── context/            # React Context providers.
├── features/           # Redux slices and feature-specific logic.
├── pages/              # Main application views (Dashboard, Login, Plan Designer).
├── services/           # API service layers (Axios/Fetch wrappers).
├── App.jsx             # Root component and routing configuration.
└── main.jsx            # Application entry point.
```

## 3. Key Features & Implementation

### Dashboard
- **Implementation**: Aggregates data from `WeightLog` and `ActivityLog`.
- **Visualization**: Uses `recharts` to render the "Weight History" line chart and "Consistency" heatmap.

### AI Integration (Client-Side)
The frontend interacts directly with Google's Gemini API for low-latency, interactive features, particularly those involving computer vision.
- **Nutritionist**: Captures/uploads images to Gemini 3 Flash for caloric estimation.
- **Posture Checker**: Analyzes video/image frames for alignment feedback.
- **BMI Estimator**: Sends video frames to the local Node.js service (`localhost:5001`) for volumetric analysis.

### State Management
Redux Toolkit is used to manage:
- **Authentication State (`authSlice`)**: User tokens (JWT) and profile info. Handles persistence via `localStorage`.
- **UI State (`uiSlice`)**: Sidebar toggles, active modals, and theme preferences (Dark/Light mode).
- **Data State**: Caching of fetched plans and logs to minimize API calls.

## 4. Configuration

### Environment Variables
The frontend requires specific environment variables defined in a `.env` file at the project root:
- `VITE_API_KEY`: The Google GenAI API key used for client-side AI requests.
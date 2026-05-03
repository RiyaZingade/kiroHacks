# Requirements Document

## Introduction

This document defines the requirements for deploying the CirKit application to production. CirKit is a circuit design assistant with a React/Vite frontend, a Python/FastAPI backend, and a Supabase database. The deployment targets Vercel for the frontend, Render (free tier) for the backend, and uses the existing hosted Supabase instance for the database. The primary goals are to make the application publicly accessible, ensure secure communication between services, and establish a reliable deployment pipeline.

## Glossary

- **Frontend**: The React 18 + Vite + Tailwind CSS client application served to users' browsers
- **Backend**: The Python 3.11 + FastAPI server that handles AI chat, PDF upload, circuit validation, and code generation
- **Vercel**: The hosting platform used to deploy the Frontend as a static site with serverless rewrites
- **Render**: The hosting platform used to deploy the Backend as a web service on the free tier
- **Supabase**: The hosted PostgreSQL database service used for project and chat message persistence
- **API_Proxy**: The Vercel rewrite configuration that forwards `/api/*` requests from the Frontend to the Backend on Render
- **CORS_Config**: The Cross-Origin Resource Sharing middleware configuration on the Backend that controls which origins may call the API
- **Environment_Variables**: Platform-specific configuration values (API keys, URLs) injected at build time or runtime
- **Health_Endpoint**: The Backend `/health` route used to verify the service is running
- **Build_Pipeline**: The automated build and deploy process triggered by a Git push to the deployment branch
- **SPA_Routing**: Single Page Application routing where all non-API paths resolve to `index.html`

## Requirements

### Requirement 1: Frontend Deployment to Vercel

**User Story:** As a developer, I want the Frontend deployed to Vercel, so that users can access CirKit from a public URL.

#### Acceptance Criteria

1. WHEN a Git push is made to the deployment branch, THE Build_Pipeline SHALL build the Frontend using `npm run build` with the root directory set to `frontend` and output directory set to `dist`
2. THE Vercel configuration SHALL define SPA_Routing so that all non-API paths return `index.html`
3. WHEN a user navigates to any Frontend route, THE Frontend SHALL render the correct view without a 404 error
4. THE Frontend SHALL load successfully in a browser and display the CirKit landing page at the production URL

### Requirement 2: Backend Deployment to Render

**User Story:** As a developer, I want the Backend deployed to Render, so that the API is publicly accessible for the Frontend to consume.

#### Acceptance Criteria

1. WHEN a Git push is made to the deployment branch, THE Build_Pipeline SHALL install Backend dependencies using `pip install -r requirements.txt` with the root directory set to `backend`
2. THE Backend SHALL start using `uvicorn main:app --host 0.0.0.0 --port $PORT` on Render
3. WHEN a request is made to the Health_Endpoint, THE Backend SHALL return a JSON response `{"status": "ok"}` with HTTP status 200
4. THE Backend SHALL be accessible at a public Render URL over HTTPS

### Requirement 3: API Proxy Configuration

**User Story:** As a developer, I want Frontend API calls to be proxied through Vercel to the Backend on Render, so that the Frontend does not need to know the Backend URL directly and avoids cross-origin issues in the browser.

#### Acceptance Criteria

1. THE API_Proxy SHALL rewrite all requests matching `/api/:path*` to the corresponding path on the Backend Render URL
2. WHEN the Frontend sends a request to `/api/chat`, THE API_Proxy SHALL forward the request to the Backend `/chat` endpoint and return the Backend response to the Frontend
3. WHEN the Frontend sends a request to `/api/generate-code`, THE API_Proxy SHALL forward the request to the Backend `/generate-code` endpoint and return the Backend response to the Frontend
4. WHEN the Frontend sends a request to `/api/upload-pdf`, THE API_Proxy SHALL forward the request to the Backend `/upload-pdf` endpoint and return the Backend response to the Frontend
5. THE SPA_Routing rewrite SHALL be ordered after the API_Proxy rewrites so that API requests are not caught by the SPA fallback

### Requirement 4: Hardcoded URL Elimination

**User Story:** As a developer, I want all hardcoded `localhost:8000` URLs removed from the Frontend, so that API calls work correctly in both development and production environments.

#### Acceptance Criteria

1. THE Frontend SHALL use relative paths (e.g., `/api/chat`, `/api/generate-code`) for all Backend API calls instead of absolute `http://localhost:8000` URLs
2. WHEN running in development, THE Vite dev server proxy SHALL forward `/api/*` requests to `http://localhost:8000` with the `/api` prefix stripped
3. WHEN running in production on Vercel, THE API_Proxy SHALL forward `/api/*` requests to the Backend on Render
4. THE Frontend SHALL contain zero references to `http://localhost:8000` after the change

### Requirement 5: CORS Configuration

**User Story:** As a developer, I want the Backend CORS configuration updated for production, so that only authorized origins can make API requests.

#### Acceptance Criteria

1. THE CORS_Config SHALL allow requests from the production Vercel domain
2. THE CORS_Config SHALL allow requests from `http://localhost:5173` for local development
3. THE CORS_Config SHALL allow requests from `http://localhost:4173` for local preview builds
4. WHILE the Backend is running in production, THE CORS_Config SHALL reject requests from origins not in the allowed list by omitting CORS headers
5. THE CORS_Config SHALL read allowed origins from an Environment_Variable so that origins can be updated without code changes

### Requirement 6: Environment Variable Management

**User Story:** As a developer, I want all secrets and configuration values managed through environment variables, so that sensitive data is not committed to the repository and configuration can vary per environment.

#### Acceptance Criteria

1. THE Backend SHALL read the `ANTHROPIC_API_KEY` from an Environment_Variable and refuse to start if the variable is missing
2. THE Backend SHALL read `ALLOWED_ORIGINS` from an Environment_Variable to configure CORS_Config
3. THE Frontend SHALL read `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Environment_Variables set in the Vercel dashboard
4. IF the `ANTHROPIC_API_KEY` Environment_Variable is not set, THEN THE Backend SHALL log an error message indicating the missing variable and exit with a non-zero status code
5. THE repository SHALL contain `.env.example` files for both Frontend and Backend documenting all required Environment_Variables without actual secret values

### Requirement 7: Database Migration Verification

**User Story:** As a developer, I want to verify that the Supabase database schema is up to date before going live, so that the application has the tables and indexes it needs.

#### Acceptance Criteria

1. THE Supabase instance SHALL have the `projects` table with columns `id`, `name`, `circuit`, `created_at`, and `updated_at` as defined in `supabase/migrations/001_create_tables.sql`
2. THE Supabase instance SHALL have the `chat_messages` table with columns `id`, `project_id`, `role`, `content`, and `created_at` as defined in `supabase/migrations/001_create_tables.sql`
3. THE Supabase instance SHALL have the index `idx_chat_messages_project` on `chat_messages(project_id, created_at)`
4. THE Supabase instance SHALL have Row Level Security enabled on both tables with permissive policies

### Requirement 8: End-to-End Smoke Test

**User Story:** As a developer, I want to verify the full user flow works in production, so that I have confidence the deployment is functional before sharing the URL.

#### Acceptance Criteria

1. WHEN a user visits the production URL, THE Frontend SHALL display the CirKit landing page
2. WHEN a user navigates to the main application view, THE Frontend SHALL render the breadboard canvas, chat panel, and sidebar components
3. WHEN a user sends a chat message, THE Frontend SHALL receive a reply from the Backend via the API_Proxy and display it in the chat panel
4. WHEN a user requests code generation for a circuit with components and connections, THE Frontend SHALL display the generated Arduino code in the code editor
5. IF the Backend is unreachable, THEN THE Frontend SHALL display an error message to the user instead of failing silently

### Requirement 9: Build and Deploy Pipeline

**User Story:** As a developer, I want automated builds triggered by Git pushes, so that deployments are repeatable and do not require manual steps beyond merging code.

#### Acceptance Criteria

1. WHEN a Git push is made to the deployment branch, THE Vercel Build_Pipeline SHALL automatically build and deploy the Frontend
2. WHEN a Git push is made to the deployment branch, THE Render Build_Pipeline SHALL automatically build and deploy the Backend
3. THE Frontend Build_Pipeline SHALL fail the deployment if `npm run build` exits with a non-zero status code
4. THE Backend Build_Pipeline SHALL fail the deployment if `pip install -r requirements.txt` exits with a non-zero status code

### Requirement 10: HTTPS and Security

**User Story:** As a developer, I want all production traffic served over HTTPS, so that data in transit (including API keys and user messages) is encrypted.

#### Acceptance Criteria

1. THE Frontend SHALL be served over HTTPS on the Vercel production URL
2. THE Backend SHALL be served over HTTPS on the Render production URL
3. WHEN a request is made over HTTP to the Frontend production URL, THE Vercel platform SHALL redirect the request to HTTPS
4. THE Backend SHALL not expose the `ANTHROPIC_API_KEY` in any API response or client-accessible log

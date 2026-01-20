# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AI-driven video generation SaaS platform** (MVP stage) that enables human-AI collaborative creative video production workflows. The core feature is **Image-to-Video** generation.

**Version Status:**
- **v1.0 (MVP)**: ✅ Completed and deployed (Dec 2024)
- **v1.1**: ✅ Completed (Jan 2025) - Enhanced video generation parameters

**Key characteristics:**
- Single-user assumption (no authentication system in MVP)
- Near real-time state synchronization (draft-like auto-save)
- Flexible third-party API integration (video generation and LLM services)
- Streamlined architecture focusing on core functionality

**Current Status (v1.1):**
- **Frontend**: ✅ Updated with enhanced video generation controls
  - Duration control (5s/10s/15s) with dropdown selector
  - Aspect ratio selection (16:9/9:16/1:1/4:3) with icon buttons
  - Motion intensity slider (1-5 scale) with visual feedback
  - Quality preset selector (draft/standard/high) with time estimates
  - All core components updated for v1.1
  - Backward compatible with v1.0 workspaces
  - Zustand state management with default value handling
  - API and WebSocket client services ready
  - Responsive UI with horizontal scrolling timeline
- **Backend**: ✅ Updated with v1.1 parameter validation and handling
  - All core modules updated for v1.1
  - REST API endpoints with v1.1 parameter validation
  - WebSocket handlers support incremental updates for v1.1 fields
  - Default value handling for backward compatibility
  - Third-party service integrations (Qwen video + Gemini LLM) completed
  - Winston logging configured
  - Integration tests passed (v1.0 + v1.1)
- **Third-party APIs**: ✅ Verified and Integrated
  - Qwen video generation (DashScope wan2.6-i2v) - tested and integrated
  - Google Gemini 3 LLM (gemini-3-flash-preview) - tested and integrated

## Core Architecture

### Frontend
- **Tech Stack**: React 19 + TypeScript + Vite + TailwindCSS 4
- **State Management**: Zustand
- **Data Fetching**: Axios + TanStack React Query
- **Drag & Drop**: dnd-kit
- **Layout**: Horizontal scrolling timeline with multiple workspaces
- **Key Features**:
  - Image upload
  - Video generation form with v1.1 enhancements:
    - Camera movement, shot type, lighting, motion prompts (v1.0)
    - Duration control (5s/10s/15s) (v1.1)
    - Aspect ratio selection (16:9/9:16/1:1/4:3) (v1.1)
    - Motion intensity slider (1-5) (v1.1)
    - Quality preset (draft/standard/high) (v1.1)
  - Video player
  - AI collaboration assistant

**Implemented Components:**
- `Timeline.tsx` - Horizontal scrolling workspace timeline
- `Workspace.tsx` - Individual workspace container
- `ImageUpload.tsx` - Image upload with drag & drop support
- `VideoForm.tsx` - Video generation form with validation
- `VideoPlayer.tsx` - Video playback component
- `AICollaboration.tsx` - AI suggestion interface
- `LoadingSpinner.tsx` - Loading state component
- `ErrorMessage.tsx` - Error display component
- `EmptyState.tsx` - Empty state placeholder

**Frontend Services:**
- `api.ts` - REST API client with Axios
- `websocket.ts` - WebSocket client for real-time sync

**State Management:**
- `workspaceStore.ts` - Zustand store for workspace state management
  - v1.1: Includes default value handling for new parameters
  - v1.1: Debounced WebSocket sync (300ms) for form updates

**Type Definitions:**
- `workspace.ts` - TypeScript interfaces for workspace data
  - v1.1: Added Duration, AspectRatio, MotionIntensity, QualityPreset types
  - v1.1: Added validation functions (isDuration, isAspectRatio, etc.)
  - v1.1: Added default constants (DEFAULT_DURATION, DEFAULT_ASPECT_RATIO, etc.)

### Backend
- **Tech Stack**: Node.js + Express + WebSocket (✅ Implemented)
- **Database**: MongoDB with Mongoose ODM (✅ Implemented)
- **Communication**: WebSocket for near real-time state sync (✅ Implemented)
- **File Storage**: Local filesystem (`uploads/`) for MVP, designed for easy migration to OSS
- **Third-party APIs**:
  - Video Generation: Qwen (DashScope API) - using wan2.6-i2v model (✅ Integrated)
  - LLM Services: Google Gemini 3 (gemini-3-flash-preview) (✅ Integrated)

**Critical Design Principles**:
- **Simple and direct**: No task queues, caching layer, or monitoring services in MVP
- **High cohesion**: Single-file modules (one file = one complete feature)
- **AI-friendly**: No traditional layered architecture (routes/services/models separation)
- **Flexible integration**: Switch third-party providers via config, no code changes needed

**Implemented Modules:**
- **Core Infrastructure**:
  - `server.js` - HTTP + WebSocket server startup
  - `app.js` - Express application setup with middleware
  - `config.js` - Environment configuration management
  - `db/mongodb.js` - MongoDB connection + Workspace model
  - `utils/logger.js` - Winston logging utility

- **REST API Endpoints** (`api/`):
  - `upload-image.js` - Image upload with Multer
  - `get-workspaces.js` - Fetch all workspaces
  - `generate-video.js` - Trigger video generation
  - `ai-suggest.js` - AI collaboration suggestions

- **WebSocket Handlers** (`websocket/`):
  - `server.js` - WebSocket server setup and routing
  - `workspace-create.js` - Create new workspace
  - `workspace-update.js` - Update workspace (incremental)
  - `workspace-delete.js` - Delete workspace
  - `workspace-reorder.js` - Reorder workspaces

- **Third-party Services** (`services/`):
  - `video-qwen.js` - Qwen video generation with polling
  - `llm-gemini.js` - Gemini LLM integration

- **Testing**:
  - `__tests__/integration.test.js` - Integration tests with Jest

### Data Synchronization Strategy

**WebSocket + Incremental Updates:**
- Frontend sends only changed fields (debounced 300ms)
- Backend immediately writes to MongoDB
- Backend pushes video generation status updates to frontend
- User state restoration on browser refresh via `GET /api/workspaces`

**Video Generation Flow:**
```
User submits → Backend calls third-party API → Get task_id
→ Start polling (every 5s) → Update MongoDB on completion
→ WebSocket push to frontend → UI updates
```

## Key Documents

Before starting development, read these in order:

1. **`context/business.md`** - Complete business requirements and product design (v1.0 MVP)
2. **`context/business-v1-1.md`** - v1.1 feature planning and updates ✅ Completed (Jan 2025)
3. **Backend Architecture Documentation** (detailed design split into multiple files):
   - **`context/backend-architecture.md`** - Architecture overview and navigation (start here)
   - **`context/backend-api-design.md`** - REST API and WebSocket communication design
   - **`context/backend-database-design.md`** - MongoDB schema, indexes, and queries
   - **`context/backend-architecture-modules.md`** - Single-file module design, directory structure, call topology
   - **`context/backend-config.md`** - Environment variables and configuration management
   - **`context/backend-testing.md`** - Testing strategy and tools
   - **`context/backend-deployment.md`** - Deployment guide and operations
4. **Development Plans** (DAG-based task breakdown):
   - **`context/backend-dev-plan.md`** - Backend development DAG overview
   - **`context/frontend-dev-plan.md`** - Frontend development DAG overview
   - **`context/tasks/README.md`** - Complete DAG task index (start here for development)
   - **`context/tasks/backend/`** - 19 backend task nodes (layer-by-layer execution)
   - **`context/tasks/frontend/`** - 16 frontend task nodes (layer-by-layer execution)

## Directory Structure

```
my-project/
├── .claude/                    # Claude Code configuration
│   └── settings.local.json     # Local settings
│
├── ai-output-resource/         # AI-generated outputs and test resources
│   ├── test-scripts/           # Standalone API test scripts
│   │   ├── test-qwen-video.js  # Qwen video API test script
│   │   └── test-gemini-llm.js  # Gemini LLM API test script
│   └── docs/                   # AI-generated documentation
│       ├── API-VERIFICATION-GUIDE.md  # API verification guide
│       ├── api-test-report.md         # API test results
│       └── UAT-READY.md               # UAT readiness report
│
├── context/                    # Development context and planning
│   ├── business.md             # Business requirements document
│   ├── backend-*.md            # Backend architecture documentation
│   ├── backend-dev-plan.md     # Backend DAG overview
│   ├── frontend-dev-plan.md    # Frontend DAG overview
│   ├── tasks/                  # DAG task nodes (35 files)
│   │   ├── README.md           # Task index and execution guide
│   │   ├── backend/            # 19 backend task files (layer 1-6)
│   │   └── frontend/           # 16 frontend task files (layer 1-6)
│   └── third-part/             # Third-party API documentation
│       ├── qwen-pic-to-video-first-pic.txt  # Qwen video API docs
│       └── Gemini-3-Developer-Guide.txt     # Gemini API docs
│
├── backend/                    # Backend application (✅ IMPLEMENTED)
│   ├── src/                    # Source code:
│   │   ├── server.js           # ✅ Startup entry (HTTP + WebSocket)
│   │   ├── app.js              # ✅ Express application setup
│   │   ├── config.js           # ✅ Configuration management
│   │   ├── db/
│   │   │   └── mongodb.js      # ✅ MongoDB connection + Workspace Model
│   │   ├── api/                # ✅ API layer (one file per endpoint)
│   │   │   ├── upload-image.js
│   │   │   ├── get-workspaces.js
│   │   │   ├── generate-video.js
│   │   │   └── ai-suggest.js
│   │   ├── websocket/          # ✅ WebSocket layer (one file per protocol)
│   │   │   ├── server.js
│   │   │   ├── workspace-create.js
│   │   │   ├── workspace-update.js
│   │   │   ├── workspace-delete.js
│   │   │   └── workspace-reorder.js
│   │   ├── services/           # ✅ Third-party integrations (one file per provider)
│   │   │   ├── video-qwen.js   # Qwen video generation (DashScope API)
│   │   │   └── llm-gemini.js   # Gemini LLM service
│   │   ├── utils/
│   │   │   └── logger.js       # ✅ Winston logging
│   │   └── __tests__/
│   │       └── integration.test.js  # ✅ Integration tests
│   ├── uploads/                # User uploaded images
│   ├── logs/                   # Application logs
│   ├── fix-image-urls.js       # ✅ Database migration script
│   ├── package.json            # Backend dependencies
│   ├── jest.config.js          # Jest testing configuration
│   ├── eslint.config.js        # ESLint configuration
│   ├── .env                    # Environment variables
│   └── .env.example            # Environment template
│
├── frontend/                   # Frontend application (✅ IMPLEMENTED)
│   ├── dist/                   # Build output
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── AICollaboration.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── VideoForm.tsx
│   │   │   ├── VideoForm.test.tsx
│   │   │   ├── VideoPlayer.tsx
│   │   │   └── Workspace.tsx
│   │   ├── services/           # API and WebSocket clients
│   │   │   ├── api.ts
│   │   │   └── websocket.ts
│   │   ├── stores/             # Zustand state management
│   │   │   ├── workspaceStore.ts
│   │   │   └── workspaceStore.test.ts
│   │   ├── types/              # TypeScript type definitions
│   │   │   └── workspace.ts
│   │   ├── hooks/              # Custom React hooks (empty for MVP)
│   │   ├── utils/              # Utility functions (empty for MVP)
│   │   ├── assets/             # Static assets
│   │   ├── App.tsx             # Application entry
│   │   ├── App.css             # Application styles
│   │   ├── main.tsx            # React entry point
│   │   └── index.css           # Global styles with Tailwind
│   ├── package.json            # Frontend dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   ├── vite.config.ts          # Vite configuration
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   ├── postcss.config.js       # PostCSS configuration
│   └── eslint.config.js        # ESLint configuration
│
├── .env                        # Root environment variables
├── .env.example                # Environment variables template
├── prompt.md                   # Project prompts and notes
└── CLAUDE.md                   # This file
```

## AI Output Resource Directory

The `ai-output-resource/` directory is dedicated to storing all AI-generated outputs and test resources created by Claude Code during development and testing. This keeps the project root clean and organized.

**Directory Structure:**
- **`test-scripts/`** - Standalone API test scripts
  - Scripts for testing third-party APIs independently before backend integration
  - Examples: Qwen video API tests, Gemini LLM tests
  - These are reference implementations and can be run directly with Node.js

- **`docs/`** - AI-generated documentation
  - API verification guides
  - Test reports and results
  - UAT readiness reports
  - Other documentation generated during development

**Usage Guidelines for Claude Code:**
- When creating test scripts for API verification, place them in `ai-output-resource/test-scripts/`
- When generating documentation (guides, reports, summaries), place them in `ai-output-resource/docs/`
- Create additional subdirectories as needed for different types of outputs
- Keep this directory separate from user-created content (like `prompt.md`)

## Development Best Practices

### Critical Development Principles

**IMPORTANT**: These principles MUST be followed in all development work to ensure system reliability and maintainability.

#### 1. DAG Task Planning and Dependency Management

When creating DAG (Directed Acyclic Graph) task plans for new features:

- **Think Carefully About Dependencies**: Before marking tasks as parallel, carefully analyze whether they have implicit dependencies
- **Self-Reflection is Required**: Ask yourself:
  - Does Task B need data/code/infrastructure from Task A?
  - Does Task B assume Task A's side effects (DB changes, file creation, etc.)?
  - Would Task B fail or behave incorrectly if Task A hasn't completed?
- **Be Conservative**: When in doubt, assume a dependency exists - sequential execution is safer than parallel execution with hidden dependencies
- **Clear Dependency Documentation**: Each task must explicitly list ALL its dependencies, not just the obvious ones
- **Example Anti-pattern**:
  - ❌ WRONG: Marking "Implement API endpoint" and "Create database schema" as parallel tasks
  - ✅ CORRECT: "Create database schema" must complete before "Implement API endpoint"

#### 2. Backward Compatibility and Non-Breaking Changes

When developing new features or requirements:

- **Add, Don't Modify (Priority #1)**: Always prefer adding new code over modifying existing code
  - Create new files/functions/modules for new features
  - Extend existing interfaces rather than changing them
  - Use feature flags to toggle between old and new behavior
- **If Modification is Unavoidable**:
  - Ensure old code paths continue to work (backward compatibility)
  - Add default values for new parameters
  - Maintain existing API contracts
  - Write migration scripts if data structures change
- **Mandatory Regression Testing**:
  - Run ALL existing tests before considering the work complete
  - Manually test old workflows to ensure they still work
  - Document any breaking changes explicitly (should be rare)
- **Example v1.1 Development** (Reference):
  - ✅ Added new fields (`duration`, `aspect_ratio`, etc.) with default values
  - ✅ Old workspaces without new fields continue to work
  - ✅ All v1.0 API endpoints still function identically
  - ✅ Integration tests verify both v1.0 and v1.1 workflows

**Golden Rule**: Old code should never break because of new features. The system must remain stable for existing users/workflows.

#### 3. Comprehensive Request/Response Logging for Testing and Debugging

When implementing any feature that involves external communication (APIs, WebSocket, third-party services):

- **Log ALL Requests and Responses**: Every HTTP request, WebSocket message, and third-party API call must be logged
  - Log request parameters, headers, body
  - Log response status, headers, body
  - Log timestamps for performance tracking
  - Log error details and stack traces
- **Structured Logging**: Use Winston logger with appropriate log levels
  - `debug`: Detailed diagnostic information (request/response bodies)
  - `info`: General operational information (API calls started/completed)
  - `warn`: Warning conditions (retries, timeouts)
  - `error`: Error conditions (failures, exceptions)
- **Purpose of Detailed Logging**:
  - **Self-debugging**: Review logs to understand what happened during execution
  - **Testing**: Verify correct API parameters were sent
  - **Troubleshooting**: Identify where failures occurred in the request/response chain
  - **Performance Analysis**: Track request durations and identify bottlenecks
- **Implementation Guidelines**:
  - Log BEFORE making external calls (intent and parameters)
  - Log AFTER receiving responses (results and status)
  - Log during error handling (what went wrong and why)
  - Use consistent log formats for easy parsing
- **Example Pattern** (from existing codebase):
  ```javascript
  logger.info('Starting video generation', { workspaceId, params });
  try {
    const response = await thirdPartyAPI.generate(params);
    logger.info('Video generation submitted', { taskId: response.task_id });
    // ... polling logic with logs
    logger.info('Video generation completed', { taskId, videoUrl });
  } catch (error) {
    logger.error('Video generation failed', { error: error.message, stack: error.stack });
  }
  ```

**Logging Best Practices**:
- Never log sensitive data (API keys, user passwords)
- Use log rotation to prevent disk space issues
- Include correlation IDs to trace multi-step operations
- Log level should be configurable via environment variables

### DAG-Based Development Workflow

**IMPORTANT**: This project uses a DAG (Directed Acyclic Graph) task execution model.

1. **Read the task index**: Start with `context/tasks/README.md` to understand the complete task structure
2. **Execute layer by layer**: Complete all tasks in one layer before moving to the next
3. **Parallel execution**: Tasks within the same layer can be executed in parallel
4. **Check dependencies**: Each task file lists its dependencies - ensure they're complete before starting
5. **Verify completion**: Each task has verification criteria - must pass before proceeding

**Execution Order:**
```
Layer 1 (Environment) → Layer 2 (Infrastructure) → Layer 3 (Core Services)
→ Layer 4 (API/Components) → Layer 5 (Integration) → Layer 6 (Testing)
```

**Frontend and Backend can be developed completely in parallel.**

### Document-First Approach
1. **Use context documents as reference** - All technical specifications are documented in `context/` directory
2. **Keep documents updated** - Documents are the single source of truth
3. **Reference DAG task plans** - Follow the layer-by-layer execution model outlined in task files

### Adapter Pattern for Third-Party APIs

**IMPORTANT**: Backend uses **single-file modules with high cohesion**, NOT traditional layered architecture.

**Video Generation Services (✅ Implemented)**:
- Qwen provider: `services/video-qwen.js` - DashScope API integration for wan2.6-i2v model
- Each file contains: API client, generate method, polling logic, status updates, WebSocket broadcasting
- Add new provider: Create one new file, implement `generate()` method
- Switch provider: Change `VIDEO_PROVIDER` in `.env`

**LLM Services (✅ Implemented)**:
- Gemini provider: `services/llm-gemini.js` - Google Gemini 3 integration
- Each file contains: API client, suggest method, prompt building, response parsing
- Add new provider: Create one new file, implement `suggest()` method
- Switch provider: Change `LLM_PROVIDER` in `.env`

**Standalone API Test Scripts** (`ai-output-resource/test-scripts/`):
- `test-qwen-video.js` - Standalone test for Qwen video generation API
- `test-gemini-llm.js` - Standalone test for Gemini LLM API
- These scripts verify API connectivity before backend integration (kept for reference)

**Module Design Philosophy**:
- One file = one complete independent feature (no separation into routes/services/models)
- API handlers (`api/*.js`): Complete logic from request to response + DB operations
- WebSocket handlers (`websocket/*.js`): Complete protocol from message receive to DB update
- Service modules (`services/*.js`): Complete third-party integration including polling and state management

## MongoDB Schema

**workspaces Collection:**
```
{
  _id: ObjectId,
  order_index: Number,
  image_path: String,
  image_url: String,
  form_data: {
    // v1.0 fields
    camera_movement: String,
    shot_type: String,
    lighting: String,
    motion_prompt: String,
    checkboxes: Object,

    // v1.1 fields (added Jan 2025)
    duration: Number,              // 5, 10, or 15 seconds (default: 5)
    aspect_ratio: String,          // '16:9', '9:16', '1:1', '4:3' (default: '16:9')
    motion_intensity: Number,      // 1-5 scale (default: 3)
    quality_preset: String         // 'draft', 'standard', 'high' (default: 'standard')
  },
  video: {
    status: String,  // pending/generating/completed/failed
    task_id: String,
    url: String,
    error: String
  },
  ai_collaboration: [...],
  created_at: Date,
  updated_at: Date
}
```

**Indexes:**
- `order_index` - Fast sorting
- `video.status` - Polling task filtering

## API Endpoints

**REST:**
- `POST /api/upload/image` - Upload image
- `GET /api/workspaces` - Get all workspaces (initial load)
- `GET /api/uploads/:filename` - Access uploaded images
- `POST /api/generate/video` - Trigger video generation
- `POST /api/ai/suggest` - AI collaboration suggestions

**WebSocket Events:**
- Client → Server: `workspace.create`, `workspace.update`, `workspace.delete`, `workspace.reorder`
- Server → Client: `workspace.sync_confirm`, `video.status_update`, `error`

## Environment Variables

Required in root `.env`:
```bash
# ============================================================
# Third-party API Keys (Required for Video Generation Project)
# ============================================================

# Video Generation Service - Alibaba Cloud Qwen (DashScope)
# Get key from: https://bailian.console.aliyun.com/
DASHSCOPE_API_KEY=

# LLM Service - Google Gemini
# Get key from: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=
```

**Backend Environment Variables** (`backend/.env`):
```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/video-maker
SERVER_PORT=3000
WS_PORT=3001

# Service provider selection
VIDEO_PROVIDER=qwen
LLM_PROVIDER=gemini

# Third-party API keys
DASHSCOPE_API_KEY=your-dashscope-key
GOOGLE_API_KEY=your-google-key

# Upload config
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=./uploads
```

## Running the Project

### Prerequisites
- Node.js (v18+)
- MongoDB (v6+)
- Valid API keys for Qwen (DashScope) and Google Gemini

### Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and add your API keys

# Start MongoDB (if not running)
mongod

# Run backend server
npm start        # Production mode
npm run dev      # Development mode with nodemon

# Run tests
npm test
```

Backend will start on:
- HTTP Server: `http://localhost:3000`
- WebSocket Server: `ws://localhost:3001`

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev      # Usually runs on http://localhost:5173

# Build for production
npm run build
```

### Database Utilities

**Fix Image URLs** (if needed after migration):
```bash
cd backend
node fix-image-urls.js
```

This script converts full URLs (`http://localhost:3000/uploads/...`) to relative paths (`/uploads/...`) in the database.

## Important Notes

### Implementation Status

**✅ Completed Features:**
- Frontend UI (React 19 + TypeScript + TailwindCSS 4)
  - Horizontal scrolling timeline
  - Image upload with drag & drop
  - Video generation form
  - Video player
  - AI collaboration interface
  - Real-time state sync via WebSocket

- Backend Services (Node.js + Express + MongoDB)
  - REST API endpoints
  - WebSocket real-time communication
  - Image upload handling
  - Video generation with Qwen API
  - AI suggestions with Gemini API
  - Winston logging
  - Integration tests

- Third-party Integrations
  - Qwen video generation (DashScope wan2.6-i2v)
  - Google Gemini 3 LLM (gemini-3-flash-preview)

**🔧 Known Issues:**
- Video generation polling mechanism needs optimization for production
- WebSocket reconnection logic could be enhanced
- Error handling for network failures needs improvement

**📋 Future Enhancements (Out of MVP Scope):**
- User authentication system
- Multi-user support
- Task queue for video generation (Redis/Bull)
- Cloud storage integration (OSS/S3)
- Monitoring and alerting (Prometheus/Grafana)
- Advanced error recovery mechanisms

### What NOT to Include in MVP
- Task queues (Redis/Bull)
- Caching layer
- Monitoring/alerting services (Prometheus/Grafana)
- User authentication system
- Permission control

### What IS Required
- Debug and error logging (Winston)
- Near real-time state sync (WebSocket)
- Flexible third-party API switching (adapter pattern)

### Error Handling
- All errors should be logged with Winston
- WebSocket errors should send `{ type: 'error', data: {...} }` to client
- Video generation failures should update `video.status = 'failed'` in MongoDB

### File Storage
- MVP uses local filesystem (`uploads/` directory)
- Architecture designed for easy migration to OSS (just change upload logic and URL storage)

## API Testing and Verification

Standalone test scripts are available in `ai-output-resource/test-scripts/` to verify third-party API connectivity before backend integration:

### Qwen Video Generation Test
**File**: `ai-output-resource/test-scripts/test-qwen-video.js`
- Tests DashScope API for video generation
- Model: wan2.6-i2v (Image-to-Video)
- Features:
  - Submit video generation task
  - Poll task status
  - Retrieve generated video URL
- Usage: `node ai-output-resource/test-scripts/test-qwen-video.js`
- Requires: `DASHSCOPE_API_KEY` in `.env`

### Gemini LLM Test
**File**: `ai-output-resource/test-scripts/test-gemini-llm.js`
- Tests Google Gemini 3 API
- Model: gemini-3-flash-preview (free tier)
- Features:
  - Basic text generation
  - Video prompt optimization (for our use case)
  - Thinking levels (low/medium/high)
- Usage: `node ai-output-resource/test-scripts/test-gemini-llm.js`
- Requires: `GOOGLE_API_KEY` in `.env`

### API Documentation
- **Qwen API**: `context/third-part/qwen-pic-to-video-first-pic.txt`
- **Gemini API**: `context/third-part/Gemini-3-Developer-Guide.txt`
- **Verification Guide**: `ai-output-resource/docs/API-VERIFICATION-GUIDE.md`
- **Test Report**: `ai-output-resource/docs/api-test-report.md`

These test scripts serve as reference implementations for backend service integration.

## Development Progress and Next Steps

### Completed Tasks (Dec 2024)

**Backend Development (All Layers Complete):**
- ✅ Layer 1-2: Environment setup, MongoDB connection, configuration
- ✅ Layer 3: Core services (Qwen video, Gemini LLM)
- ✅ Layer 4: API endpoints and WebSocket handlers
- ✅ Layer 5: Integration and error handling
- ✅ Layer 6: Testing and validation

**Frontend Development (All Layers Complete):**
- ✅ Layer 1-2: Project setup, basic components
- ✅ Layer 3: State management, API services
- ✅ Layer 4: Advanced components, WebSocket integration
- ✅ Layer 5: Integration and optimization
- ✅ Layer 6: Testing and validation

### Next Steps

1. **End-to-End Testing**
   - Test complete user workflows
   - Verify frontend-backend integration
   - Test video generation flow
   - Test AI collaboration feature

2. **Performance Optimization**
   - Optimize video polling mechanism
   - Enhance WebSocket reconnection
   - Improve error handling and recovery

3. **Production Preparation**
   - Add deployment scripts
   - Configure production environment
   - Set up logging and monitoring (optional)
   - Prepare deployment documentation

4. **Documentation**
   - Update API documentation
   - Create user guide
   - Document deployment process
   - Add troubleshooting guide

### Testing the Application

**Manual Testing Workflow:**
1. Start MongoDB
2. Start backend server (`npm run dev` in backend/)
3. Start frontend dev server (`npm run dev` in frontend/)
4. Open browser to `http://localhost:5173`
5. Test features:
   - Upload image
   - Fill video generation form
   - Submit video generation
   - Wait for video completion
   - Test AI collaboration
   - Test workspace operations (create, update, delete, reorder)

**Automated Testing:**
```bash
# Backend integration tests
cd backend
npm test

# Frontend component tests (if added)
cd frontend
npm test
```
- to memorize
- to memorize
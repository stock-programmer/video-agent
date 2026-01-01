# AI Video Generation Platform

> An AI-driven SaaS platform for collaborative creative video production workflows, featuring **Image-to-Video** generation powered by Alibaba Qwen and Google Gemini.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-blueviolet.svg)](https://claude.com/code)
[![Zero Hand-Written Code](https://img.shields.io/badge/Hand--Written%20Code-0%25-ff69b4.svg)]()

[English](README.md) | [简体中文](README.zh-CN.md)

---

## 🚀 Revolutionary Development Paradigm

> **This entire project was built through a groundbreaking Human-AI collaboration paradigm — NOT A SINGLE LINE OF CODE was hand-written by humans.**

### 📋 Specification-Driven AI Development Workflow

Instead of traditional coding, this project was created through a systematic, document-driven approach:

```
User Stories → MVP Logic → Business Planning → Business Requirements
    ↓
Product Requirements Document (PRD)
    ↓
Business & Technical Architecture Design
    ↓
Development Task Breakdown (DAG Model)
    ↓
Specification Documents → Claude Code (AI Coding Agent) → Complete Application
```

**Key Innovation:**
- **Human Role:** Strategic thinking, requirements definition, architectural design
- **AI Role:** Code generation, implementation, testing
- **Collaboration Medium:** Structured specification documents in `context/` directory
- **AI Agent:** [Claude Code](https://claude.com/code) - autonomous coding agent

This represents a new era of software development where humans focus on **WHAT to build** (via specs), and AI handles **HOW to build it** (via code generation).

**📁 All specification documents are available in the `context/` directory for reference and reproducibility.**

---

## ✨ Features

- 🎬 **Image-to-Video Generation** - Transform static images into dynamic videos using AI
- 🤖 **AI Collaboration** - Get intelligent suggestions for video parameters powered by Gemini LLM
- 📊 **Horizontal Timeline** - Intuitive workspace management with horizontal scrolling
- ⚡ **Real-time Sync** - WebSocket-based state synchronization across clients
- 🎨 **Rich Video Controls** - Camera movement, shot types, lighting, and custom motion prompts
- 🔄 **Flexible API Integration** - Easy switching between third-party video generation providers

---

## 🎯 Project Overview

This is an **MVP-stage** platform focusing on the core Image-to-Video generation workflow. Users can:

1. Upload images (storyboard frames)
2. Configure video generation parameters (camera, lighting, motion)
3. Generate videos using AI (Qwen wan2.6-i2v model)
4. Get AI-powered suggestions for optimal video settings
5. Manage multiple workspaces in a horizontal timeline

**Current Status:** ✅ Fully Implemented (Frontend + Backend + Third-party APIs)

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS 4
- **State Management:** Zustand
- **Data Fetching:** Axios + TanStack React Query
- **Drag & Drop:** dnd-kit

### Backend
- **Runtime:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Real-time:** WebSocket (ws)
- **File Upload:** Multer
- **Logging:** Winston

### Third-party APIs
- **Video Generation:** Alibaba Qwen (DashScope wan2.6-i2v)
- **LLM Services:** Google Gemini 3 (gemini-3-flash-preview)

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- MongoDB >= 6
- API Keys:
  - [Alibaba DashScope API Key](https://bailian.console.aliyun.com/)
  - [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/stock-programmer/video-agent.git
cd video-maker/my-project
```

2. **Configure environment variables**
```bash
# Root directory
cp .env.example .env
# Edit .env and add your API keys

# Backend directory
cd backend
cp .env.example .env
# Edit backend/.env
```

3. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

4. **Start MongoDB**
```bash
# Make sure MongoDB is running
mongod
```

5. **Run the application**

```bash
# Terminal 1 - Start backend (from backend/)
npm run dev

# Terminal 2 - Start frontend (from frontend/)
npm run dev
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- WebSocket: ws://localhost:3001

---

## 📁 Project Structure

```
my-project/
├── ai-output-resource/         # AI-generated test scripts and docs
│   ├── test-scripts/           # API test scripts
│   └── docs/                   # Generated documentation
├── backend/                    # Backend application
│   ├── src/
│   │   ├── api/                # REST API endpoints
│   │   ├── websocket/          # WebSocket handlers
│   │   ├── services/           # Third-party integrations
│   │   ├── db/                 # MongoDB models
│   │   └── utils/              # Utilities (logger, etc.)
│   ├── uploads/                # User uploaded images
│   └── logs/                   # Application logs
├── frontend/                   # Frontend application
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── services/           # API & WebSocket clients
│   │   ├── stores/             # Zustand state management
│   │   └── types/              # TypeScript definitions
│   └── dist/                   # Build output
├── context/                    # Development documentation
│   ├── business.md             # Business requirements
│   ├── backend-*.md            # Backend architecture docs
│   └── tasks/                  # Development task breakdown
└── CLAUDE.md                   # AI assistant guidelines
```

---

## ⚙️ Environment Configuration

### Root `.env`
```bash
# Third-party API Keys
DASHSCOPE_API_KEY=your-dashscope-key
GOOGLE_API_KEY=your-google-key
```

### Backend `.env`
```bash
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/video-maker
SERVER_PORT=3000
WS_PORT=3001

# Service providers
VIDEO_PROVIDER=qwen
LLM_PROVIDER=gemini

# API Keys
DASHSCOPE_API_KEY=your-dashscope-key
GOOGLE_API_KEY=your-google-key

# Upload configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=./uploads
```

---

## 🔌 API Endpoints

### REST API
- `POST /api/upload/image` - Upload image
- `GET /api/workspaces` - Get all workspaces
- `GET /api/uploads/:filename` - Access uploaded images
- `POST /api/generate/video` - Trigger video generation
- `POST /api/ai/suggest` - AI collaboration suggestions

### WebSocket Events
**Client → Server:**
- `workspace.create` - Create new workspace
- `workspace.update` - Update workspace data
- `workspace.delete` - Delete workspace
- `workspace.reorder` - Reorder workspaces

**Server → Client:**
- `workspace.sync_confirm` - Confirm synchronization
- `video.status_update` - Video generation status update
- `error` - Error notifications

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### API Verification
```bash
# Test Qwen video generation API
node ai-output-resource/test-scripts/test-qwen-video.js

# Test Gemini LLM API
node ai-output-resource/test-scripts/test-gemini-llm.js
```

---

## 📦 Building for Production

### Frontend Build
```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Backend Production Mode
```bash
cd backend
npm start
```

---

## 🏗️ Architecture Highlights

### Specification-Driven Design Philosophy
- **Every architectural decision was documented first, then implemented by AI**
- **Human-readable specifications** enable AI agents to generate consistent code
- **DAG-based task breakdown** ensures systematic, layer-by-layer development
- **Zero ambiguity** - specifications are precise enough for AI interpretation

### Single-File Module Design
- **High Cohesion:** One file = one complete feature
- **No Layered Separation:** Avoids traditional routes/services/models split
- **AI-Friendly:** Easier for AI assistants to understand and maintain
- **Specification Alignment:** Each module directly maps to a specification document

### Adapter Pattern for Third-party APIs
- **Flexible Provider Switching:** Change providers via environment variables
- **No Code Changes Required:** Just update `.env` configuration
- **Easy Extension:** Add new providers by creating a single adapter file

### Real-time State Synchronization
- **WebSocket + Incremental Updates:** Only changed fields are transmitted
- **Immediate Persistence:** Updates written to MongoDB instantly
- **Draft-like Auto-save:** Near real-time state sync across clients

---

## 🚧 Known Limitations (MVP)

- **Single-user assumption:** No authentication system
- **Local file storage:** Images stored in `backend/uploads/` (not cloud storage)
- **No task queue:** Video generation uses simple polling mechanism
- **Limited error recovery:** Network failures may require manual refresh

---

## 🔮 Future Enhancements

- [ ] User authentication and multi-user support
- [ ] Cloud storage integration (OSS/S3)
- [ ] Task queue for video generation (Redis/Bull)
- [ ] Advanced error recovery mechanisms
- [ ] Monitoring and alerting (Prometheus/Grafana)
- [ ] Script writing and storyboard design tools
- [ ] Text-to-Video generation

---

## 📖 Specification Documents (The Blueprint)

> **These documents are not just documentation — they ARE the source code that drove the entire development.**

The `context/` directory contains the complete specification-driven development workflow:

### Core Specification Documents
- **[Business Requirements](context/business.md)** - Product vision, MVP scope, and business logic
- **[Backend Architecture](context/backend-architecture.md)** - System design and architecture decisions
- **[API Design](context/backend-api-design.md)** - REST API and WebSocket specifications
- **[Database Design](context/backend-database-design.md)** - MongoDB schema and data modeling
- **[Development Task Breakdown](context/tasks/README.md)** - DAG-based task execution plan

### How to Reproduce This Project
1. Read the specifications in order (from business requirements to task breakdown)
2. Feed them to Claude Code or similar AI coding agents
3. Follow the DAG task execution model (layer by layer)
4. The AI agent will generate the exact same application

**This demonstrates the reproducibility and transparency of specification-driven AI development.**

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the DAG-based task execution model (see `context/tasks/README.md`)
- Read `CLAUDE.md` for AI assistant collaboration guidelines
- Use the single-file module design pattern
- Write tests for new features

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

- **xuwu** - Initial work

---

## 🙏 Acknowledgments

- [Alibaba Qwen (DashScope)](https://help.aliyun.com/zh/model-studio/) - Video generation API
- [Google Gemini](https://ai.google.dev/) - LLM services
- [Claude Code](https://claude.com/code) - AI-assisted development

---

## 📧 Contact

- **Project Link:** https://github.com/stock-programmer/video-agent
- **Issues:** https://github.com/stock-programmer/video-agent/issues
- **Email:** 273007213@qq.com

---

<p align="center">Made with ❤️ and AI</p>

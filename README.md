# 🚀 CodeSense AI - Next-Gen Codebase Impact & Requirement Intelligence

CodeSense AI is an intelligent codebase analysis and requirement blast-radius predictor. It empowers engineering teams to analyze Jira user stories, PRDs, and business requirements against uploaded codebases to pinpoint affected components, architectural dependencies, risk ratings, and implementation roadmaps before writing code.

---

## ✨ Key Features

- **🧠 AI Requirement Impact Primer**: Powered by Google Gemini AI to analyze requirements against your code structure.
- **⚡ Blast Radius & Dependency Mapping**: Pinpoints high-risk candidate files, downstream consumers, and potential breaking changes.
- **🔐 Secure Authentication & Password Recovery**: JWT authentication, bcrypt password hashing, and 6-digit OTP password reset via Gmail / Nodemailer SMTP.
- **📁 Multi-Format Codebase Ingestion**: Supports drag-and-drop ZIP archive uploads, directory trees, and indexed file graphs.
- **📊 Interactive Dashboard & Analysis History**: Star important reports, view risk badges (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), and delete past audits.
- **🛡️ Resilient Dual-Mode Database**: Native MongoDB persistence with automatic in-memory fallback for zero-setup local development.

---

## 🏗️ Project Architecture

```
ai-code-analyzer/
├── backend/
│   ├── config/              # MongoDB connection configuration
│   ├── controllers/         # Auth, Agent analysis, and Repo ingestion controllers
│   ├── models/              # Mongoose schemas (User, Repository, AnalysisHistory)
│   ├── Services/            # Gemini AI service & Nodemailer email service
│   ├── .env.example         # Environment template
│   └── server.js            # Express API server entry point
├── frontend/
│   ├── src/
│   │   ├── components/      # React components (ImpactAnalyzer, LoginPage, etc.)
│   │   ├── services/        # API client and Axios configurations
│   │   ├── App.jsx          # Main application layout & state
│   │   └── index.css        # Premium dark glassmorphism design system
│   └── vite.config.js       # Vite development configuration
└── .gitignore               # Git secret and node_modules exclusions
```

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Optional - runs in in-memory mode if not installed)
- [Google Gemini API Key](https://aistudio.google.com/)

### 2. Backend Setup
```bash
cd backend
npm install
```

Copy the environment template:
```bash
cp .env.example .env
```
Fill in your `GEMINI_API_KEY`, `JWT_SECRET`, and optional Gmail `EMAIL_USER` / `EMAIL_PASS`.

Start the backend server:
```bash
node server.js
```
The backend will run on `http://localhost:5000`.

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` (or the port displayed by Vite) in your browser.

---

## 🔒 Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Express backend port | `5000` |
| `MONGO_URI` | MongoDB connection URI | `mongodb://127.0.0.1:27017/code_impact_db` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `<random_secret>` |
| `GEMINI_API_KEY` | Google Gemini AI API key | Required |
| `EMAIL_USER` | Gmail address for sending OTP emails | Optional |
| `EMAIL_PASS` | 16-character Google App Password | Optional |

---

## 📄 License
MIT License. Built for modern software engineering teams.

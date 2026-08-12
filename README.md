# ImpactIQ - AI-Powered Code Impact Analysis & Pre-Review Platform

ImpactIQ is an intelligent developer assistant that analyzes software requirements against codebase structures, generates predictive impact maps, performs automated Senior Staff AI code reviews, and drafts GitHub pull requests using **Google Gemini AI**.

---

## 🚀 Quick Start (Root Directory)

### Start Both Services:
```bash
# Terminal 1: Start Backend API (Port 5000)
npm run backend

# Terminal 2: Start Frontend UI (Port 5173)
npm run frontend
```

Then open **`http://localhost:5173`** in your browser.

---

## 🏗️ Architecture & Flow

1. **Requirement Analysis**: Upload BRD / Jira story $\rightarrow$ Gemini AI analyzes AST candidate files.
2. **Impact Map**: Generates starting map with primary files to edit, dependent callers, and test suites.
3. **AST Dependency Graph**: Visual node inspection between controllers, services, models, and tests.
4. **Senior AI Pre-Review**: Inspects committed Git diffs for quality standards, regressions, and test gaps.
5. **PR Generator**: Automatically drafts structured PR title and description ready for review.

# AI Code Impact Analysis & Review Assistant

Enterprise-grade AI-powered multi-agent system for automated code impact analysis, AI code review, test gap detection, PR generation, and conversational repository chat. Built for MassMutual to operate securely within a regulated financial services environment.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    FastAPI Application (app/main.py)              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ /parse     │ │ /search    │ │ /impact    │ │ /chat        │  │
│  │ /review    │ │ /pr        │ │ /orchestrate│ │ /health     │  │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────┬───────┘  │
│        │              │              │               │           │
│  ┌─────▼──────────────▼──────────────▼───────────────▼────────┐  │
│  │              Master Orchestrator Service                    │  │
│  │     (Background Tasks + JSON State Persistence)            │  │
│  └─────┬──────────────┬──────────────┬───────────────┬────────┘  │
│        │              │              │               │           │
│  ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐   │
│  │ Impact     │ │ Code       │ │ Test & PR  │ │ Repo Chat  │   │
│  │ Analysis   │ │ Review     │ │ Generator  │ │ Assistant  │   │
│  │ Agent      │ │ Agent      │ │ Agent      │ │ Agent      │   │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └─────┬──────┘   │
│        │              │              │               │           │
│  ┌─────▼──────────────▼──────────────▼───────────────▼────────┐  │
│  │           Shared Services Layer                             │  │
│  │  EmbeddingService │ VectorStore │ DiffParser │ AuditLogger │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│              ┌───────────────▼───────────────┐                   │
│              │ ChromaDB  │  LLM APIs         │                   │
│              │ (Local)   │  (OpenAI/Anthropic)│                   │
│              └───────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Project Phases

### ✅ Phase 1: AI Foundation & Multi-Agent Framework
Established the backend boilerplate, environment configuration, and extensible base agent framework.
- **`BaseAgent`**: Enforces a standardized `execute()` contract with built-in LLM resilience (Tenacity retries, exponential back-off), prompt injection, and centralized JSON parsing (`_parse_json`).
- **FastAPI Core**: Async API endpoints, Pydantic configuration validation, CORS middleware, and structured logging.

### ✅ Phase 2: Repository Parser Agent
Implemented a robust parsing engine to scan a local codebase and extract semantic chunks.
- **`RepositoryParserAgent`**: Recursively scans directories, respecting `.gitignore`.
- **AST Parsing**: Extracts classes, methods, and functions with their signatures and docstrings.
- **Code Chunks**: Generates structured Pydantic `CodeChunk` models ready for vector embedding.

### ✅ Phase 3: Embedding & Semantic Search Agent
Built a secure vector embedding and retrieval pipeline.
- **Local Priority**: Uses `sentence-transformers` (`all-MiniLM-L6-v2`) by default for zero data-leakage (runs locally without sending proprietary code to public APIs).
- **Multi-Provider Support**: Supports Local, OpenAI, and Azure OpenAI embedding providers.
- **Concurrent Batching**: Uses `ThreadPoolExecutor` for parallel API-based embedding batches (up to 10 concurrent workers).
- **Vector Database**: Integrated ChromaDB for persistent, local semantic storage.
- **`EmbeddingSearchAgent`**: Handles natural language queries to retrieve the most semantically relevant code chunks.

### ✅ Phase 4: Requirement Understanding & Impact Analysis Agent
Developed an enterprise-ready engine to ingest business requirements (e.g., Jira stories) and predict code impact.
- **Extraction Engine**: Uses NLP heuristics and LLM prompts to extract core intents, domain concepts, and risk flags (security, compliance, financial).
- **`ImpactAnalysisAgent`**: Orchestrates search and reasoning to evaluate downstream risks, shared-module dependencies, and high-risk logic changes.
- **Auditability**: Produces a strictly typed `ImpactAnalysisReport` with step-by-step implementation orders and logs execution outcomes for enterprise traceability.

### ✅ Phase 5: Repository Chat Assistant
Built a conversational RAG-based AI chat assistant to interact with the codebase.
- **Conversational Memory**: Sliding-window session management to track multi-turn context without exceeding token limits.
- **`RepoChatAgent`**: Employs query rewriting (decontextualization) and strict RAG answer generation.
- **Anti-Hallucination Guardrails**: Mandates precise file path and entity citations, and forces graceful fallbacks when codebase context is missing.

### ✅ Phase 6: AI Code Review Agent
Built a multi-dimensional AI Code Review Agent designed for strict financial engineering standards.
- **`GitDiffParser`**: Accurately extracts file paths, added lines, and modified entities from raw unified git diffs.
- **Cross-Referencing**: Uses Phase 3's Vector Store to find downstream callers to predict if the diff breaks existing dependencies.
- **Multi-Perspective Prompts**: Strictly evaluates code for OWASP security flaws, performance bottlenecks (N+1 queries), and coding standards.

### ✅ Phase 7: Test Recommendation & PR Generator
Introduced an AI loop closure to ensure test coverage and compliance-ready Pull Request documentation.
- **Test Gap Analyzer**: Maps code changes to testing conventions across languages (Python, Java, JS/TS) and searches existing tests for mocked scenarios.
- **`recommend_tests`**: Generates highly granular Unit, Integration, and Security test case suggestions with mocked inputs and expected behaviors.
- **`generate_pr_draft`**: Synthesizes Jira requirements (Phase 4), code diffs, and AI reviews (Phase 6) into an enterprise-ready Pull Request draft including Breaking Changes flags and Security Notes.

### ✅ Phase 8: End-to-End Integration & Orchestration
Connected all individual agent components into a seamless, automated end-to-end workflow engine.
- **`MasterOrchestratorService`**: Chains Impact Analysis → Code Review → Test Recommendations → PR Generation into a single pipeline triggered by one API call.
- **Background Execution**: The pipeline dispatches via `BackgroundTasks` and immediately returns HTTP `202 Accepted` with a `task_id` for async polling.
- **State Persistence**: Pipeline execution state is persisted to `.state/orchestrator_state.json`, surviving service restarts.
- **API Key Security**: All critical endpoints are protected by `X-API-Key` header validation via `Depends(verify_api_key)`.
- **Audit Trail**: Enterprise-grade `AuditLogger` with automatic secret scrubbing for compliance.
- **Strict Pydantic Validation**: All LLM outputs are parsed through `model_validate()` with graceful fallbacks.

---

## Tech Stack

| Category              | Technology                                        |
|-----------------------|---------------------------------------------------|
| **Language**          | Python 3.11+                                      |
| **Web Framework**     | FastAPI (async, background tasks)                  |
| **Data Validation**   | Pydantic v2 with strict `model_validate()`         |
| **LLM Providers**     | OpenAI SDK, Anthropic SDK (hot-swappable)          |
| **Embeddings**        | Sentence-Transformers (local) / OpenAI / Azure     |
| **Vector Database**   | ChromaDB (persistent, local)                       |
| **Concurrency**       | `ThreadPoolExecutor` for parallel API batches      |
| **Resilience**        | Tenacity (retry, exponential back-off)             |
| **Security**          | API Key auth (`X-API-Key`), secret scrubbing       |
| **Testing**           | Pytest (97 unit, integration, and E2E tests)       |

---

## Project Structure

```
MASS-MUTUAL agent/
├── app/
│   ├── agents/                  # AI Agent implementations
│   │   ├── base_agent.py        # Abstract base with LLM calls, retry, _parse_json
│   │   ├── parser_agent.py      # Phase 2: Repository parsing
│   │   ├── search_agent.py      # Phase 3: Semantic search
│   │   ├── impact_agent.py      # Phase 4: Impact analysis
│   │   ├── chat_agent.py        # Phase 5: Repository chat
│   │   ├── review_agent.py      # Phase 6: Code review
│   │   ├── pr_agent.py          # Phase 7: Test recs & PR generation
│   │   └── prompts/             # LLM system & user prompt templates
│   ├── api/v1/                  # FastAPI route handlers
│   │   ├── router.py            # Health check & root
│   │   ├── parser_router.py     # POST /api/v1/parse
│   │   ├── search_router.py     # POST /api/v1/search, /embeddings
│   │   ├── impact_router.py     # POST /api/v1/impact/analyse
│   │   ├── chat_router.py       # POST /api/v1/chat
│   │   ├── review_router.py     # POST /api/v1/review
│   │   ├── pr_router.py         # POST /api/v1/pr/recommend-tests, /generate-pr
│   │   └── pipeline_router.py   # POST /api/v1/orchestrate/run, GET /status
│   ├── core/                    # Cross-cutting infrastructure
│   │   ├── config.py            # Pydantic Settings with .env loading
│   │   ├── security.py          # API key validation dependency
│   │   └── audit_logger.py      # Enterprise audit logging with secret scrubbing
│   ├── models/                  # Pydantic data models
│   │   ├── schemas.py           # AgentInput, AgentOutput base schemas
│   │   ├── code_models.py       # CodeChunk, ParseResult
│   │   ├── search_models.py     # SearchQuery, SearchResultItem
│   │   ├── impact_models.py     # RequirementInput, ImpactAnalysisReport
│   │   ├── chat_models.py       # ChatRequest, ChatResponse
│   │   ├── review_models.py     # ReviewRequest, CodeReviewSummary
│   │   ├── pr_models.py         # TestRecommendationReport, PullRequestDraft
│   │   └── pipeline_models.py   # WorkflowExecutionRequest/Report
│   ├── services/                # Business logic & integrations
│   │   ├── code_parser.py       # AST-based code extraction
│   │   ├── repo_scanner.py      # Directory scanner with .gitignore
│   │   ├── embedding_service.py # Multi-provider embedding (local/OpenAI/Azure)
│   │   ├── vector_store.py      # ChromaDB vector storage
│   │   ├── requirement_extractor.py  # NLP concept extraction
│   │   ├── diff_parser.py       # Git unified diff parser
│   │   ├── chat_memory.py       # Sliding-window conversation manager
│   │   ├── test_analyzer.py     # Test file convention resolver
│   │   └── orchestrator.py      # Master E2E pipeline with state persistence
│   └── main.py                  # FastAPI app factory & entry point
├── tests/                       # Comprehensive test suite (97 tests)
│   ├── test_health.py           # Health check & root endpoint tests
│   ├── test_parser.py           # Parser agent & AST extraction tests
│   ├── test_search.py           # Embedding & vector search tests
│   ├── test_impact.py           # Impact analysis & requirement extraction tests
│   ├── test_chat.py             # Chat agent & memory management tests
│   ├── test_review.py           # Code review agent & diff parser tests
│   ├── test_pr.py               # PR generator & test recommendation tests
│   └── test_pipeline.py         # E2E orchestrator & security tests
├── data/                        # Runtime data (ChromaDB, SQLite)
├── .state/                      # Orchestrator execution state persistence
├── scripts/                     # Utility scripts
├── .env.example                 # Environment variable template
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Quick Start

### 1. Setup Environment

```bash
# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

```bash
copy .env.example .env
# Edit .env to set:
#   - OPENAI_API_KEY or ANTHROPIC_API_KEY (required for LLM agents)
#   - API_KEY (optional, protects API endpoints with X-API-Key header)
#   - EMBEDDING_PROVIDER (defaults to "local" for zero data-leakage)
```

### 3. Run the Server

```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Interactive API Documentation

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

> **Note:** If you set `API_KEY` in your `.env`, click the **Authorize** button in Swagger UI and enter it as the `X-API-Key` value before testing secured endpoints.

---

## API Endpoints

| Method | Endpoint                            | Description                                      |
|--------|-------------------------------------|--------------------------------------------------|
| GET    | `/api/v1/health`                    | Health check                                     |
| POST   | `/api/v1/parse`                     | Parse a repository into semantic code chunks     |
| POST   | `/api/v1/embeddings/generate`       | Generate and store vector embeddings             |
| POST   | `/api/v1/search`                    | Semantic search across indexed codebase          |
| POST   | `/api/v1/impact/analyse`            | Run impact analysis on a business requirement    |
| POST   | `/api/v1/chat`                      | Chat with the repository (RAG)                   |
| POST   | `/api/v1/review`                    | Run AI code review on a git diff                 |
| POST   | `/api/v1/pr/recommend-tests`        | Get test case recommendations for code changes   |
| POST   | `/api/v1/pr/generate-pr`            | Generate a compliance-ready PR draft             |
| POST   | `/api/v1/orchestrate/run`           | 🚀 Run full E2E pipeline (returns 202 + task_id) |
| GET    | `/api/v1/orchestrate/status/{id}`   | Poll pipeline execution status                   |

---

## Testing the End-to-End Pipeline

### Step 1: Start the server
```bash
uvicorn app.main:app --reload --port 8000
```

### Step 2: Open Swagger UI
Navigate to [http://localhost:8000/docs](http://localhost:8000/docs)

### Step 3: Authorize (if API_KEY is set)
Click **Authorize** → enter your API key → click **Authorize**

### Step 4: Trigger the pipeline
Use `POST /api/v1/orchestrate/run` with:
```json
{
  "requirement_id": "REQ-101",
  "requirement_title": "Migrate to JWT Auth",
  "requirement_description": "Migrate legacy cookie-based sessions to JWT tokens.",
  "repository_id": "mass-mutual-core",
  "pull_request_id": "PR-42",
  "diff_content": "def login():\n- session['user'] = user.id\n+ token = create_jwt(user.id)\n+ return {'access_token': token}",
  "changed_files": ["app/auth.py"],
  "run_mode": "full"
}
```

### Step 5: Poll for results
Copy the `task_id` from the `202` response and use `GET /api/v1/orchestrate/status/{task_id}` to watch the pipeline progress from `Running` → `Completed`.

---

## Running Tests

The project maintains **97 passing tests** covering health checks, AST parsing, vector search, impact analysis, chat sessions, code review, PR generation, and E2E orchestration.

```bash
# Run the complete test suite
python -m pytest tests/ -v

# Run a specific phase's tests
python -m pytest tests/test_pipeline.py -v    # E2E orchestration
python -m pytest tests/test_review.py -v      # Code review agent
python -m pytest tests/test_impact.py -v      # Impact analysis
```

---

## Security

- **API Key Authentication**: All orchestration endpoints are protected via `X-API-Key` header validation. Configure the key in your `.env` file.
- **Secret Scrubbing**: The `AuditLogger` automatically redacts API keys, tokens, and passwords from all log output.
- **Zero Data-Leakage Embeddings**: Default embedding provider runs `sentence-transformers` locally — no code is sent to external APIs.
- **Enterprise LLM Options**: Supports Azure OpenAI deployments within your own tenant boundary for regulated environments.

---

## License

Internal — MassMutual. Not for public distribution.

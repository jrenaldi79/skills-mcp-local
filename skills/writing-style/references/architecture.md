# Architecture Reference

Complete architectural documentation for the writing-style pipeline.

---

## Directory Structure

Skills (code) and data (outputs) are intentionally separated:

```
~/skills/writing-style/          # Skill installation (read-only code)
├── SKILL.md                     # Main skill documentation
├── scripts/                     # Python automation scripts
│   ├── fetch_emails.py
│   ├── filter_emails.py
│   └── ... (all .py files)
└── references/                  # Supporting documentation
    ├── calibration.md
    ├── email_workflow.md
    ├── linkedin_workflow.md
    ├── data_schemas.md
    ├── script_guide.md
    ├── troubleshooting.md
    └── architecture.md (this file)

~/Documents/my-writing-style/    # User data (intermediate outputs)
├── state.json                   # Workflow state
├── venv/                        # Python virtual environment
├── clusters.json                # Cluster assignments
├── persona_registry.json        # Email personas
└── linkedin_persona.json        # LinkedIn persona

~/Documents/[name]-writing-clone/  # FINAL OUTPUT: Installable skill
├── SKILL.md                     # Main skill file
└── references/
    ├── email_personas.md        # Detailed personas
    └── linkedin_voice.md        # LinkedIn profile
```

### Primary Skill Location

**Primary:** `~/skills/writing-style/`

**Fallback locations** (checked in order if primary not found):
1. `~/Documents/skills/writing-style/`
2. `~/.local/share/skills/writing-style/`

### Why Separate Directories?

Skills are "programs" (rarely modified), data is user-specific. This enables:
- Clean uninstall without losing outputs
- Multiple users can share skill code
- Data directory can be version-controlled separately
- Skill updates don't affect user data

---

## Dual Pipeline Architecture

**CRITICAL RULE:** Never mix Email content with LinkedIn content.

### 1. Email Pipeline (Adaptive)

**Source:** Google Workspace MCP Server (handles Gmail authentication automatically)

**Nature:** Context-dependent voice that adapts based on recipient relationship

**Output:** Multiple Personas (3-7 clusters)
- Boss/Leadership persona
- Peer/Team persona
- Client/External persona
- Etc.

**Sessions:** Preprocessing (Session 1) → Analysis (Session 2) → Validation (Session 2b)

**Key Features:**
- Relationship calibration (adjusts tone by recipient seniority)
- Voice fingerprint (core patterns across all contexts)
- Example bank with confidence scores
- Validation against held-out emails

**Prerequisites:**
- Google Workspace MCP server installed (`@presto-ai/google-workspace-mcp`)
- Gmail authentication handled by MCP server
- No credentials.json or OAuth setup required

### 2. LinkedIn Pipeline (Unified)

**Source:** BrightData MCP Server (web scraping)

**Nature:** Public professional brand with consistent voice

**Output:** EXACTLY ONE Persona (unified voice)
- Single centroid representing professional brand
- No context-switching (LinkedIn is public-facing)
- Guardrails to prevent "LinkedIn cringe"

**Sessions:** Unified processing (Session 3) → Optional LLM enrichment (Session 3b)

**Key Features:**
- Engagement-weighted analysis (high-performing posts weighted more)
- Platform-specific rules (formatting, hooks, closings)
- Variation controls (prevent robotic sameness)
- Negative examples (anti-patterns to avoid)

**Prerequisites:**
- BrightData API token
- BrightData MCP server installed
- MCP_TOKEN environment variable configured

---

## Session Architecture (Context Management)

**CRITICAL:** This workflow uses strategic session boundaries to maintain clean context and deliver higher quality outputs.

### Session Structure

#### Session 1: Preprocessing (Architect)

**Purpose:** Fetch emails, filter quality, enrich metadata, cluster mathematically.

**Tasks:**
- Fetch emails with holdout validation set (15%)
- Filter for quality (remove junk)
- Enrich with metadata (recipient, seniority, structure)
- Generate embeddings
- Cluster into natural groupings

**Ends with:** Cluster summary + feedback checkpoint + validation set stats

**Context:** Heavy with fetch/filter logs (6,500+ tokens)

**Action:** Review clusters, adjust parameters if needed, then START NEW CHAT

#### Session 2: Email Persona Analysis (Analyst)

**Purpose:** Analyze email clusters and generate persona JSONs.

**Tasks:**
- LLM reads clusters
- Analyzes representative emails
- Creates persona JSONs using calibration anchors
- Runs ingest.py after each batch

**Important:** Analyst never sees validation_set/ emails (prevents context pollution)

**Context:** Can stay in this session - each cluster analysis is self-contained

#### Session 2b: Blind Validation (Judge) - Recommended

**Purpose:** Test personas against held-out emails for accuracy.

**Tasks:**
- Tests personas against held-out emails (15% reserved in Session 1)
- Shows context only, compares generated patterns to actual replies
- Suggests refinements based on mismatches
- Records user feedback

**Context:** Fresh chat for unbiased evaluation (didn't see training data)

**Why blind validation?**
- Prevents overfitting to training data
- Uses external LLM (OpenRouter) that never saw source emails
- Provides objective quality metric
- Identifies systematic errors

#### Session 3: LinkedIn Processing (Optional)

**Purpose:** Build unified professional voice from LinkedIn posts.

**Tasks:**
- Fetch posts (short-form + long-form articles)
- Filter for quality (200+ chars)
- Generate unified persona (v2 schema)
- Optional: LLM enrichment for semantic fields

**Context:** Separate from email pipeline

#### Session 3b: LLM-Assisted Refinement (Optional)

**Purpose:** Complete semantic analysis fields requiring LLM understanding.

**Tasks:**
- Export posts + current persona
- LLM completes guardrails, negative examples, annotations
- Merge results back into persona

**Context:** Can be same session as Session 3

#### Session 4: Generation

**Purpose:** Generate final writing clone skill from all personas.

**Tasks:**
- Combine email personas + LinkedIn voice
- Generate installable skill package
- Create user-facing documentation

**Context:** Clean context for final assembly

### Why Separate Sessions?

1. **Token efficiency:** Preprocessing generates 6,500+ tokens of logs
2. **Clean context:** Fresh context for creative persona analysis work
3. **Unbiased validation:** Validation requires evaluator who didn't see training data
4. **Focus:** Each session has single clear goal

### State Persistence

All progress saved to `state.json` - resume anytime without data loss.

Scripts print session boundary reminders automatically.

---

## Multi-Session Context Engineering (v3.0+)

### Problem: Token Bloat

Before v3.0, entire pipeline ran in one session:
- Fetch logs (3,000 tokens)
- Filter logs (1,500 tokens)
- Cluster logs (2,000 tokens)
- Analysis context (8,000+ tokens)
- **Total:** 14,500+ tokens of mostly irrelevant context

### Solution: Session Boundaries

v3.0+ splits pipeline into focused sessions:
- Session 1: Math operations (0 LLM tokens after completion)
- Session 2: Analysis only (8,000 tokens, all relevant)
- Session 2b: Validation only (6,000 tokens, all relevant)
- Session 4: Generation only (4,000 tokens, all relevant)

**Result:** 70% token reduction, higher quality outputs

### State Management

`state.json` tracks progress:
```json
{
  "current_phase": "analysis",
  "data_dir": "~/Documents/my-writing-style",
  "setup": {"completed_at": "2026-01-07T10:05:00Z"},
  "analysis": {
    "batches_completed": 4,
    "total_samples": 172,
    "ready_for_generation": true
  }
}
```

Resume from any phase without data loss.

---

## Data Flow

### Email Pipeline Flow

```
Gmail (MCP)
  ↓
fetch_emails.py → raw_samples/*.json
  ↓
filter_emails.py → filtered_samples/*.json (+ validation_set/ for held-out)
  ↓
enrich_emails.py → enriched_samples/*.json (adds metadata)
  ↓
embed_emails.py → embeddings.npy (sentence transformers)
  ↓
cluster_emails.py → clusters.json (HDBSCAN/K-means)
  ↓
[prepare_batch.py OR analyze_clusters.py]
  ↓
ingest.py → persona_registry.json
  ↓
[Optional: validate_personas.py → validation_report.json]
  ↓
generate_skill.py → ~/Documents/[name]-writing-clone/
```

### LinkedIn Pipeline Flow

```
LinkedIn (BrightData MCP)
  ↓
fetch_linkedin_mcp.py → linkedin_data/*.json
  ↓
filter_linkedin.py → linkedin_data/filtered/*.json
  ↓
cluster_linkedin.py → linkedin_persona.json
  ↓
[Optional: prepare_llm_analysis.py → llm_analysis_input.md]
  ↓
[Optional: merge_llm_analysis.py ← llm_output.json]
  ↓
generate_skill.py → ~/Documents/[name]-writing-clone/
```

---

## Design Principles

### Token Efficiency

1. **Offline Preprocessing:** Math operations (filter, enrich, embed, cluster) cost 0 tokens
2. **Batch Processing:** Group similar operations to avoid repeated setup
3. **Session Boundaries:** Keep phases separate for clean context
4. **State Persistence:** Resume anytime without re-work

### Quality

1. **Calibrated Scoring:** Use anchor examples for consistent tone vectors
2. **Holdout Validation:** Test against 15% held-out emails
3. **Quality Filtering:** Remove garbage before analysis (15-20% rejection)
4. **Blind Validation:** External LLM tests personas without training data exposure

### Workflow Management

1. **State Tracking:** `state.json` always reflects current progress
2. **Session Structure:** Clear boundaries between phases
3. **Automatic Saves:** State updates after each phase
4. **Separate Pipelines:** Email and LinkedIn data never mix

### Privacy

1. **Local Processing:** Intermediate data stays on user's machine
2. **Pattern Extraction:** Only patterns exported, not raw content
3. **Validation Holdout:** Held-out emails never used in training
4. **User Control:** User reviews all personas before generation

---

## v3.6 Architecture Enhancements

### Hybrid Analysis Approach

**Before v3.6:** LLM analyzed everything (expensive, inconsistent)

**v3.6:** Hybrid deterministic + LLM approach
- **Deterministic metrics (Python):** Sentence length, structure, punctuation
- **Semantic fields (LLM):** Tone interpretation, guardrails, annotations
- **Result:** 60% cost reduction, more consistent patterns

### Email Persona v2.0 Schema

**New features:**
- **Voice Fingerprint:** Core patterns consistent across all contexts
- **Relationship Calibration:** How voice adjusts by recipient seniority
- **Instruction Siblings:** Every numeric score has text explanation
- **Example Bank:** Top 3-5 emails with ≥0.85 confidence

### LinkedIn Persona v2.0 Schema

**New features:**
- **Separated Voice vs Content:** HOW you write vs WHAT you write about
- **Guardrails:** Explicit "never do" rules to prevent LinkedIn cringe
- **Variation Controls:** Ranges prevent robotic sameness
- **Negative Examples:** Anti-patterns to avoid

---

## MCP Integration Architecture

### Google Workspace MCP (Email)

**Connection:** Scripts communicate with MCP server via stdio

**Authentication:** Handled by MCP server (OAuth2)

**API Calls:**
- `gmail_list_messages`: List emails with query filters
- `gmail_get_message`: Fetch individual email content
- `gmail_search`: Search with advanced queries

**Benefits:**
- No credentials.json needed
- Authentication shared across tools
- Rate limiting handled by MCP
- Error handling standardized

### BrightData MCP (LinkedIn)

**Connection:** Scripts use internal MCPClient for tool execution

**Authentication:** API token in environment variable

**API Calls:**
- `web_scrape`: Generic scraping with browser emulation
- Rate limiting and retry logic built-in

**Token Configuration:**
1. BrightData MCP server: `API_TOKEN` env var
2. Terminal tool (desktop-commander): `MCP_TOKEN` env var

**Note:** Both must be set for LinkedIn pipeline to work

---

## Testing Architecture

### Unit Tests

**Location:** `tests/test_*.py`

**Coverage:**
- Script functionality
- Data transformations
- Schema validation
- Error handling

**Run:** `cd tests && ../venv/bin/python3 run_tests.py`

### Integration Tests

**Coverage:**
- Full pipeline execution
- State management
- File I/O
- MCP communication

### Validation Tests

**Coverage:**
- Persona accuracy against held-out data
- Blind reply generation
- User feedback loop

---

## Best Practices

### For Developers

1. **Follow TDD:** Write tests first (see claude.md)
2. **Respect Session Boundaries:** Don't merge phases
3. **Use State Manager:** Never manually edit state.json
4. **Keep Pipelines Separate:** Email and LinkedIn don't mix

### For Users

1. **Check State First:** `cat state.json` before resuming
2. **Use Calibration:** Reference `calibration.md` when analyzing
3. **Run Validation:** Always test personas against held-out emails
4. **Save Progress:** State automatically saves after each phase

### For AI Assistants

1. **Pre-flight Check:** Verify paths before starting (see SKILL.md)
2. **Session Awareness:** Respect boundaries, start fresh chats when needed
3. **State Tracking:** Check state.json before continuing work
4. **Error Handling:** Guide user through troubleshooting, don't retry blindly

# Email Pipeline Workflow

Complete workflow documentation for the email analysis pipeline.

---

## Alternative: Parallel Cluster Analysis (v3.5+)

**Purpose:** Analyze all clusters simultaneously using OpenRouter API, replacing the sequential workflow.

**When to use:**
- You want faster analysis (all clusters processed in parallel)
- You prefer script-managed analysis over manual LLM analysis
- You want automatic persona merging across clusters

### v3.6 Enhancement: Hybrid Analysis

The parallel analysis now uses a **hybrid deterministic + LLM approach**:

| Analysis Type | Computed By | Examples |
|---------------|-------------|----------|
| **Deterministic (Python)** | `email_analysis_v2.py` | Sentence length, bullet rate, greeting/closing distributions, contraction rate |
| **Semantic (LLM)** | OpenRouter API | Tone instructions, argumentation style, guardrails, relationship calibration |

**Benefits:**
- Token-efficient: Statistics computed locally, not by LLM
- Consistent: Deterministic metrics are reproducible
- Rich output: v2 schema with `_instruction` siblings for each numeric score

**Prerequisites:**
- OpenRouter API key configured (via Chatwise or `OPENROUTER_API_KEY` env var)
- Model selected via `validate_personas.py --set-model`
- Completed clustering phase (`clusters.json` exists)

### Workflow

```bash
cd ~/Documents/my-writing-style

# 1. Select model (if not already done)
venv/bin/python3 validate_personas.py --set-model 'anthropic/claude-sonnet-4-20250514'

# 2. Estimate cost before running
venv/bin/python3 analyze_clusters.py --estimate

# 3. Run parallel analysis (all clusters at once)
venv/bin/python3 analyze_clusters.py

# 4. Review the draft results
venv/bin/python3 analyze_clusters.py --review

# 5. Approve and ingest, OR reject and retry
venv/bin/python3 analyze_clusters.py --approve   # Ingest all results
# OR
venv/bin/python3 analyze_clusters.py --reject    # Discard and start over
```

### How It Works

1. **Loads all unanalyzed clusters** from `clusters.json`
2. **Builds prompts** including calibration reference and email content
3. **Calls OpenRouter API in parallel** using ThreadPoolExecutor (unlimited workers)
4. **Merges similar personas** using embedding cosine similarity (threshold 0.85)
5. **Saves draft** to `analysis_draft.json` for user review
6. **On approval:** Ingests all batches using existing `ingest.py` logic

### CLI Options

| Flag | Purpose |
|------|---------|
| `--estimate` | Show cost estimate without running |
| `--dry-run` | Simulate without API calls |
| `--review` | Show draft results for review |
| `--approve` | Approve and ingest all draft results |
| `--reject` | Discard draft and allow re-analysis |
| `--status` | Show current analysis status |
| `--model MODEL` | Override model selection |
| `--similarity-threshold 0.85` | Persona merge threshold (default: 0.85) |

### Persona Merging

When analyzing clusters in parallel, different clusters may discover similar personas (e.g., "Executive Brief" and "Executive Update"). The script automatically:

1. Generates embeddings for each persona name + description
2. Finds pairs with cosine similarity above threshold (default 0.85)
3. Merges similar personas (keeps first name, averages characteristics)
4. Updates all sample assignments to use merged persona names

### Cost Estimation

Before running, use `--estimate` to see:
- Total input/output tokens
- Estimated cost in USD
- Per-cluster breakdown

```
COST ESTIMATE
========================================
Model: anthropic/claude-sonnet-4-20250514
Input tokens: 45,000
Output tokens: 9,000
Estimated cost: $0.27

Per cluster:
  Cluster 0: 45 emails, $0.15
  Cluster 1: 32 emails, $0.12
```

### Comparison: Sequential vs Parallel

| Aspect | Sequential (Manual) | Parallel (Script) |
|--------|--------------------|--------------------|
| **Speed** | One cluster at a time | All clusters simultaneously |
| **Control** | Full manual control | Automated with review step |
| **Cost** | Uses calling LLM's tokens | Uses OpenRouter API credits |
| **Persona merging** | Manual | Automatic via embeddings |
| **Error handling** | Manual retry | Built-in retry with backoff |
| **Resume** | Via state.json | Via analysis_draft.json |

**Recommendation:** Use parallel analysis for faster processing when you have many clusters (5+) and are comfortable reviewing batch results.

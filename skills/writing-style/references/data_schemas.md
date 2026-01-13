# Data Schemas Reference

Complete schema documentation for all data structures used in the writing-style pipeline.

---

## Email Cluster Schema (clusters.json)

Output from `cluster_emails.py` containing mathematically-discovered email groupings.

```json
{
  "clustering_run": "2026-01-07T15:00:00Z",
  "algorithm": "hdbscan",
  "n_clusters": 4,
  "clusters": [
    {
      "id": 0,
      "size": 45,
      "centroid_emails": ["email_abc", "email_def"],
      "sample_ids": ["email_abc", "email_def", ...]
    }
  ]
}
```

**Fields:**
- `clustering_run`: Timestamp of clustering operation
- `algorithm`: Clustering algorithm used (hdbscan, kmeans, etc.)
- `n_clusters`: Number of discovered clusters
- `clusters[].id`: Cluster identifier
- `clusters[].size`: Number of emails in cluster
- `clusters[].centroid_emails`: Representative emails closest to cluster center
- `clusters[].sample_ids`: All email IDs in this cluster

---

## Email Persona Schema v2.0 (persona_registry.json)

Context-aware email voice profiles with relationship calibration.

**V2 Schema Features (v3.6+):**
- **Hybrid Analysis:** Deterministic metrics (Python) + semantic fields (LLM)
- **Instruction Siblings:** Every numeric score has explanation
- **Relationship Calibration:** Adjustments by recipient seniority
- **Example Bank:** Top 3-5 emails with ≥0.85 confidence

**See complete schema specification:** [email_persona_schema_v2.md](email_persona_schema_v2.md)

**Key sections:**
- `voice_fingerprint`: Core tone vectors (formality, warmth, authority, directness)
- `relationship_calibration`: How voice adjusts for different recipient types
- `linguistic_patterns`: Sentence structure, vocabulary, structural markers
- `guardrails`: Behavioral rules and off-limits topics
- `example_bank`: High-confidence email examples with annotations

---

## LinkedIn Persona Schema v2.0 (linkedin_persona.json)

Unified professional voice profile for LinkedIn content.

**V2 Schema Features:**
- **Separated Voice vs Content:** Voice patterns (HOW you write) distinct from topics
- **Guardrails:** Explicit "never do" rules to prevent LinkedIn cringe drift
- **Variation Controls:** Ranges prevent robotic sameness
- **Example Bank:** Positive examples with usage guidance + placeholder for negative examples

```json
{
  "schema_version": "2.0",
  "generated_at": "2026-01-08T21:26:21Z",
  "sample_size": 5,
  "confidence": 0.6,

  "voice": {
    "tone_vectors": {
      "formality": 7,
      "warmth": 5,
      "authority": 6,
      "directness": 7
    },
    "linguistic_patterns": {
      "sentence_length_avg_words": 16.3,
      "short_punchy_ratio": 0.30,
      "uses_contractions": true,
      "uses_em_dash": false,
      "uses_parentheticals": true,
      "exclamations_per_post": 0.6,
      "questions_per_post": 0.2
    },
    "emoji_profile": {
      "signature_emojis": ["⚽", "🤣", "🍌", "🤯"],
      "placement": "beginning",
      "per_post_range": [0, 4]
    },
    "enthusiasm_level": 6
  },

  "guardrails": {
    "never_do": [],
    "forbidden_phrases": ["synergy", "leverage", "deep dive", "game-changer"],
    "off_limits_topics": [],
    "compliance": {
      "no_confidential_info": true,
      "no_unverified_claims": true
    }
  },

  "platform_rules": {
    "formatting": {
      "line_break_frequency": "low",
      "single_sentence_paragraphs": false,
      "uses_bullets": false,
      "uses_hashtags": true,
      "hashtags_count_range": [2, 2],
      "hashtag_placement": "inline"
    },
    "hooks": {
      "primary_style": "observation",
      "allowed_styles": ["call_to_action", "observation"]
    },
    "closings": {
      "primary_style": "invitation",
      "engagement_ask_frequency": 0.6,
      "link_placement": "end"
    },
    "length": {
      "target_chars": 492,
      "min_chars": 374,
      "max_chars": 780
    }
  },

  "variation_controls": {
    "emoji_per_post_range": [0, 3],
    "question_sentence_ratio_range": [0.0, 0.2],
    "hook_style_distribution": {"observation": 1.0}
  },

  "example_bank": {
    "usage_guidance": {
      "instruction": "Match rhythm, tone, and structural patterns. Adapt to new topics.",
      "what_to_match": ["Sentence length", "Hook style", "CTA pattern", "Emoji placement"],
      "what_to_adapt": ["Topic", "Names/products", "CTA details", "Links"],
      "warning": "Do NOT copy examples verbatim."
    },
    "positive": [
      {
        "engagement": {"likes": 129, "comments": 3},
        "text": "I know there's a lot of super talented folks...",
        "category": "",
        "goal": "",
        "audience": "",
        "what_makes_it_work": []
      }
    ],
    "negative": []
  }
}
```

**Confidence Scoring:**
- `< 0.5` - Insufficient data, use defaults
- `0.5-0.7` - Reasonable patterns, some inference
- `0.7-0.9` - Strong patterns, high reliability
- `> 0.9` - Very high confidence (20+ quality posts)

**See complete schema specification:** [linkedin_persona_schema_v2.md](linkedin_persona_schema_v2.md)

---

## State Management Schema (state.json)

Persistent workflow tracking for resumable sessions.

```json
{
  "current_phase": "analysis",
  "data_dir": "/Users/john/Documents/my-writing-style",
  "created_at": "2026-01-07T10:00:00Z",
  "last_updated": "2026-01-07T10:30:00Z",
  "setup": {
    "completed_at": "2026-01-07T10:05:00Z"
  },
  "analysis": {
    "started_at": "2026-01-07T10:30:00Z",
    "batches_completed": 4,
    "total_samples": 172,
    "ready_for_generation": true
  },
  "generation": {
    "completed_at": null,
    "output_file": null
  }
}
```

**Fields:**
- `current_phase`: Current workflow stage (setup, analysis, validation, generation)
- `data_dir`: Working directory for all data files
- `created_at`: Initial state creation timestamp
- `last_updated`: Most recent state modification timestamp
- `setup.completed_at`: When environment setup finished
- `analysis.started_at`: When analysis phase began
- `analysis.batches_completed`: Number of persona analyses completed
- `analysis.total_samples`: Total emails/posts processed
- `analysis.ready_for_generation`: Whether enough personas exist for output
- `generation.completed_at`: When final skill was generated
- `generation.output_file`: Path to generated output

**Usage:**
- Check state before continuing: `cat ~/Documents/my-writing-style/state.json`
- State automatically updates after each phase
- Safe to resume from any phase

---

## Additional Schema References

### Batch Analysis Schema
Complete specification for manual analysis input/output.

**See:** [batch_schema.md](batch_schema.md)

### Analysis Output Schema
Detailed persona output format specification.

**See:** [analysis_schema.md](analysis_schema.md)

### Calibration Reference
Tone scoring anchor examples (1-10 scales) for consistent analysis.

**See:** [calibration.md](calibration.md)

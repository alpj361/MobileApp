# Vizta – Areas of Opportunity (AOO)

This document summarizes issues and opportunities identified while enabling the planner‑only flow, Grok integration, and C1 visualizations.

## Planner, Tools, Intent
- exa_search availability
  - Issue: Planner requested `exa_search` but it was not exposed in MCP/tool lists.
  - Status: Exposed in `AVAILABLE_TOOLS` and whitelisted for chat/agentic; added to Vizta tool arrays.
  - Next: Add light telemetry on result quality parity vs Perplexity.

- Unknown intent: web_extraction
  - Issue: Logged as unknown and defaulted to tool execution.
  - Opportunity: Map to `complex_analysis` (or add a first‑class intent) to reduce log noise and allow tailored synthesis.

- Time grounding & recency
  - Issue: Queries like “hoy/este mes” not always enforced across tools.
  - Opportunity: Planner should inject a strict `recency_hours` (24/48/720) and pass time range consistently to tools.

## Synthesis Quality
- Excess commentary/opinionation
  - Issue: Incident queries answered with narrative analysis vs factual aggregation.
  - Opportunity: For incident/status queries, lead with counts, dates, types, locations, links; optional 1–2 line context.

- Coverage completeness
  - Issue: Answers sometimes surface only 1–2 incidents.
  - Opportunity: Enforce a minimum sample (e.g., ≥5 if available) or state “datos limitados”.

- Source diversity
  - Issue: Insufficient diversity (e.g., same source flavor).
  - Opportunity: Require ≥2 independent local outlets per critical claim; flag when not met.

## C1 (Generative UI)
- Visualization analysis while UI disabled
  - Issue: Ran AI viz analysis even when UI was off.
  - Status: Guarded; only runs when UI and Thesys are enabled.

- HTML/markdown artifacts in visuals
  - Issue: “nn”, headings, raw HTML bleed into C1 components.
  - Opportunity: Add sanitizeForC1 to strip HTML/markdown/code fences, collapse whitespace, escape strings, and truncate long cells.

## Capture (Cards) Reliability
- JSON parsing failures (previously Hugging Face, now Grok)
  - Issue: Model sometimes returns near‑JSON with trailing prose or unclosed strings; chunks fail parsing → lost cards.
  - Opportunities:
    - Tighten system prompt: “Return ONLY a JSON array with fields […]. No prose.”
    - Add tolerant JSON repair (strip fences/trailing text, ensure quoted keys/closed strings); single retry.
    - Degrade gracefully (log once, continue) and keep counts from tool results when capture fails.

## Logging & Performance
- Duplicate EXA logs
  - Issue: “Found 10 results…” printed twice.
  - Opportunity: Deduplicate/aggregate result logs.

- Latency and chunking
  - Issue: Long end‑to‑end times (>90s) with multi‑chunk capture.
  - Opportunities: Reduce chunk size; short‑circuit capture for non‑visual flows; parallelize only when helpful; set hard time budgets.

## Data Contracts & Safety
- Planner outputs in code fences
  - Issue: Fenced JSON (` ```json ... ``` `) broke parsing.
  - Status: Strip fence utility added; planner switched to Grok (xAI) with fallback.

- Env/config
  - XAI_API_KEY required for Grok planner and capture; add readiness check and clear startup error when missing.

## Action Checklist
- [ ] Map `web_extraction` → `complex_analysis` intent (or add first‑class intent).
- [ ] Enforce `recency_hours` + min incidents in planner for “hoy/este mes”.
- [ ] Add sanitizeForC1 in synthesis; apply to all titles/descriptions/table text.
- [ ] Strengthen Grok JSON schema + one‑pass repair in capture.
- [ ] De‑duplicate EXA result logs; streamline logging.
- [ ] Add response template for incident queries (counts first, then concise list + links).
- [ ] Add telemetry on tool mix and timings to guide further tuning.


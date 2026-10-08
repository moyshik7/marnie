---
name: deep-research
description: >-
  Autonomous multi-turn web research and iterative synthesis engine.
  Use when conducting exhaustive deep research investigations, generating structured technical dossiers,
  or producing multi-source research reports.
---

# Deep Research Skill

An autonomous multi-stage research and synthesis engine that formulates diverse sub-angles, gathers external web evidence, scrapes verified sources, and conducts iterative drafting and revision passes.

## Pipeline Architecture
1. **Angle Decomposition**: Analyzes the core research topic and extracts 3 to 6 distinct investigative angles and sub-queries.
2. **Multi-Source Web Gathering**: Dispatches search queries across the web and scrapes page content for verified evidence.
3. **Draft Synthesis**: Synthesizes evidence into an initial dossier containing executive summary, methodology, technical trade-offs, and citations.
4. **Iterative Revisions**: Conducts 1 to 5 fact-checking and refinement iterations with live event stream updates.

## Access Points
- **UI View**: Open via the **Deep Research** button in the sidebar.
- **REST Endpoints**:
  - `POST /api/research`: Initiate background research run `{ topic, model, min_revisions, max_revisions, max_results }`.
  - `GET /api/research`: List all dossiers.
  - `GET /api/research/:id`: Retrieve dossier status, logs, sources, and markdown report.
  - `POST /api/research/:id/abort`: Cancel ongoing research run.

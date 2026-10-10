# Skill: `deep-research`

The `deep-research` skill guides autonomous, multi-turn investigations into complex technical questions, generating structured dossiers with verified sources and citations.

---

## 1. Capabilities & Triggers

### When to Activate
- Conducting exhaustive, multi-source research investigations.
- Comparing software libraries, architectures, frameworks, or security models.
- Synthesizing large amounts of web evidence into a polished technical report.
- Generating formal research papers with Executive Summaries, Trade-offs, and Citations.

### Architecture Pass
1. **Decomposition**: Formulates 3 to 6 targeted research sub-angles.
2. **Gathering**: Searches via DuckDuckGo/SearXNG and scrapes relevant URLs.
3. **Drafting**: Generates structured Markdown with citations and comparison tables.
4. **Iterative Refinement**: Conducts 1 to 5 revision passes to identify blind spots.

---

## 2. Recommended Usage Patterns

- **Via REST API**: Trigger background execution via `POST /api/research` with parameters:
  ```json
  {
    "topic": "Zero Trust Architecture implementation in Kubernetes",
    "min_revisions": 1,
    "max_revisions": 3,
    "max_results": 5
  }
  ```
- **Via UI**: Navigate to the **Deep Research** tab in the sidebar and enter the prompt.

---

## 3. Best Practices & Safety

- Use clear, focused topics rather than overly broad or vague queries.
- Allow the engine to complete its revision rounds for thorough fact-checking.
- Standalone reports can be exported or linked directly via their generated slugs.

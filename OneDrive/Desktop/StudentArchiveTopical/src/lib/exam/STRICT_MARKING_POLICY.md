# Strict Marking Policy

Default API behavior is intentionally strict for practice use:

- `mode = practice_strict` unless caller explicitly sends `mode: cambridge_like`
- higher fuzzy thresholds
- no fuzzy acceptance for acronym-like terms (e.g., `PNG`, `JPEG`, `OS`, `SSD`)
- minimum token-overlap checks to reduce accidental semantic matches

Rationale:
- consistency and predictable scoring
- avoid over-crediting vague or loosely related responses
- align with user requirement: stricter than official live-marking tolerance is acceptable for practice
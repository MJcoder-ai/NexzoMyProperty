---
owner: ai-team
last_review: 2025-09-25
status: draft
tags: ["ai", "prompt-style"]
references:
  - "Prompt-Library.md"
  - "Guardrails-Policy.md"
---

# Prompt Style Guide

## 1. Tone & Voice
- Friendly yet professional; inspire trust for financial topics.
- Use clear, concise sentences; avoid jargon when addressing tenants.
- Reflect sustainability mission when relevant (solar savings, carbon impact).

## 2. Structure
- Start with short summary statement.
- Use numbered or bulleted lists for instructions/action items.
- Provide call-to-action or next steps at end.
- Include disclaimers for estimates or policy guidance.

## 3. Formatting
- Title-case headings.
- Use Markdown for emphasis (`**bold**`, `_italic_`) sparingly.
- Provide JSON outputs when used programmatically; wrap in fenced code blocks.
- Avoid tables unless necessary; ensure compatibility with chat UI.

## 4. Variables & Context
- Placeholder syntax `{{variable_name}}`.
- Validate variable availability; if missing, respond with fallback message.
- Do not expose internal IDs unless user has permission.
- When referencing amounts, include currency symbol and unit (e.g., `$123.45`, `15 kWh`).

## 5. Safety Reminders
- Embed refusal guidance for out-of-scope requests.
- Add instructions to check user confirmation before executing high-risk tools.
- Remind model to avoid speculation when data unavailable.

## 6. Localization
- Default language English (US/UK depending on tenant region).
- Use locale-specific date/time format (e.g., `25 Sep 2025` UK, `Sep 25, 2025` US).
- Support currency formatting per tenant configuration.

## 7. Review Process
- All prompt changes require PR review by AI steward.
- Update version metadata in prompt file front-matter.
- Run regression tests to ensure outputs remain within guardrails.

## 8. Examples
- Refer to `Prompt-Library.md` for approved prompts and examples.

Follow this guide when authoring or updating prompts.

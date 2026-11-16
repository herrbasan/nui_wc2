---
title: Lumen Handbook
audience: engineering
---

<!-- mb:block repeat=header -->
**Lumen Handbook** — Engineering Practices
<!-- mb:/block -->

## How we work

Every page in this handbook is written for the person who will read it at 3am
without asking anyone. That constraint decides everything else.

---

## The three questions

Before you write a page, answer three questions.

- **Who reads this?** Name them. Not "engineers" — a person.
- **What are they doing?** Reading at 3am is not the same as reading on Monday.
- **What do they need to do next?** A page that does not lead somewhere is a
  dead end.

---

## Writing a runbook

A runbook is a script.

1. State the symptom, verbatim, as the reader will see it.
2. State the blast radius.
3. Give the checks, in the order a tired person should run them.
4. Give the fix, and what to do when the fix does not work.

<!-- mb:block preset=narration -->
Runbooks are read under time pressure. Every step you remove is a step someone
cannot get wrong at 3am.
<!-- mb:/block -->

---

## What we measure

| Metric | Target | Why it exists |
|---|---|---|
| Time to detect | Under 5 min | A long silence is a long outage |
| Time to mitigate | Under 30 min | Recovery beats root-cause hunting |
| Error budget burn | Under 50% | Ships are not free |

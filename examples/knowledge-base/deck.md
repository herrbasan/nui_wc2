---
title: Lumen Handbook — Walkthrough
---

<!-- mb:block repeat=header -->
**Lumen Handbook** — Engineering Practices
<!-- mb:/block -->

<!-- A slide title states a CLAIM, it does not repeat the handbook's section name.
     The two documents share content, not headings — otherwise the page carries
     two headings with the same words at the same level.

     The titles are h3, not h2: the deck is embedded in a page whose own sections
     are h2, so the deck's slides have to nest BELOW them. A deck's first heading
     is still its title — the slide surface sizes it like one. -->

### Written for 3am

Every page in this handbook is written for the person who will read it at 3am
without asking anyone. That constraint decides everything else.

---

### Three questions before you write

Before you write a page, answer three questions.

- **Who reads this?** Name them. Not "engineers" — a person.
- **What are they doing?** Reading at 3am is not the same as reading on Monday.
- **What do they need to do next?** A page that does not lead somewhere is a
  dead end.

---

### A runbook is a script

A runbook is a script.

1. State the symptom, verbatim, as the reader will see it.
2. State the blast radius.
3. Give the checks, in the order a tired person should run them.
4. Give the fix, and what to do when the fix does not work.

---

### The numbers we keep

| Metric | Target | Why it exists |
|---|---|---|
| Time to detect | Under 5 min | A long silence is a long outage |
| Time to mitigate | Under 30 min | Recovery beats root-cause hunting |
| Error budget burn | Under 50% | Ships are not free |

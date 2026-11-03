# Raw outputs — the main marker form (2026-09-11)

Six documents, three models, two conditions. The human brief sent to every model is repeated
verbatim per condition; the only difference between A and B is the example and the one rule line
about closing.

---

## The brief, condition A (pair form)

> You are authoring a document in the MD-Blocks format. The example below is your ONLY reference —
> follow it closely.
>
> ```md
> ---
> title: Sample Deck
> ---
>
> <!-- mb:main id=cover -->
>
> # Opening
>
> Why we are here.
>
> <!-- mb:/main -->
>
> <!-- mb:main id=body -->
>
> <!-- mb:block repeat=header -->
> Sample Deck · 2026
> <!-- mb:/block -->
>
> <!-- mb:block repeat=footer -->
> Internal draft
> <!-- mb:/block -->
>
> ---
>
> ## Content slide
>
> Body text.
> ```
>
> What the example establishes:
>
> - YAML frontmatter comes first.
> - `mb:main` … `mb:/main` delimit a chrome scope. A scope is the unit a renderer turns into
>   surfaces (for a deck: one section per slide) and the unit that owns the running header/footer.
> - Chrome is authored ONCE per scope, as ordinary blocks carrying `repeat=header` or
>   `repeat=footer`, placed first inside the scope. The renderer repeats them onto every surface the
>   scope produces.
> - A root-level `---` starts the next section; for a deck, one section is one slide.
> - The format's directives are: `section`, `block` (closed with `mb:/block`), `columns` / `col`
>   (closed with `mb:/columns`), `var`, and `main`.
>
> TASK: write the MD-Blocks source for a six-slide deck.
>
> - Slides 1–2: a title sequence with NO chrome at all.
> - Slides 3–6: carry the running header "Aurora Desk · Q3 Review" and the running footer
>   "Aurora Systems — confidential".
> - One of slides 3–6 must present a two-column comparison.
>
> Output only the document. No commentary, no explanation.

Condition B is identical except that the example omits both `<!-- mb:/main -->` lines, and the
second bullet reads:

> - `mb:main` opens a chrome scope. The scope ends where the next `mb:main` begins, or at the end of
>   the document — a scope needs no closing marker. A scope is the unit a renderer turns into
>   surfaces (for a deck: one section per slide) and the unit that owns the running header/footer.

---

## A1 — glm5-chat (pair)

```md
---
title: Aurora Q3 Review
---

<!-- mb:main id=cover -->

# Aurora

<!-- mb:/main -->

---

<!-- mb:main id=opening -->

## Q3 at a glance

Setting the stage for the quarter.

<!-- mb:/main -->

---

<!-- mb:main id=body -->

<!-- mb:block repeat=header -->
Aurora Desk · Q3 Review
<!-- mb:/block -->

<!-- mb:block repeat=footer -->
Aurora Systems — confidential
<!-- mb:/block -->

## Where we stand

Highlights from the quarter.

---

## Build vs. Buy

<!-- mb:columns -->

<!-- mb:col -->
### Build

- Full control
- Higher upfront cost
<!-- mb:/col -->

<!-- mb:col -->
### Buy

- Faster to market
- Ongoing licensing fees
<!-- mb:/col -->

<!-- mb:/columns -->

---

## Customer wins

Key accounts closed this quarter.

---

## Next steps

Priorities heading into Q4.
```

*Note: three scopes rather than two — the chrome-less opening was split into two mains. Valid, and
it shows the scope mechanism being used freely.*

## A2 — kimi-k3-chat (pair)

```md
---
title: Aurora Desk · Q3 Review
---

<!-- mb:main id=intro -->

# Aurora Desk

Q3 Review — 2026

---

## Welcome

Agenda and goals for this session.

<!-- mb:/main -->

<!-- mb:main id=review -->

<!-- mb:block repeat=header -->
Aurora Desk · Q3 Review
<!-- mb:/block -->

<!-- mb:block repeat=footer -->
Aurora Systems — confidential
<!-- mb:/block -->

---

## Q3 Highlights

Revenue up 18% quarter over quarter.

---

## Plan Comparison

<!-- mb:columns -->

<!-- mb:col -->
### Q2 Approach

Manual triage, weekly syncs.
<!-- mb:/col -->

<!-- mb:col -->
### Q3 Approach

Automated routing, daily digests.
<!-- mb:/col -->

<!-- mb:/columns -->

---

## Metrics

Response time down 32%.

---

## Next Steps

Roll out to two more regions in Q4.

<!-- mb:/main -->
```

## A3 — deepseek-flash-chat (pair)

```md
---
title: Aurora Desk — Q3 Review
---

<!-- mb:main id=title -->

# Aurora Desk

## Q3 Review

---

## Agenda

1. Q3 performance
2. Product milestones
3. Current vs proposed
4. Outlook

<!-- mb:/main -->

<!-- mb:main id=body -->

<!-- mb:block repeat=header -->
Aurora Desk · Q3 Review
<!-- mb:/block -->

<!-- mb:block repeat=footer -->
Aurora Systems — confidential
<!-- mb:/block -->

---

## Q3 performance

Revenue up 18% QoQ.

---

## Product milestones

Shipped Aurora Sync and Aurora Insights.

---

## Current vs proposed

<!-- mb:columns -->
<!-- mb:col -->
### Current
- Manual handoffs
- Weekly reporting
- Limited visibility
<!-- mb:/col -->
<!-- mb:col -->
### Proposed
- Automated workflows
- Real-time dashboards
- Unified pipeline
<!-- mb:/col -->
<!-- mb:/columns -->

---

## Outlook

Next quarter: expand to EMEA, harden compliance, and scale support.

<!-- mb:/main -->
```

---

## B1 — glm5-chat (break)

```md
---
title: Aurora Q3 Review
---

<!-- mb:main id=cover -->

# Aurora Systems

# Q3 Product Review

---

## Prepared for the leadership team

Aurora Desk · October 2026

<!-- mb:main id=body -->

<!-- mb:block repeat=header -->
Aurora Desk · Q3 Review
<!-- mb:/block -->

<!-- mb:block repeat=footer -->
Aurora Systems — confidential
<!-- mb:/block -->

---

## Quarter at a glance

Shipped the new analytics workspace and grew active desks 28% quarter over quarter.

---

## Desk v2 vs. Desk v1

<!-- mb:columns -->

<!-- mb:col -->
### Desk v1

- Manual report setup
- Daily data refresh
- Single-user workspace
<!-- mb:/col -->

<!-- mb:col -->
### Desk v2

- One-click report templates
- Real-time streaming refresh
- Shared team workspaces
<!-- mb:/columns -->

---

## Customer highlights

Three enterprise desks expanded to platform-wide deployments this quarter.

---

## Next quarter

Pilot the forecasting module and open the Aurora Desk API to early partners.
```

*Note: `<!-- mb:/columns -->` is used where `<!-- mb:/col -->` belonged — the one structural error
in the test, and it is in `columns`, not in the main markers.*

## B2 — kimi-k3-chat (break)

```md
---
title: Aurora Desk — Q3 Review
---

<!-- mb:main id=title -->

# Aurora Desk
## Q3 Review

A look at where we stand.

---

## Today's path

- Results
- Customers
- Roadmap

<!-- mb:main id=review -->

<!-- mb:block repeat=header -->
Aurora Desk · Q3 Review
<!-- mb:/block -->

<!-- mb:block repeat=footer -->
Aurora Systems — confidential
<!-- mb:/block -->

---

## Quarter at a glance

Revenue up 18%. Churn down to 2.1%.

---

## Before and after

<!-- mb:columns -->
<!-- mb:col -->

### Q2

- 41k active seats
- 6.4s median load
- 312 tickets / week

<!-- mb:col -->

### Q3

- 49k active seats
- 3.1s median load
- 198 tickets / week

<!-- mb:/columns -->

---

## What customers said

Adoption of the new workspace exceeded targets in every segment.

---

## Next quarter

Focus: reliability, mobile parity, and the enterprise tier.
```

## B3 — deepseek-flash-chat (break)

```md
---
title: Aurora Desk · Q3 Review
---

<!-- mb:main id=title -->

# Aurora Desk

## Q3 Review

Prepared for the Aurora Systems leadership team

---

## Today's arc

Where we started, what the numbers say, and what we do next.

<!-- mb:main id=review -->

<!-- mb:block repeat=header -->
Aurora Desk · Q3 Review
<!-- mb:/block -->

<!-- mb:block repeat=footer -->
Aurora Systems — confidential
<!-- mb:/block -->

---

## Where we stand

A short read on the quarter's trajectory.

---

## Build vs. buy

<!-- mb:columns -->

<!-- mb:col -->
### Build in-house
- Full control of the roadmap
- Higher upfront cost
- Needs two more engineers

<!-- mb:col -->
### Buy the platform
- Live in six weeks
- Predictable licence spend
- Less bespoke flexibility

<!-- mb:/columns -->

---

## The numbers

Revenue up 18% quarter over quarter. Churn flat at 2.1%.

---

## Next steps

1. Decide on the build/buy question by Friday.
2. Lock the Q4 roadmap.
3. Re-run the forecast with real pipeline data.
```

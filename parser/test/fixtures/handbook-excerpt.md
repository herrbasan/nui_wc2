---
title: Kiosk Handbook — Excerpt
version: 1.3
audience: Showroom staff
updated: 2026-09-02
print:
  format: a4
  sectionPages: true
---

<!-- mb:section id=cover label="Cover page" -->

# Kiosk Handbook

<!-- mb:block id=cover-lede preset=lead label="Cover lede" -->
Everything the floor team needs to keep the Aurora Desk kiosk healthy: daily care, the
visitor questions that matter, and what to do when something goes wrong.
<!-- mb:/block -->

![Abstract artwork — kiosk plate](images/kiosk.jpg)

*Front desk copy — replace when the version number changes.*

---

<!-- mb:section id=purpose label="Purpose and scope" -->

# Purpose and scope

This excerpt covers the two chapters the floor team asked for most: daily care and
first-line support. The full handbook lives in the back office binder.

<!-- mb:block id=audience-note preset=note label="Audience note" -->
### Note: written for shift work

Each section is one printed page. If you are reading this on paper and a section spills
onto a second sheet, the print profile is out of date — report it, do not tape it.
<!-- mb:/block -->

---

<!-- mb:section id=daily-care label="Daily care" -->

# Daily care

The morning routine takes about ten minutes and needs no tools.

<!-- mb:columns id=daily-routine weights=[2,1] label="Routine and checklist" -->
<!-- mb:col label="The routine" -->
1. Clean the screen with the microfiber cloth from the drawer.
2. Check that the attract loop is playing.
3. Start one session yourself and take the tour.
4. Log the check in the book under the counter.

<!-- mb:col preset=card label="Skip-list" -->
**Never:**

- glass cleaner on the screen
- unplugging the kiosk overnight
- skipping the tour step

The tour is how you notice a dead zone before a visitor does.
<!-- mb:/columns -->

## The weekly check

Every Friday, wipe the enclosure, test both headphones, and confirm the kiosk clock matches
the register clock. A drifting clock means the scheduled restarts are not running — that is
a first-line support item, not a cleaning item.

<!-- mb:block preset=page-break label="Force page break before the monthly section" -->
<!-- mb:/block -->

## The monthly check

Once a month, print the visitor summary from the back office and file it with the check
book. The summary takes two minutes to produce and answers the question the regional team
always asks.

The empty block above is a forced page break: it exists for paged renderers (print/PDF)
and does nothing on screen or in a slideshow. On paper this long section ends here and
"The monthly check" starts on a fresh page.

<!-- mb:block id=monthly-detail preset=card label="Monthly detail" -->
### Filing the summary

Staple the printout behind the current month's page, newest on top. Keep twelve months in
the binder; older summaries go to the archive box.
<!-- mb:/block -->

---

<!-- mb:section id=first-line label="First-line support" -->

# First-line support

<!-- mb:block id=fault-report preset=warning label="When to stop and call" -->
### Warning: when to stop and call

If the screen is dark, the enclosure is warm, or you smell electronics: turn off the wall
switch and call facilities. Do not open the enclosure. Everything else is first-line.
<!-- mb:/block -->

## The two-minute triage

<!-- mb:columns id=triage weights=[1,1] label="Symptom and first action" -->
<!-- mb:col label="If the kiosk…" -->
- is asleep → tap the corner twice
- shows the wrong language → hold both corners for five seconds
- has no sound → check the headphone jack first

<!-- mb:col label="Then…" -->
- it wakes → done
- it resets → log it
- sound returns → log it anyway

Two log entries in a week for the same kiosk means it becomes a second-line ticket.
<!-- mb:/columns -->

<!-- mb:var name=escalation -->
```json
{ "secondLine": "ext. 4410", "hours": "Mon-Fri 08:00-16:00", "slaHours": 24 }
```

The escalation data above is part of this section: a paged renderer can print it in the
margin, a page renderer can turn it into a contact card.

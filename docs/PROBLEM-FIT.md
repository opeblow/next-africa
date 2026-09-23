# Problem Fit — who NEXT Africa is for, and why it fits

Problem fit is worth 25% of the rubric. This document proves we are solving a
real, specific, African problem — not a generic productivity issue.

## The core claim

Across Africa, commitments do not live in calendars. They live in WhatsApp,
voice notes, class groups, phone calls, and forwarded documents. Every tool
that "organises your life" was built for people who sit at a desk and block
time deliberately. NEXT Africa is built the other way around: it takes the
conversation as it already happens and does the structuring quietly behind it.

## Personas

| Persona | Where their commitments arrive | Why existing tools fail them |
| --- | --- | --- |
| Amina, 24 — fashion freelancer in Lagos | WhatsApp client messages, voice notes while hand-sewing, phone calls | Can't sit at a laptop mid-work; calendar assumes she knows tomorrow's hour-by-hour plan |
| Tunde, 31 — trader at a market in Onitsha | Verbal requests side by side, stock deadlines, payment promises | Task apps need constant input and internet; the commitments are spoken, not typed |
| Chioma, 19 — undergrad in Ibadan | Group chats, forwarded PDFs, lecturer announcements | Nothing turns "the EOF document is due Thursday" into a dated, linked task |
| Dr. Bola, 45 — clinic owner | Patients, vendors, staff promises over WhatsApp | Enterprise tools are priced for salaried teams, not a solo operator |

## Scenario → feature map (every feature is one real moment)

| The real moment | What NEXT does |
| --- | --- |
| "send the proposal to Tunde before Friday 3pm, and confirm the venue for Monday's meeting" | Splits it into two structured commitments with real dates and types |
| A voice note while walking: "friday i need to send the invoice for the lagos job" | Transcribes, extracts, dates it — no typing required |
| "print the receipt and call the school about my sister's addmission" (0.2 GB file, weak signal) | File capture + low-data frontend; text works even offline-persisted |
| Two deadlines that collide on the same day | Conflict nudge raised at capture time, before it costs a client |
| "I'm still waiting on the bank statement from last week" | Waiting item that resurfaces as a nudge until resolved |
| A promise made across three WhatsApp messages over five days | Auto-linked into one project with progress — self-assembling projects |
| "Please remind me, but don't nag me" vs. "push me hard" | `proactivity_level` tuning: quiet, balanced, active |
| Weekend plan: "call Mama about Saturday visit" | Kept as an open, dated reminder alongside work commitments |

## Why existing tools were not built for us

| Tool | Assumption it makes | The African reality it misses |
| --- | --- | --- |
| Calendar apps | You block time deliberately | Work is reactive, negotiated in the moment |
| Task managers | Desktop + stable bandwidth | Data cost and connectivity are real constraints |
| Email workflows | Email is your inbox of record | WhatsApp and voice notes carry the work |
| Enterprise PM tools | Salaried teams, seats, pricing moats | Students, freelancers, traders, informal operators |

## Market honesty

- Initial surface is web/mobile-friendly + voice. A WhatsApp gateway on the
  same capture API is the shortest next step and the natural distribution
  channel for the personas above.
- Business model: waitlist-first. `proactivity_level` is the wedge — free users
  get Today + nudges, paid tiers get projects + insights, mobile-money rails
  for checkout.
# DEMO-SCRIPT.md — NEXT Africa winning demo

Total runtime target: **3 minutes 00 seconds**. One laptop, one browser, one
fallback. Everything below assumes the app is running (backend + frontend) and
you already have an account signed in.

---

## 0. Setup checklist (do this 15 minutes before your slot)

- [ ] Backend running on 3001 with the seeded account, frontend on 5173.
- [ ] Signed in; Chat screen open on the brand-new message box.
- [ ] `/projects` has a real project chain (2+ commitments linked) from earlier sessions.
- [ ] One conflict exists (two deadlines within 2 hours) so the nudge shows.
- [ ] A 5-second voice note is recorded on the laptop microphone and tested once
      live. Permission prompt accepted so it will not appear on stage.
- [ ] A screen-recorded backup video (with audio) of the whole flow saved locally.
- [ ] Phone off, notifications off. Presenter tab = only tab.
- [ ] Window maximised, text scaled to 125%. Judges sit far.
- [ ] Cue cards (optional): the first line of each beat. Nothing longer.

---

## 1. Script

### Beat 1 — Hook (0:00–0:15)

> "Thursday, 9:14pm. A client sends this:
> **'please send the proposal to Tunde before Friday 3pm, and confirm the venue
> for Monday's meeting.'**
> Two promises, one text. Tomorrow, you will forget one of them."

(Screen: the Chat screen with that message already typed in the input box,
cursor waiting. Do not paste yet.)

### Beat 2 — Pain (0:15–0:30)

> "For most of us in Africa, work does not live in a calendar. It lives in
> WhatsApp, in voice notes, in a forwarded PDF. Every app that organises your
> life was built for people who sit at a desk all day. We built the one that
> speaks the way we actually work."

(Screen: still on Chat. No clicks yet — let them feel the pause.)

### Beat 3 — Text capture (0:30–1:00)

Press Enter. Pause for the extraction (~2s). Narrate as it lands:

> "NEXT Africa turns that one message into structured commitments — instantly.
> And look at the dates: it understood that 'Friday 3pm' means Friday 3pm.
> No calendar plug-in, no manual entry — I just talked to it like a person."

(Point at the two commitment cards appearing in the Today timeline. If the
extraction is slow, the backup video takes over — see Fallbacks.)

### Beat 4 — Voice capture (1:00–1:25)

Click the microphone. Wave at the recording bar. Stop after ~4 seconds.

> "But we rarely sit and type. This is how work actually arrives here. You send
> a voice note while you're walking:
> **'friday i need to send the invoice for the lagos job' —** and NEXT Africa
> transcribes it, extracts the commitment, and the date is real."

(Point at the new card. 25 seconds — do not let this beat grow.)

### Beat 5 — From messages to a project (1:25–1:50)

Click **Projects**.

> "Here's the part we've never seen before. Tuesday I said 'start the proposal'.
> Wednesday I sent the draft. Today, this message. NEXT Africa can tell these
> are the same project — so it links them, and shows me where that project
> stands. Not a to-do list. A project that assembles itself from my messages."

(Scroll the chain. Point at progress. Then click **Nudges**.)

### Beat 6 — Catch the slip before the client does (1:50–2:25)

> "And this is the quiet win. I had two deadlines that collide — NEXT Africa
> caught it and told me. It will nudge me for the thing that's due tomorrow,
> and it will nudge me about the person I'm still waiting on. This is the
> follow-up that used to happen in my head, on a bad day, too late."

(Screen: the conflict nudge card + one due nudge visible.)

### Beat 7 — Close (2:25–3:00)

> "Two promises, one text — both of them are now on screen as done. NEXT Africa
> turns the things you say into the things you do. Because your word is already
> your plan — we just make it keep the promise."

(Screen: back on Today, both commitments marked done. *Click both checkboxes off
camera before the slide ends.*)

---

## 2. Live screen map

| Beat | Time | Screen | Action | What judges see |
| --- | --- | --- | --- | --- |
| 1–2 | 0:00–0:30 | Chat | message typed, nothing clicked | "this is the input that matters" |
| 3 | 0:30–1:00 | Today | Enter, extraction | structured cards, correct dates |
| 4 | 1:00–1:25 | Chat | voice note, extraction | real audio becomes a commitment |
| 5 | 1:25–1:50 | Projects | click, scroll | self-forming project chain |
| 6 | 1:50–2:25 | Nudges | click | conflict + due nudges |
| 7 | 2:25–3:00 | Today | mark done | promises kept, on screen |

---

## 3. Fallbacks (decide these BEFORE you go up)

1. **Extraction hangs (LLM down):** "NEXT Africa keeps working offline" — switch
   to the backup video for Beats 3–6, keep talking. Never wait on a spinner.
2. **WiFi dies at the venue:** the backup video is played; tell them what each
   screen does. This still beats 90% of teams who have no live product.
3. **You forget a line:** don't recover the line. Go to the next screen action.
   The screens carry the story; your voice is only the garnish.
4. **Microphone capture fails:** you already have the voice note **file** on
   disk — use the file dropzone instead and say "same thing, via file".

---

## 4. Q&A cheat sheet (anticipated questions)

**Q: How does it extract dates reliably?**
A: We send the current UTC time with every request and force a structured
output via OpenAI tool calling. If the model can't resolve a date, the
commitment still saves without one — nothing is lost.

**Q: Is this WhatsApp-integrated?**
A: Not yet — the input surface is designed for it (natural language, voice,
low data), so rolling a WhatsApp gateway onto the same capture API is the
shortest next step. The hard part was the extraction and linking, and it's done.

**Q: What happens with a bad LLM answer?**
A: Extraction is inside a transaction. Malformed commitments are skipped, bad
dates are nulled, and the user sees whatever was valid — the app never breaks
on a bad model response.

**Q: Can it handle African names / businesses / Naira amounts?**
A: It's tuned for natural African business English and keeps raw input forever,
so nothing is mis-parsed at capture time.

**Q: Where's the business model / who pays?**
A: Waitlist-first. The proactivity level (quiet/balanced/active) is the
subscription wedge: free users get today + nudges, paid tiers get projects and
insights. Mobile-money checkout is the planned rails.

---

## 5. The four rules

1. **Live or video — never a screenshot walkthrough.**
2. **One number per sentence.** (2 promises, 1 text — that's it.)
3. **End on "the thing is done"**, not on a feature list.
4. **Keep the clock visible.** Land the close inside 3:00; a clean finish beats
   a brilliant one that runs over.
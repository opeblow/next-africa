# Live AI validation — 25 September 2026

Tested the local API against real OpenAI calls with synthetic client messages, a generated screenshot, a text PDF and synthesized speech. No personal documents were sent.

| Check | Result |
| --- | --- |
| Live text capture | Pass |
| Nairobi tomorrow at 3pm | Pass |
| Conflict warning | Pass |
| Cross-message project link | Pass |
| Next Monday at 10am | Pass |
| Live follow-up draft | Pass |
| Draft leaves task open | Pass |
| Text attachment | Pass |
| Screenshot vision | Pass |
| Live PDF capture | Pass |
| Live voice capture | Pass |

The first run found incorrect AI date arithmetic (double timezone conversion and a wrong weekday). The model now copies the original date phrase and server code resolves calendar dates in the saved timezone. Regression tests cover Nairobi, a local-midnight boundary, explicit offsets and date-only deadlines. Date-only commitments use 23:59 local time.

26 automated backend tests, lint and frontend production build passed. Live requests in the final sample took about 1.1–3.2 seconds. These are small synthetic examples, not a comprehensive quality benchmark. Project links are AI suggestions and can still be imperfect.

Browser push delivery to a real device remains unverified. Scanned PDF OCR and autonomous message sending are not implemented. Follow-up drafts remain editable and unsent.

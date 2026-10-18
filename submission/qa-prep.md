# GAVEL — Q&A prep

Five-minute pitch, two minutes of questions. The deck already carries a 5:00 timing plan in the
speaker notes. This sheet is for the two minutes after.

## The questions a judge will actually ask

**1. "Is this really agentic, or three prompts bolted onto a rules engine?"**
Deliberately bounded. The forensic tools are deterministic and run before any officer is drafted, so the
model cannot choose what to inspect — that is what stops the suspicious message from steering the
investigation. The agents do the advocacy (prosecutor, defence, clerk), their drafts pass a
character-for-character grounding gate, and a failed draft is replaced by a deterministic bench. Measured:
8/12 drafts passed the gate on the primary model; the courtroom finished every time.

**2. "How is this different from a blocklist or the carrier's spam filter?"**
A blocklist can only say yes. GAVEL quotes the exact words that raised the charge, argues the innocent
reading, can acquit a genuine delivery notice, and when the evidence is split it says HUNG JURY instead of
guessing. Then it turns the verdict into the next five minutes of action.

**3. "Does it actually reduce harm? Where is the behaviour evidence?"**
We have detection evidence, not behaviour-change evidence: 96.8% precision, 96.0% committed recall, 0.44%
false alarms on 1,032 held-out messages, reproduced by the repo's own scripts. The next study is a
pre/post trial on the sentencing desk (checklist completion, cooling-clock use) with consent. Say this
plainly — overclaiming here loses more than it gains.

**4. "What happens when the model or the network fails?"**
The court completes. Without a model service the scripted bench compiles the speeches from the exhibits;
without a network, every decoder and the adjudicator still run in the browser. The live grace is five
seconds, so no trial stalls waiting on a model.

**5. "Why won't the banks just build this?"**
They can license it instead: one engine serves the consumer app and an institutional API. The consumer
product is the distribution and the evidence base; the institutional licence is the revenue.

**6. "What about Bahasa Malaysia, and scams the rules have never seen?"**
Both docketed as limits: the classifier learned from an English-labelled SMS corpus, and local slang leans
on pattern rules; brands outside the register cannot be defended by it. Regional corpora and a
consent-based public-record check are next.

## Stage checklist

- Slide 12 contains the 93-second film as embedded media (`media1.mp4`). Click it in slideshow; it plays
  from inside the .pptx, with no network and no separate file.
- Backup: `submission/GAVEL-demo.mp4` on a USB stick, in case the organiser's PowerPoint cannot decode the
  embedded media.
- The only file that must reach the organiser is `submission/GAVEL-pitch.pptx` (12 slides). The proposal PDF
  is submitted online and must stay at two pages.
- If a live trial is run: it completes in roughly 10–20 seconds, and the analysis itself is ~0.06 ms. The
  deployed URL is `gavel-liard.vercel.app`; the rate limit is per browser session (60 per five minutes),
  so judges scanning the QR do not exhaust each other's budget.
- If the venue network is down, run the trial with `GAVEL_FORCE_SCRIPTED=1`: the courtroom still completes.

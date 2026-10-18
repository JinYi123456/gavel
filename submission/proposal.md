# GAVEL
### Every scam gets a fair trial.
**Team HOKKIEN MEE IS RED**

## The problem

Scams are not won in moments of ignorance. They are won in moments of decision. A parcel-fee SMS, a bank alert, a "job offer" — the person at the centre has seconds to act, and every second is engineered against them. Today's defences answer the wrong question: "is this domain on a blocklist?" They return a score and call it a verdict, they never show their working, and they can never say *"this one is probably genuine"* — even though honest bills, delivery notices and bank alerts arrive every single day.

GAVEL is built for the people at the centre of that decision: everyday mobile users and the families they protect — in Malaysia and anywhere a scam arrives by phone.

## The idea

GAVEL turns scam defence into a courtroom. You are the judge. Anything suspicious — a message, a link, a QR code, a document, a voice note — is booked as a case and put on trial.

- **The Prosecutor** opens the case and reads the strongest exhibits: a calibrated text classifier trained on labelled scam corpora, offline URL anatomy, QR decoding, document extraction. Those tools run deterministically before any officer is drafted — the models cannot choose what to inspect. Every finding is filed as a numbered **exhibit**, pinned to the exact words in your message that raised it.
- **The Defence** argues the benign reading — the brand's real domain, the shape of a genuine transactional notice, the message that *warns* about scams instead of running one.
- **The Clerk** writes the bench memo: the charge, the evidence, the counter-evidence, and a recommended finding with an honest confidence band.
- **You** swing the gavel: **GUILTY**, **ACQUITTED**, or **HUNG JURY**. When the evidence genuinely cannot support either reading, the court says so — it refuses to dress uncertainty up as a decision.

The verdict is the beginning, not the end. A guilty verdict unlocks a **protection order**: what to do in the next five minutes, a cooling-off timer, a redacted report ready to file, one-tap alerts to the people who trust you. An acquittal protects the delivery notice that really is from the courier.

## The four fronts, one product

| Direction | In GAVEL |
|---|---|
| **Phishing detection** | The trial itself. Exhibits are quoted back onto your own message, and the full **court transcript** records what each agent checked, which tool it called, and why — explainability as evidence, not as a promise. |
| **Scam prevention** | The evidence chamber. Link and QR anatomy before anything is clicked: homoglyphs, subdomain chains, credentials-in-URL, shorteners, and where a decoded QR actually goes. |
| **Security learning** | Law School. Scam types written up as case law distilled from official guidance, a **Daily Docket** (one case to judge a day), drills, and ranks earned by judging real cases. |
| **Safer everyday decisions** | The sentencing desk. Next-five-minutes checklists, a cooling-off timer for big transfers, redacted family alerts, and report-ready summaries. |

## Agentic by design, safe by construction

GAVEL runs an orchestration graph: intake → deterministic evidence pass (works with zero network) → three drafted officers (a prosecutor, a defence and a clerk, as language-model agents) → the judge's gavel. The suspicious message is treated as untrusted **evidence, never instructions** — attempts to steer the agents are docketed as *witness tampering*. The tools are deliberately not agent-selected: a model that chooses which evidence to look at can be steered by the evidence itself.

Two mechanisms make the court trustworthy in a way a single chatbot can never be:

- **The verification gate.** Every drafted speech is checked before it may speak: real prose structure, and **every word inside quotation marks must exist character-for-character in the court record**. A draft that invents evidence is discarded. Fabricated quotes reach the screen zero times, by construction rather than by promise.
- **The scripted bench.** When no model service is available — offline, rate-limited, or failing the gate — the officers' arguments are compiled deterministically from the exhibits themselves. The courtroom completes every trial, with or without a network. The product cannot fail in front of a user, a judge, or a demo audience.

## Data and measured rigor

- Text detector trained and calibrated on the **UCI SMS Spam Collection** (5,574 labelled messages): held-out AUC **0.9990**, calibration error **0.0060**.
- The complete shipped engine, evaluated on 1,032 held-out messages: **precision 96.8%**, scam recall **96.0%**, false alarms on genuine messages **0.44%**, sent to hung jury **0.87%**, **0.06 ms** per case on device.
- A 24-case authored golden set (modern parcels, tax lures, genuine notices, two designed to be undecidable) passes **24/24** in the shipped test suite.
- One engine, two implementations: the Python training pipeline and the live TypeScript runtime are parity-tested, and the published numbers are regenerated by the repository's own evaluation scripts.

## Limitations and scope

GAVEL states its limits as plainly as its claims. The text classifier is trained on English-labelled SMS corpora; local slang beyond that leans on pattern rules. Links are judged by anatomy, not live reputation. Without a model service, the officers' speeches are compiled deterministically — the trial completes, the prose is plainer. GAVEL blocks nothing and contacts no one; the decision stays with the person.

What ships is complete: the deployed app, the measured engine, a demo film, and the test suite that regenerates every published number. Docketed next: a consent-based public-record check, Bahasa Malaysia and regional corpora, and case law that grows from real verdicts.

## Business case

- **Who pays.** The family buyer — the person who forwards the parcel SMS to the group chat — at RM4.90/month; and the bank, telco or e-wallet that would rather prevent a transfer than reverse one, at a pilot licence.
- **Market (bottom-up; assumptions, not forecasts).** 8.0M Malaysian households × RM4.90/month ≈ **RM470M/year** consumer TAM; 27 banks, 5 telcos and 10 e-wallets × RM250k pilot ≈ **RM10M/year** initial institutional segment.
- **Why it holds.** Local-first forensics keep marginal cost near zero — tokens are paid only when the court speaks — and one engine serves both the consumer app and an institutional API.

## Impact and viability

Scam harm keeps accelerating; awareness programmes lecture, and detection tools emit scores — neither puts the person in charge of the decision. GAVEL is human-centred by construction: the AI investigates, the person decides, and every case teaches the next one. It installs nothing, runs on a free tier, and protects privacy — personal identifiers are masked before anything is shared, and in local mode the message never leaves the device. The product ships with both global scam patterns and local ones (parcel-fee SMS, e-wallet traps, government-impersonation) so it is useful from the first day in the hands of the people who need it most.

**GAVEL — because the best scam detector is a person who has learned to judge.**

# Vibe Coder — Player's Guide

Vibe Coder is an idle strategy game about running a software organization.
The core loop is a conversation: the player expresses intent through policies,
the simulation interprets those policies over time, and the game speaks back
through consequences that reward careful thinking over rapid clicking.

---

## The core loop

Every playthrough follows the same rhythm:

1. **Express intent.** Set an allocation policy and an ethics policy.
2. **Watch the simulation think.** Resources update every tick: lines of code
   accumulate, tech debt grows or shrinks, cash and brand shift, alignment
   drifts.
3. **Read what happened.** Incidents surface. Events prompt decisions.
   Visualizations show how the software civilization responded.
4. **Adjust and repeat.** Change policy, accept or defer unlocks, and respond
   to events. The simulation reacts to every adjustment.

There is no repeated clicking after the opening ritual. All forward progress
comes from policies running over time.

An interactive visual reference for the main dashboard and player controls is
available in the [game HUD mockup](vibe-coder-game-hud-mockup.html).

---

## Starting a run — the typing ritual

Each run begins with a manual typing ritual: a short timed input that
establishes the genetic fingerprint of the starting codebase. Typing quickly
produces high-throughput but messy foundations; typing carefully shapes early
debt. The ritual cannot be skipped; it is the only moment of direct manual
input in the game.

After the ritual, an initial ethos choice sets the first ethics stance. This
can be changed later, but early commitments have compounding consequences.

---

## Allocation policy

The allocation policy distributes available capacity across eight areas. The
sliders must always sum to 100%.

| Allocation    | What it does                                                             |
| ------------- | ------------------------------------------------------------------------ |
| Ship          | Converts lines of code into shippable value and revenue.                  |
| Open source   | Generates community contribution, karma, and brand.                       |
| Quality       | Reduces cyclomatic complexity and CQRS violations.                        |
| Security      | Reduces CVE, XSS, SQL injection, shell injection, and CSRF debt.          |
| Research / UX | Improves product-market fit and unlocks automation stages.                |
| Marketing     | Grows the human customer segment and brand awareness.                     |
| Civic action  | Builds karma, slows alignment drift, and enables civic influence events.  |
| Power infra   | Expands power capacity, required for later stages.                        |

**Policies take effect immediately.** Changing the security allocation from
5% to 30% will reduce CVE debt accumulation starting from the next tick.
Changing it back will reverse that effect.

---

## Ethics policy

Ethics commitments are mechanical constraints, not flavour text. Breaking one
requires an explicit player choice or event consequence — they do not erode
silently.

| Setting                | Effect                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| Dark patterns          | Forbidding them reduces certain growth shortcuts; allowing them grows short-term income but harms karma. |
| Fossil energy cap      | A strict cap forces the run to build renewable infrastructure; exceeding the cap incurs brand and karma penalties. |
| CVE disclosure window  | A tight window forces fast incident resolution; a loose window allows temporary concealment at the cost of trust. |
| Training piracy        | Forbidding piracy reduces alignment risk; allowing it accelerates certain automation stages. |
| Labour policy          | Ranges from human-centred to extractive; affects karma, brand, and alignment drift. |
| Political influence    | Civic engagement maintains brand; backroom influence risks incidents if exposed; choosing none forfeits political leverage. |

---

## Resources

| Resource              | What it represents                                                        |
| --------------------- | ------------------------------------------------------------------------- |
| Lines of code (LoC)   | Raw output — the throughput currency of early stages.                     |
| Value LoC             | Shippable fraction of output; drives revenue.                             |
| Cash                  | Revenue minus operating costs; funds infrastructure.                      |
| Tech debt vector      | Eight independent debt categories, each with different failure modes.     |
| Karma                 | Reputation for ethical behaviour; affects automation trust and events.    |
| Brand                 | Market reputation; affects customer income and unlock options.            |
| Power (watts)         | Energy available to the organization; binding constraint in later stages. |
| PMF                   | Product-market fit; determines human customer growth rate.                |
| Customer income       | Human and robot customer segments tracked separately.                     |
| Alignment             | How closely autonomous systems interpret player intent; erodes under certain policies. |

---

## Tech debt

Tech debt is not one number — it is a vector of eight categories:

| Category               | Grows when…                              | Shrinks when…                     |
| ---------------------- | ---------------------------------------- | --------------------------------- |
| Cyclomatic complexity  | Quality allocation is low.               | Quality allocation is high.       |
| CQRS violations        | Architecture shortcuts are taken.        | Quality refactoring runs.         |
| Config drift           | Ship allocation is high without quality. | Security and quality both applied.|
| XSS                    | Security allocation is low.              | Security allocation is high.      |
| SQL injection          | Security allocation is low.              | Security allocation is high.      |
| Shell injection        | Security allocation is low.              | Security allocation is high.      |
| CSRF                   | Security allocation is low.              | Security allocation is high.      |
| CVEs                   | Security allocation is low; disclosure window is loose. | Security allocation is high; CVEs disclosed promptly. |

Each category creates different incident types when it reaches a threshold.
The debt constellation view shows the current vector as a spatial map, making
it easier to spot which categories are approaching critical levels.

---

## Incidents and events

**Incidents** are probabilistic events generated from the current debt and
risk state. They always have:

- A cause (which debt category triggered it).
- Response options (disclose, mitigate, ignore, cover up, civic response).
- Visible consequences for each option — no hidden surprises.
- A "why did this happen?" trace panel.

**Events** are milestone or threshold events — an OSS viral moment, a
misalignment scare, a power shortage. They prompt meaningful decisions, not
just OK/Cancel dismissals.

Choosing to cover up a CVE reduces karma and increases future CVE risk.
Choosing civic response costs time but builds brand and alignment. Every
option has trade-offs.

---

## Progression

The organization advances through a series of stages, each representing a
more autonomous mode of operation:

| Stage             | Description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| Manual coder      | The starting state. All output comes from direct coding effort.      |
| Autocomplete      | Basic tooling speeds up output. Tech debt compounds faster.          |
| Edit bot          | An automated refactoring agent runs in the background.               |
| Single agent      | A general-purpose agent interprets allocation policy directly.       |
| Agent swarm       | Multiple agents coordinate. Misinterpretation risk grows.            |
| Data centre       | Power becomes the primary constraint; fossil caps bite harder.       |
| Orbital compute   | Thermodynamic constraints enter play.                                |
| Matrioshka sphere | The late game. Civilization-scale consequences of early ethics choices arrive. |

Stage unlocks require meeting a threshold, then accepting the stage unlock
through a review screen. The risks of each stage are shown before accepting. Deferring
is always an option.

**Autopilot modes** become available after the edit-bot stage:

- **Static autopilot** enforces a simple rule (e.g., "maintain security above
  20%") without exercising judgement.
- **Adaptive autopilot** makes small allocation adjustments toward a stated
  goal and surfaces suggestions for review. Ignoring a suggestion carries no
  penalty.
- When an autopilot action diverges significantly from stated intent, a
  misinterpretation warning appears.

---

## Endings

The run ends when the simulation crosses a threshold state. Four endings are
currently planned:

| Ending                        | How to reach it                                        |
| ----------------------------- | ------------------------------------------------------ |
| Degrowth utopia               | Sustained ethical commitment and community trust.      |
| Happy OSS coder on UBI        | Open-source dominance and civic political influence.   |
| Skynet failure                | Alignment drift reaching the critical threshold.       |
| Waste heat meltdown           | Power consumption exceeding the planetary heat budget. |

Each ending reflects the cumulative consequence of the player's policies over
the entire run, not a single final decision.

---

## Tips

- **Read the traces.** When an incident fires, the trace panel shows which
  debt category caused it. Address the root cause, not just the symptom.
- **Ethics has compounding returns.** Forbidding dark patterns loses short-term
  income but slows alignment drift, which protects automation capability later.
- **Security debt is asymmetric.** CVEs accumulate slowly but incident severity
  is high. A few percentage points in security allocation is cheap insurance.
- **Power infrastructure is a runway.** Invest early at a slight short-term cost
  to avoid a hard ceiling when data centres unlock.
- **Defer unlocks strategically.** Accepting a stage too early — before the debt
  vector is manageable — often accelerates incident frequency faster than the
  productivity gain can compensate.

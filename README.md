# 🎮 Vibe Coder

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](
https://deepwiki.com/leynos/vibe-coder)

*An offline-first idle strategy game where you manage a software civilization.*

You do not grind clicks. You express intent — allocating effort across
shipping, open source, quality, security, and marketing — then watch a
deterministic simulation interpret that intent. Intervene when the consequences
become interesting, alarming, or weirdly beautiful.

______________________________________________________________________

## Why Vibe Coder?

Most idle games reward compulsive clicking. Vibe Coder rewards thinking.

- **Policy over grind**: express high-level intent (allocations, ethics
  constraints) instead of clicking buttons every second.
- **Emergent consequences**: deterministic simulation produces technical debt,
  revenue swings, brand crises, and viral open-source moments from your choices.
- **Ethics as mechanics**: dark patterns, CVE disclosure timelines, fossil fuel
  caps, and labour policy are first-class gameplay levers — not cosmetic
  flavour.
- **Multiple endings**: reach a degrowth utopia, UBI paradise, Skynet failure,
  or waste-heat meltdown depending on how you steer the civilization.
- **Offline-first PWA**: installs to your home screen and plays without a
  network connection.

______________________________________________________________________

## Quick start

### Prerequisites

- [Bun](https://bun.sh/) 1.1 or later
- A modern evergreen browser (ES2022)

### Installation

```bash
git clone https://github.com/leynos/vibe-coder.git
cd vibe-coder
bun install
```

### Development server

```bash
bun dev
```

Open `http://localhost:5173` in your browser. The app supports hot-module
replacement — changes appear immediately.

### Production build

```bash
bun build
bun preview
```

______________________________________________________________________

## Features

- **Deterministic simulation** — reproducible tick-based engine; the same seed
  and policy sequence always produces the same run.
- **Tech debt vector** — eight tracked debt categories (complexity, config
  drift, XSS, SQL injection, shell injection, CSRF, CVEs, and more) that grow
  and bite back.
- **Policy sliders** — allocate effort across ship, OSS, quality, security,
  marketing, and more; rebalance at any time.
- **Ethics constraints** — cap fossil energy consumption, mandate CVE
  disclosure windows, ban dark patterns, set labour policy.
- **Incident system** — random and deterministic events (security breaches,
  viral moments, regulatory fines) demand decisions with lasting consequences.
- **Progression unlocks** — grow from a solo developer to orbital compute and
  Matrioshka dyson swarms across ten-plus civilization stages.
- **Reactive audio** — Web Audio engine responds to simulation events with
  layered generative music.
- **Canvas visualization** — live city aquarium, debt constellation, and
  power/heat displays.
- **Self-play balancing** — adversarial agents tune parameters to prevent
  dominant strategies and detect exploits.
- **Accessible** — WCAG 2AA compliance, full keyboard navigation, reduced
  motion support.
- **Internationalized** — i18next + Mozilla Fluent; RTL-ready.

______________________________________________________________________

## Quality gates

Run the full suite before committing:

```bash
bun test:all
```

Individual gates:

```bash
bun fmt             # format
bun lint            # Biome lint
bun check:types     # TypeScript type check
bun test            # unit tests (Bun)
bun test:a11y       # accessibility tests (axe-core)
bun test:e2e        # end-to-end tests (Playwright)
bun semantic        # extended semantic lint suite
```

______________________________________________________________________

## Learn more

- [High-Level Design](docs/vibe-coder-high-level-design.md) — product vision,
  domain model, simulation contract, and implementation priorities.
- [Architecture Decision Records](docs/contents.md) — eleven ADRs covering
  offline-first PWA, hexagonal architecture, XState orchestration, Dexie
  persistence, deterministic simulation, adversarial self-play, audio pipeline,
  and more.
- [Roadmap](docs/roadmap.md) — delivery sequence and progress.
- [Developers' Guide](AGENTS.md) — code style, contribution guidelines, and
  tooling reference.

______________________________________________________________________

## Licence

ISC — see [LICENSE](LICENSE) for details.

______________________________________________________________________

## Contributing

Contributions are welcome. Please read [AGENTS.md](AGENTS.md) for code style,
commit conventions, and quality gate requirements before opening a pull request.

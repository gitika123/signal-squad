# Signal Squad

A polished cooperative browser game where the player and an autonomous squadmate recover signal shards, return them to a shared beacon, and defend their connection from increasingly aggressive glitches.

Signal Squad is intentionally a small, finished game rather than a broad prototype. It demonstrates a complete game loop, responsive input, AI steering, collision systems, difficulty scaling, state management, generated audio, accessible UI, and production-minded tests in a dependency-light TypeScript codebase.

## Play

- Move with **WASD** or **arrow keys**.
- Carry up to three amber signal shards at a time.
- Return to the center beacon to convert cargo into team score and restore the squad link.
- Press **Space** to pulse nearby glitches away. The pulse has a short cooldown.
- Keep the shared squad-link meter above zero for the full 75-second mission.
- On mobile, use the on-screen direction pad and Pulse control.

## Engineering highlights

- **Game architecture:** deterministic frame loop, explicit ready/playing/paused/ended states, delta-time movement, and isolated pure scoring and geometry functions.
- **Gameplay systems:** responsive player movement, autonomous teammate steering, escalating hazard spawning, collision detection, cargo capacity, streak multipliers, shield recovery, particles, and Web Audio feedback.
- **Product quality:** keyboard and touch support, reduced-motion behavior, semantic controls, live activity announcements, responsive layouts, local best-score persistence, and zero analytics or tracking.
- **Maintainability:** strict TypeScript, no runtime dependencies, focused unit tests, automated build verification, and GitHub Pages deployment.
- **Integration seam:** the party code and live comms interface form a clean boundary for a future realtime backend or Discord Social SDK adapter without coupling the core game simulation to a platform API.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`.

## Validate

```bash
npm test
npm run typecheck
```

## Project structure

```text
src/core.ts        Pure geometry, formatting, party-code, and scoring rules
src/game.ts        Game state, AI, input, collisions, audio, UI, and rendering
tests/             Node test suite for core gameplay rules
scripts/serve.mjs  Dependency-free local static server
```

## Next platform milestone

The next iteration would replace the local party adapter with authenticated lobby presence and invite flows, then synchronize player inputs through a server-authoritative session. The existing game loop, party code, feed, and player-state boundary are designed so that work can be added without rewriting rendering or scoring.

## License

MIT © 2026 Gitika Rath

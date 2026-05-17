# WCGW

WCGW is an experimental design tool for marble-to-drum timing.

It tries to answer a practical builder question: if a marble rolls down a ramp, leaves the ramp, flies through the air, and hits a drum, how close can that setup get to a target impact time and impact speed once real build tolerances are included?

This repo is for people who want to inspect, question, or improve that model.

WCGW is meant to be a fast sanity check before physical iteration:

- solve a plausible nominal geometry
- vary the build and material parameters
- see which checks fail
- inspect representative runs
- share an exact configuration with someone else

It is not a substitute for testing hardware.

## The Model

If you are here for the physics or engineering assumptions, start with `solve.ts` and `simulation.ts`.

`src/model/solve.ts` solves the nominal blueprint. Given target timing, target normal impact speed, ramp angle, drum angle, and tolerances, it computes the ramp length and release point that should work on paper.

`src/model/simulation.ts` simulates realized blueprint:

- release from rest
- ramp roll or slide
- ballistic flight
- impact detection against the drum surface
- bounce from restitution, tangential friction, and spin transfer


## What It Currently Models

- ramp geometry solved from a requested release-to-impact time
- normal impact speed target
- ramp acceleration from gravity, rolling inertia, and ramp efficiency
- static friction checks for no-slip rolling
- kinetic friction while sliding
- ballistic flight under gravity
- drum pivot geometry before impact
- normal bounce via restitution
- tangential loss via impact friction
- spin/tangent exchange via spin transfer
- sampled build/material tolerances

## Known Gaps

This is an approximate model, not a validated physics engine.

Important simplifications:

- the marble starts at rest
- air drag is ignored
- spin is unchanged during flight
- contact is instantaneous
- drum-head motion during impact is not modeled yet
- flex, vibration, surface contamination, and release imperfections are not explicitly modeled
- impact parameters need calibration against real hardware

The output should be read as design intuition and debugging signal, not ground truth.

## For Contributors

The UI is React, but most of the interesting work is in `src/model`.

Useful files:

- `src/model/solve.ts`: nominal geometry solve
- `src/model/simulation.ts`: single-run physical simulation
- `src/model/realization.ts`: tolerance sampling
- `src/model/aggregation.ts`: observation summaries
- `src/model/model.ts`: shared types
- `src/components/schematic-board.tsx`: trajectory drawing
- `src/hooks/use-url-model-input.ts`: shareable URL state

Open model notes live in `TODO.md`.

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Check the project:

```bash
npm run typecheck
npm run lint
npm run build
```

Format:

```bash
npm run format
```

## Sharing

The app stores the full model state in the URL hash once any input differs from defaults. This makes links reproduce the exact setup even if defaults change later.

## License

MIT. See `LICENSE`.

# WCGW

WCGW is an experimental design tool for marble-to-drum timing.

> [!TIP]
> If you are here for the physics or engineering assumptions, start with [`src/model/solve.ts`](src/model/solve.ts) and [`src/model/simulation.ts`](src/model/simulation.ts).

It tries to answer a practical builder question:

> If a marble rolls down a ramp, leaves the ramp, flies through the air, and hits a drum, how close can that setup get to a target impact time and impact speed once real build tolerances are included?

This repo is for people who want to inspect, question, or improve the model behind the app.

## Why It Exists

WCGW is meant to be a fast sanity check before physical iteration:

- solve a plausible nominal geometry
- vary the build and material parameters
- see which checks fail
- inspect representative runs
- share an exact configuration with someone else

It is not a substitute for testing hardware.

## The Model

| File | Purpose |
| --- | --- |
| [`src/model/solve.ts`](src/model/solve.ts) | Solves the nominal blueprint. Given target timing, target normal impact speed, ramp angle, drum angle, and tolerances, it computes the ramp length and release point that should work on paper. |
| [`src/model/simulation.ts`](src/model/simulation.ts) | Simulates one realized blueprint through release, ramp motion, flight, impact, and bounce. |
| [`src/model/realization.ts`](src/model/realization.ts) | Samples a blueprint within its tolerances. |
| [`src/model/aggregation.ts`](src/model/aggregation.ts) | Reduces many observations into summary stats and representative cases. |

`simulation.ts` currently runs these stages:

- release from rest
- ramp roll or slide
- ballistic flight
- impact detection against the drum surface
- bounce from restitution, tangential friction, and spin transfer

## What It Currently Models

| Area | Included |
| --- | --- |
| Geometry | Ramp geometry solved from a requested release-to-impact time; drum pivot geometry before impact. |
| Roll | Ramp acceleration from gravity, rolling inertia, and ramp efficiency; static friction checks; kinetic friction while sliding. |
| Flight | Ballistic flight under gravity. |
| Impact | Normal impact speed target; restitution; tangential impact friction; spin/tangent exchange. |
| Robustness | Sampled build and material tolerances. |

## Known Gaps

> [!WARNING]
> This is an approximate model, not a validated physics engine. Read the output as design intuition and debugging signal, not ground truth.

- the marble starts at rest
- air drag is ignored
- spin is unchanged during flight
- contact is instantaneous
- drum-head motion during impact is not modeled yet
- flex, vibration, surface contamination, and release imperfections are not explicitly modeled
- impact parameters need calibration against real hardware

## For Contributors

The UI is React, but most of the interesting work is in `src/model`.

| File | Purpose |
| --- | --- |
| [`src/model/model.ts`](src/model/model.ts) | Shared model, blueprint, observation, and aggregate types. |
| [`src/components/schematic-board.tsx`](src/components/schematic-board.tsx) | Trajectory drawing. |
| [`src/hooks/use-url-model-input.ts`](src/hooks/use-url-model-input.ts) | Shareable URL state. |
| [`src/workers/pipeline.worker.ts`](src/workers/pipeline.worker.ts) | Background solve and simulation pipeline. |

Open model notes live in [`TODO.md`](TODO.md).

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
npm run format
```

## Sharing

The app stores the full model state in the URL hash once any input differs from defaults. This makes links reproduce the exact setup even if defaults change later.

## License

MIT. See `LICENSE`.

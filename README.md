# WCGW

WCGW is a small browser tool for sketching marble-to-drum timing setups.

It solves a nominal ramp geometry from a target release-to-impact time and impact speed, then runs sampled simulations across build and material tolerances. The goal is to make the design tradeoffs visible before building or tuning the physical rig.

## What It Does

- Solves the ramp length and release point from the target timing, impact speed, ramp angle, and drum angle.
- Simulates release, ramp roll/slide, ballistic flight, impact, and bounce.
- Samples blueprint tolerances to show how sensitive the setup is.
- Reports timing deviation, impact speed deviation, validity checks, and representative observations.
- Draws a schematic of the nominal trajectory and sampled variants.
- Exports the right-side panels as copyable text.
- Stores the current model in the URL hash so setups can be shared.

## What It Is Not

This is not a precise physics engine or a manufacturing guarantee.

Known simplifications:

- The marble starts at rest.
- The ramp model is still approximate.
- Airborne motion ignores drag and keeps spin unchanged.
- Impact is modeled with simple restitution, tangential friction, and spin transfer.
- **Drum-head motion during impact is not modeled yet.**
- Flex, vibration, deformation, surface contamination, and real-world release imperfections can dominate the result.

Treat the output as design intuition and debugging signal, not truth.

## Model Areas

### Design

User-facing inputs for the physical layout:

- marble size and mass
- target timing and impact speed
- ramp angle
- drum tilt
- pivot geometry
- manufacturing tolerances

### Simulation

Parameters for uncertain physical behavior:

- environment: gravity and marble density
- roll: ramp efficiency, static friction, kinetic friction, minimum reliable acceleration, rolling inertia
- impact: spin transfer, restitution, impact friction

### Blueprint

The solved nominal build values plus tolerances. This is the design the simulation samples from.

### Observations

Simulation results for the nominal design and sampled variants. These show whether the model still hits the requested timing and impact behavior under tolerance.

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Typecheck:

```bash
npm run typecheck
```

Lint:

```bash
npm run lint
```

Format:

```bash
npm run format
```

## Project Layout

- `src/model/solve.ts`: nominal blueprint solve
- `src/model/simulation.ts`: staged simulation and observation aggregation
- `src/model/realization.ts`: tolerance sampling
- `src/workers/pipeline.worker.ts`: background simulation pipeline
- `src/components/design-panel.tsx`: input controls
- `src/components/blueprint-panel.tsx`: solved blueprint output
- `src/components/observations-panel.tsx`: simulation summaries and copy export
- `src/components/schematic-board.tsx`: trajectory drawing
- `src/hooks/use-url-model-input.ts`: shareable URL hash state

## Notes

The URL hash stores the full model state once any input differs from defaults. This makes shared links reproduce the exact setup even if defaults change later.

Open items live in `TODO.md`.

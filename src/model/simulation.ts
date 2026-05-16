import type { Blueprint, ObservationAggregate } from "@/model/model"

export type Observation = {
  run: number
}

export function runSimulationStep(
  _blueprint: Blueprint,
  run: number
): Observation {
  let scratch = 0

  for (let x = 0; x < 10000; x += 1) {
    scratch += Math.sin(x + run)
  }

  void scratch

  return {
    run,
  }
}

export function createObservationAggregate(
  capRuns: number
): ObservationAggregate {
  return {
    completedRuns: 0,
    capRuns,
  }
}

export function reduceObservationAggregate(
  aggregate: ObservationAggregate,
  observation: Observation
): ObservationAggregate {
  void observation

  return {
    ...aggregate,
    completedRuns: aggregate.completedRuns + 1,
  }
}

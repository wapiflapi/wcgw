import type {
  Blueprint,
  Observation,
  ObservationAggregate,
} from "@/model/model"

export function runSimulationStep(
  _blueprint: Blueprint,
  run: number
): Observation {
  let scratch = 0

  for (let x = 0; x < 10000; x += 1) {
    scratch += Math.sin(x + run)
  }

  void scratch

  return {}
}

export function runNominalObservation(_blueprint: Blueprint): Observation {
  void _blueprint

  return {}
}

export function createObservationAggregate(
  requestedRuns: number
): ObservationAggregate {
  return {
    completedRuns: 0,
    requestedRuns,
    nominalObservation: null,
    samples: [],
  }
}

export function setNominalObservation(
  aggregate: ObservationAggregate,
  nominalObservation: Observation
): ObservationAggregate {
  return {
    ...aggregate,
    nominalObservation,
  }
}

export function reduceObservationAggregate(
  aggregate: ObservationAggregate,
  observation: Observation,
  requestedSampleCount: number
): ObservationAggregate {
  const completedRuns = aggregate.completedRuns + 1
  let samples = aggregate.samples

  if (requestedSampleCount > 0 && samples.length < requestedSampleCount) {
    samples = [...samples, observation]
  } else if (requestedSampleCount > 0) {
    const replacementIndex = Math.floor(Math.random() * completedRuns)

    if (replacementIndex < requestedSampleCount) {
      samples = samples.map((sample, index) =>
        index === replacementIndex ? observation : sample
      )
    }
  }

  return {
    ...aggregate,
    completedRuns,
    samples,
  }
}

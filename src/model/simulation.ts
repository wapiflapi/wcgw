import type {
  BlueprintRealization,
  Observation,
  ObservationAggregate,
  Snapshot,
} from "@/model/model"

function simulateRelease(
  _blueprintRealization: BlueprintRealization
): Snapshot {
  void _blueprintRealization

  return {
    marblePosition_x_m: 0,
    marblePosition_y_m: 0,
    marbleSpeed_x_mps: 0,
    marbleSpeed_y_mps: 0,
    marbleSpin_radps: 0,
    time_s: 0,
  }
}

function simulateRampUntilDrop(
  _blueprintRealization: BlueprintRealization,
  releaseSnapshot: Snapshot
): Snapshot {
  void _blueprintRealization

  return releaseSnapshot
}

function simulateBallisticsUntilImpact(
  _blueprintRealization: BlueprintRealization,
  dropSnapshot: Snapshot
): Snapshot {
  void _blueprintRealization

  return dropSnapshot
}

function simulateContactUntilBounce(
  _blueprintRealization: BlueprintRealization,
  impactSnapshot: Snapshot
): Snapshot {
  void _blueprintRealization

  return impactSnapshot
}

export function runSimulationStep(
  blueprintRealization: BlueprintRealization,
  _run: number
): Observation {
  void _run

  const releaseSnapshot = simulateRelease(blueprintRealization)
  const dropSnapshot = simulateRampUntilDrop(
    blueprintRealization,
    releaseSnapshot
  )
  const impactSnapshot = simulateBallisticsUntilImpact(
    blueprintRealization,
    dropSnapshot
  )
  const bounceSnapshot = simulateContactUntilBounce(
    blueprintRealization,
    impactSnapshot
  )

  return {
    blueprintRealization,
    releaseSnapshot,
    dropSnapshot,
    impactSnapshot,
    bounceSnapshot,
  }
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

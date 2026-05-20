import type {
  BooleanCheckAggregate,
  NumericCheckAggregate,
  Observation,
  ObservationAggregate,
  ObservationCheckAggregate,
} from "@/model/model"

function createBooleanCheckAggregate(): BooleanCheckAggregate {
  return {
    checkedCount: 0,
    failedCount: 0,
  }
}

function reduceBooleanCheckAggregate(
  aggregate: BooleanCheckAggregate,
  value: boolean | null
): BooleanCheckAggregate {
  if (value === null) {
    return aggregate
  }

  return {
    checkedCount: aggregate.checkedCount + 1,
    failedCount: aggregate.failedCount + (value ? 0 : 1),
  }
}

function createNumericCheckAggregate(): NumericCheckAggregate {
  return {
    count: 0,
    meanAbsolute: 0,
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
    signedMean: 0,
    varianceAccumulator: 0,
  }
}

function reduceNumericCheckAggregate(
  aggregate: NumericCheckAggregate,
  value: number | null
): NumericCheckAggregate {
  if (value === null || !Number.isFinite(value)) {
    return aggregate
  }

  const count = aggregate.count + 1
  const absoluteValue = Math.abs(value)
  const absoluteDelta = absoluteValue - aggregate.meanAbsolute
  const meanAbsolute = aggregate.meanAbsolute + absoluteDelta / count
  const signedDelta = value - aggregate.signedMean
  const signedMean = aggregate.signedMean + signedDelta / count
  const nextSignedDelta = value - signedMean

  return {
    count,
    meanAbsolute,
    min: Math.min(aggregate.min, value),
    max: Math.max(aggregate.max, value),
    signedMean,
    varianceAccumulator:
      aggregate.varianceAccumulator + signedDelta * nextSignedDelta,
  }
}

function createObservationCheckAggregate(): ObservationCheckAggregate {
  return {
    observationCount: 0,
    invalidCount: 0,
    ballisticsImpactFound: createBooleanCheckAggregate(),
    contactMovingIntoDrumOk: createBooleanCheckAggregate(),
    chuteReliableAccelerationOk: createBooleanCheckAggregate(),
    chuteStaticFrictionOk: createBooleanCheckAggregate(),
    targetNormalImpactSpeedDeviation_mps: createNumericCheckAggregate(),
    targetReleaseToImpactTimeDeviation_s: createNumericCheckAggregate(),
  }
}

function reduceObservationCheckAggregate(
  aggregate: ObservationCheckAggregate,
  observation: Observation
): ObservationCheckAggregate {
  return {
    observationCount: aggregate.observationCount + 1,
    invalidCount: aggregate.invalidCount + (observation.valid ? 0 : 1),
    ballisticsImpactFound: reduceBooleanCheckAggregate(
      aggregate.ballisticsImpactFound,
      observation.checks.ballisticsImpactFound
    ),
    contactMovingIntoDrumOk: reduceBooleanCheckAggregate(
      aggregate.contactMovingIntoDrumOk,
      observation.checks.contactMovingIntoDrumOk
    ),
    chuteReliableAccelerationOk: reduceBooleanCheckAggregate(
      aggregate.chuteReliableAccelerationOk,
      observation.checks.chuteReliableAccelerationOk
    ),
    chuteStaticFrictionOk: reduceBooleanCheckAggregate(
      aggregate.chuteStaticFrictionOk,
      observation.checks.chuteStaticFrictionOk
    ),
    targetNormalImpactSpeedDeviation_mps: reduceNumericCheckAggregate(
      aggregate.targetNormalImpactSpeedDeviation_mps,
      observation.checks.targetNormalImpactSpeedDeviation_mps
    ),
    targetReleaseToImpactTimeDeviation_s: reduceNumericCheckAggregate(
      aggregate.targetReleaseToImpactTimeDeviation_s,
      observation.checks.targetReleaseToImpactTimeDeviation_s
    ),
  }
}

function getTimingDeviation_s(observation: Observation) {
  return observation.checks.targetReleaseToImpactTimeDeviation_s
}

function getImpactSpeedDeviation_mps(observation: Observation) {
  return observation.checks.targetNormalImpactSpeedDeviation_mps
}

function replaceIfLowerDeviation(
  currentObservation: Observation | null,
  candidateObservation: Observation,
  getDeviation: (observation: Observation) => number | null
) {
  const candidateDeviation = getDeviation(candidateObservation)

  if (candidateDeviation === null || !Number.isFinite(candidateDeviation)) {
    return currentObservation
  }

  if (currentObservation === null) {
    return candidateObservation
  }

  const currentDeviation = getDeviation(currentObservation)

  return currentDeviation === null || candidateDeviation < currentDeviation
    ? candidateObservation
    : currentObservation
}

function replaceIfHigherDeviation(
  currentObservation: Observation | null,
  candidateObservation: Observation,
  getDeviation: (observation: Observation) => number | null
) {
  const candidateDeviation = getDeviation(candidateObservation)

  if (candidateDeviation === null || !Number.isFinite(candidateDeviation)) {
    return currentObservation
  }

  if (currentObservation === null) {
    return candidateObservation
  }

  const currentDeviation = getDeviation(currentObservation)

  return currentDeviation === null || candidateDeviation > currentDeviation
    ? candidateObservation
    : currentObservation
}

export function createObservationAggregate(
  requestedRuns: number
): ObservationAggregate {
  return {
    completedRuns: 0,
    requestedRuns,
    nominalObservation: null,
    earliestTimingObservation: null,
    latestTimingObservation: null,
    quietestImpactObservation: null,
    loudestImpactObservation: null,
    checkAggregate: createObservationCheckAggregate(),
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
  }

  return {
    ...aggregate,
    completedRuns,
    earliestTimingObservation: replaceIfLowerDeviation(
      aggregate.earliestTimingObservation,
      observation,
      getTimingDeviation_s
    ),
    latestTimingObservation: replaceIfHigherDeviation(
      aggregate.latestTimingObservation,
      observation,
      getTimingDeviation_s
    ),
    quietestImpactObservation: replaceIfLowerDeviation(
      aggregate.quietestImpactObservation,
      observation,
      getImpactSpeedDeviation_mps
    ),
    loudestImpactObservation: replaceIfHigherDeviation(
      aggregate.loudestImpactObservation,
      observation,
      getImpactSpeedDeviation_mps
    ),
    checkAggregate: reduceObservationCheckAggregate(
      aggregate.checkAggregate,
      observation
    ),
    samples,
  }
}

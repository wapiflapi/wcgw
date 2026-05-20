export type BlueprintValue = {
  nominal: number
  tolerancePlus: number
  toleranceMinus: number
}

export type ModelInput = {
  marbleDiameter_m: number
  marbleMass_g: number

  targetReleaseToImpactTime_s: number
  targetReleaseToImpactTimeTolerance_s: number
  targetNormalImpactSpeed_mps: number

  chuteEntryAngle_rad: number
  chuteBendEnabled: boolean
  chuteEntryLength_m: number
  chuteBendRadius_m: number
  chuteBendAngle_rad: number
  drumTiltAngle_rad: number
  drumPivotArmLength_m: number
  drumPivotAngleRange_rad: number
  manufacturingPositionTolerance_m: number
  manufacturingLinearTolerance_m: number
  manufacturingAngleTolerance_rad: number

  gravity_mps2: number
  marbleDensity_kgpm3: number
  rollingInertiaFactor_ratio: number
  rollingInertiaFactorTolerance_ratio: number
  staticFrictionCoefficient_ratio: number
  staticFrictionCoefficientTolerance_ratio: number
  kineticFrictionCoefficient_ratio: number
  kineticFrictionCoefficientTolerance_ratio: number
  minimumReliableChuteAcceleration_mps2: number
  minimumReliableChuteAccelerationTolerance_mps2: number
  chuteEnergyEfficiency_ratio: number
  chuteEnergyEfficiencyTolerance_ratio: number
  impactRestitutionCoefficient_ratio: number
  impactRestitutionCoefficientTolerance_ratio: number
  impactFrictionCoefficient_ratio: number
  impactFrictionCoefficientTolerance_ratio: number
  spinTransferEfficiency_ratio: number
  spinTransferEfficiencyTolerance_ratio: number
}

export type Blueprint = {
  marbleDiameter_m: BlueprintValue
  marbleMass_g: BlueprintValue

  targetReleaseToImpactTime_s: BlueprintValue
  targetNormalImpactSpeed_mps: BlueprintValue

  chuteEntryAngle_rad: BlueprintValue
  chuteEntryLength_m: BlueprintValue
  chuteBendEnabled: boolean
  chuteBendRadius_m: BlueprintValue
  chuteBendAngle_rad: BlueprintValue
  chuteExitLength_m: BlueprintValue
  releasePoint_x_m: BlueprintValue
  releasePoint_y_m: BlueprintValue
  impactPoint_x_m: BlueprintValue
  impactPoint_y_m: BlueprintValue
  drumTiltAngle_rad: BlueprintValue
  drumPivotArmLength_m: BlueprintValue
  drumPivotAngle_rad: BlueprintValue

  gravity_mps2: BlueprintValue
  marbleDensity_kgpm3: BlueprintValue
  rollingInertiaFactor_ratio: BlueprintValue
  staticFrictionCoefficient_ratio: BlueprintValue
  kineticFrictionCoefficient_ratio: BlueprintValue
  minimumReliableChuteAcceleration_mps2: BlueprintValue
  chuteEnergyEfficiency_ratio: BlueprintValue
  impactRestitutionCoefficient_ratio: BlueprintValue
  impactFrictionCoefficient_ratio: BlueprintValue
  spinTransferEfficiency_ratio: BlueprintValue
}

export type BlueprintRealization = {
  [Key in keyof Blueprint]: Blueprint[Key] extends BlueprintValue
    ? number
    : Blueprint[Key]
}

export type SolveResult<T> =
  | {
      type: "valid"
      value: T
    }
  | {
      reason: string
      type: "invalid"
    }

export type Snapshot = {
  marblePosition_x_m: number
  marblePosition_y_m: number
  marbleSpeed_x_mps: number
  marbleSpeed_y_mps: number
  marbleSpin_radps: number
  time_s: number
}

export type ObservationChecks = {
  ballisticsImpactFound: boolean | null
  contactMovingIntoDrumOk: boolean | null
  targetNormalImpactSpeedDeviation_mps: number | null
  targetReleaseToImpactTimeDeviation_s: number | null
  chuteReliableAccelerationOk: boolean | null
  chuteRequiredStaticFrictionCoefficient_ratio: number | null
  chuteStaticFrictionOk: boolean | null
}

export type Observation = {
  blueprintRealization: BlueprintRealization
  valid: boolean
  invalidReason: string | null
  checks: ObservationChecks
  releaseSnapshot: Snapshot
  dropSnapshot: Snapshot
  impactSnapshot: Snapshot
  bounceSnapshot: Snapshot
}

export type BooleanCheckAggregate = {
  checkedCount: number
  failedCount: number
}

export type NumericCheckAggregate = {
  count: number
  meanAbsolute: number
  min: number
  max: number
  signedMean: number
  varianceAccumulator: number
}

export type ObservationCheckAggregate = {
  observationCount: number
  invalidCount: number
  ballisticsImpactFound: BooleanCheckAggregate
  contactMovingIntoDrumOk: BooleanCheckAggregate
  chuteReliableAccelerationOk: BooleanCheckAggregate
  chuteStaticFrictionOk: BooleanCheckAggregate
  targetNormalImpactSpeedDeviation_mps: NumericCheckAggregate
  targetReleaseToImpactTimeDeviation_s: NumericCheckAggregate
}

export type ObservationAggregate = {
  completedRuns: number
  requestedRuns: number
  nominalObservation: Observation | null
  earliestTimingObservation: Observation | null
  latestTimingObservation: Observation | null
  quietestImpactObservation: Observation | null
  loudestImpactObservation: Observation | null
  checkAggregate: ObservationCheckAggregate
  samples: Observation[]
}

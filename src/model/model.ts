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
  chuteBendRadius_m: number
  chuteEntryLength_ratio: number
  chuteExitAngle_rad: number
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
  minimumReliableRampAcceleration_mps2: number
  minimumReliableRampAccelerationTolerance_mps2: number
  rampEnergyEfficiency_ratio: number
  rampEnergyEfficiencyTolerance_ratio: number
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
  chuteBendEnabled: boolean
  chuteBendRadius_m: BlueprintValue
  chuteEntryLength_ratio: BlueprintValue
  chuteExitAngle_rad: BlueprintValue
  rampLength_m: BlueprintValue
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
  minimumReliableRampAcceleration_mps2: BlueprintValue
  rampEnergyEfficiency_ratio: BlueprintValue
  impactRestitutionCoefficient_ratio: BlueprintValue
  impactFrictionCoefficient_ratio: BlueprintValue
  spinTransferEfficiency_ratio: BlueprintValue
}

export type BlueprintRealization = {
  [Key in keyof Blueprint]: Blueprint[Key] extends BlueprintValue
    ? number
    : Blueprint[Key]
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
  rampReliableAccelerationOk: boolean | null
  rampRequiredStaticFrictionCoefficient_ratio: number | null
  rampStaticFrictionOk: boolean | null
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
  rampReliableAccelerationOk: BooleanCheckAggregate
  rampStaticFrictionOk: BooleanCheckAggregate
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

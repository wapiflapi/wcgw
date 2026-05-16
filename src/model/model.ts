export type InputValue = {
  nominal: number
  tolerancePlus: number
  toleranceMinus: number
}

export type BlueprintValue = {
  nominal: number
  min: number
  max: number
}

export type ModelInput = {
  marbleDiameter_m: InputValue
  marbleMass_g: InputValue

  targetReleaseToImpactTime_s: InputValue
  targetNormalImpactSpeed_mps: InputValue

  trackAngle_rad: InputValue
  trackLength_m: InputValue
  releasePoint_x_m: InputValue
  releasePoint_y_m: InputValue
  impactPoint_x_m: InputValue
  impactPoint_y_m: InputValue
  drumSurfaceAngle_rad: InputValue
  drumPivotPoint_x_m: InputValue
  drumPivotPoint_y_m: InputValue
  drumPivotAngle_rad: InputValue

  gravity_mps2: InputValue
  marbleDensity_kgpm3: InputValue
  rollingInertiaFactor_ratio: InputValue
  staticFrictionCoefficient_ratio: InputValue
  trackEnergyEfficiency_ratio: InputValue
  impactRestitutionCoefficient_ratio: InputValue
  impactFrictionCoefficient_ratio: InputValue
  spinTransferEfficiency_ratio: InputValue
  drumComplianceFactor_ratio: InputValue
}

export type Blueprint = {
  marbleDiameter_m: BlueprintValue
  marbleMass_g: BlueprintValue

  targetReleaseToImpactTime_s: BlueprintValue
  targetNormalImpactSpeed_mps: BlueprintValue

  trackAngle_rad: BlueprintValue
  trackLength_m: BlueprintValue
  releasePoint_x_m: BlueprintValue
  releasePoint_y_m: BlueprintValue
  impactPoint_x_m: BlueprintValue
  impactPoint_y_m: BlueprintValue
  drumSurfaceAngle_rad: BlueprintValue
  drumPivotPoint_x_m: BlueprintValue
  drumPivotPoint_y_m: BlueprintValue
  drumPivotAngle_rad: BlueprintValue

  gravity_mps2: BlueprintValue
  marbleDensity_kgpm3: BlueprintValue
  rollingInertiaFactor_ratio: BlueprintValue
  staticFrictionCoefficient_ratio: BlueprintValue
  trackEnergyEfficiency_ratio: BlueprintValue
  impactRestitutionCoefficient_ratio: BlueprintValue
  impactFrictionCoefficient_ratio: BlueprintValue
  spinTransferEfficiency_ratio: BlueprintValue
  drumComplianceFactor_ratio: BlueprintValue
}

export type ObservationAggregate = {
  completedRuns: number
  capRuns: number
}

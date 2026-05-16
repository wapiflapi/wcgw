import type {
  Blueprint,
  BlueprintValue,
  InputValue,
  ModelInput,
} from "@/model/model"

function blueprintValue(input: InputValue): BlueprintValue {
  return {
    nominal: input.nominal,
    min: input.nominal - input.toleranceMinus,
    max: input.nominal + input.tolerancePlus,
  }
}

export function solveBlueprint(input: ModelInput): Blueprint {
  return {
    marbleDiameter_m: blueprintValue(input.marbleDiameter_m),
    marbleMass_g: blueprintValue(input.marbleMass_g),

    targetReleaseToImpactTime_s: blueprintValue(
      input.targetReleaseToImpactTime_s
    ),
    targetNormalImpactSpeed_mps: blueprintValue(
      input.targetNormalImpactSpeed_mps
    ),

    trackAngle_rad: blueprintValue(input.trackAngle_rad),
    trackLength_m: blueprintValue(input.trackLength_m),
    releasePoint_x_m: blueprintValue(input.releasePoint_x_m),
    releasePoint_y_m: blueprintValue(input.releasePoint_y_m),
    impactPoint_x_m: blueprintValue(input.impactPoint_x_m),
    impactPoint_y_m: blueprintValue(input.impactPoint_y_m),
    drumSurfaceAngle_rad: blueprintValue(input.drumSurfaceAngle_rad),
    drumPivotPoint_x_m: blueprintValue(input.drumPivotPoint_x_m),
    drumPivotPoint_y_m: blueprintValue(input.drumPivotPoint_y_m),
    drumPivotAngle_rad: blueprintValue(input.drumPivotAngle_rad),

    gravity_mps2: blueprintValue(input.gravity_mps2),
    marbleDensity_kgpm3: blueprintValue(input.marbleDensity_kgpm3),
    rollingInertiaFactor_ratio: blueprintValue(
      input.rollingInertiaFactor_ratio
    ),
    staticFrictionCoefficient_ratio: blueprintValue(
      input.staticFrictionCoefficient_ratio
    ),
    trackEnergyEfficiency_ratio: blueprintValue(
      input.trackEnergyEfficiency_ratio
    ),
    impactRestitutionCoefficient_ratio: blueprintValue(
      input.impactRestitutionCoefficient_ratio
    ),
    impactFrictionCoefficient_ratio: blueprintValue(
      input.impactFrictionCoefficient_ratio
    ),
    spinTransferEfficiency_ratio: blueprintValue(
      input.spinTransferEfficiency_ratio
    ),
    drumComplianceFactor_ratio: blueprintValue(
      input.drumComplianceFactor_ratio
    ),
  }
}

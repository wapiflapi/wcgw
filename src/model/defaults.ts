import type { ModelInput } from "@/model/model"
import { degToRad } from "@/model/units"

export const defaultModelInput: ModelInput = {
  marbleDiameter_m: 0.015,
  marbleMass_g: 13,

  targetReleaseToImpactTime_s: 0.451524,
  targetReleaseToImpactTimeTolerance_s: 0.005,
  targetNormalImpactSpeed_mps: 2.426,

  rampAngle_rad: degToRad(-30),
  rampLength_m: 1,
  releasePoint_x_m: 0,
  releasePoint_y_m: 0,
  impactPoint_x_m: 0,
  impactPoint_y_m: 0,
  drumTiltAngle_rad: 0,
  drumPivotArmLength_m: 0.5,
  drumPivotAngleRange_rad: 0,
  manufacturingPositionTolerance_m: 0.005,
  manufacturingLinearTolerance_m: 0.0005,
  manufacturingAngleTolerance_rad: degToRad(1),

  gravity_mps2: 9.81,
  marbleDensity_kgpm3: 7850,
  rollingInertiaFactor_ratio: 5 / 7,
  staticFrictionCoefficient_ratio: 0.5,
  kineticFrictionCoefficient_ratio: 0.4,
  minimumReliableRampAcceleration_mps2: 0.05,
  rampEnergyEfficiency_ratio: 0.95,
  impactRestitutionCoefficient_ratio: 0.7,
  impactFrictionCoefficient_ratio: 0.3,
  spinTransferEfficiency_ratio: 0.5,
  drumComplianceFactor_ratio: 1,
}

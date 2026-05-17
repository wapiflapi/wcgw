import type { ModelInput } from "@/model/model"
import { degToModelRad } from "@/model/units"

export const defaultModelInput: ModelInput = {
  marbleDiameter_m: 0.015,
  marbleMass_g: 14,

  targetReleaseToImpactTime_s: 0.451524,
  targetReleaseToImpactTimeTolerance_s: 0.005,
  targetNormalImpactSpeed_mps: 2.426,

  rampAngle_rad: degToModelRad(-40),
  rampLength_m: 1,
  releasePoint_x_m: 0,
  releasePoint_y_m: 0,
  impactPoint_x_m: 0,
  impactPoint_y_m: 0,
  drumTiltAngle_rad: degToModelRad(-10),
  drumPivotArmLength_m: 0.5,
  drumPivotAngleRange_rad: degToModelRad(5),
  manufacturingPositionTolerance_m: 0.005,
  manufacturingLinearTolerance_m: 0.0005,
  manufacturingAngleTolerance_rad: degToModelRad(1),

  gravity_mps2: 9.81,
  marbleDensity_kgpm3: 7850,
  rollingInertiaFactor_ratio: 5 / 7,
  rollingInertiaFactorTolerance_ratio: 0.005,
  staticFrictionCoefficient_ratio: 0.35,
  staticFrictionCoefficientTolerance_ratio: 0.15,
  kineticFrictionCoefficient_ratio: 0.25,
  kineticFrictionCoefficientTolerance_ratio: 0.1,
  minimumReliableRampAcceleration_mps2: 0.1,
  minimumReliableRampAccelerationTolerance_mps2: 0.05,
  rampEnergyEfficiency_ratio: 0.85,
  rampEnergyEfficiencyTolerance_ratio: 0.1,
  impactRestitutionCoefficient_ratio: 0.6,
  impactRestitutionCoefficientTolerance_ratio: 0.05,
  impactFrictionCoefficient_ratio: 0.35,
  impactFrictionCoefficientTolerance_ratio: 0.05,
  spinTransferEfficiency_ratio: 0.3,
  spinTransferEfficiencyTolerance_ratio: 0.05,
}

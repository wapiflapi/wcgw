import type { ModelInput } from "@/model/model"
import { degToModelRad } from "@/model/units"

export const defaultModelInput: ModelInput = {
  marbleDiameter_m: 0.015,
  marbleMass_g: 14,

  targetReleaseToImpactTime_s: 0.451524,
  targetReleaseToImpactTimeTolerance_s: 0.005,
  targetNormalImpactSpeed_mps: 2.426,

  chuteEntryAngle_rad: degToModelRad(-50),
  chuteBendEnabled: false,
  chuteBendRadius_m: 0.3,
  chuteEntryLength_ratio: 0.5,
  chuteBendAngle_rad: degToModelRad(20),
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
  minimumReliableChuteAcceleration_mps2: 0.1,
  minimumReliableChuteAccelerationTolerance_mps2: 0.05,
  chuteEnergyEfficiency_ratio: 0.85,
  chuteEnergyEfficiencyTolerance_ratio: 0.1,
  impactRestitutionCoefficient_ratio: 0.6,
  impactRestitutionCoefficientTolerance_ratio: 0.05,
  impactFrictionCoefficient_ratio: 0.35,
  impactFrictionCoefficientTolerance_ratio: 0.05,
  spinTransferEfficiency_ratio: 0.3,
  spinTransferEfficiencyTolerance_ratio: 0.05,
}

import type { InputValue, ModelInput } from "@/model/model"
import { degToRad } from "@/model/units"

function inputValue(nominal: number): InputValue {
  return {
    nominal,
    toleranceMinus: 0,
    tolerancePlus: 0,
  }
}

export const defaultModelInput: ModelInput = {
  marbleDiameter_m: inputValue(0.015),
  marbleMass_g: inputValue(13),

  targetReleaseToImpactTime_s: inputValue(0.451524),
  targetNormalImpactSpeed_mps: inputValue(2.426),

  rampAngle_rad: inputValue(degToRad(-30)),
  rampLength_m: inputValue(1),
  releasePoint_x_m: inputValue(0),
  releasePoint_y_m: inputValue(0),
  impactPoint_x_m: inputValue(0),
  impactPoint_y_m: inputValue(0),
  drumTiltAngle_rad: inputValue(0),
  drumPivotPoint_x_m: inputValue(0.05),
  drumPivotPoint_y_m: inputValue(0),
  drumPivotAngle_rad: inputValue(0),

  gravity_mps2: inputValue(9.81),
  marbleDensity_kgpm3: inputValue(7850),
  rollingInertiaFactor_ratio: inputValue(5 / 7),
  staticFrictionCoefficient_ratio: inputValue(0.5),
  rampEnergyEfficiency_ratio: inputValue(0.95),
  impactRestitutionCoefficient_ratio: inputValue(0.7),
  impactFrictionCoefficient_ratio: inputValue(0.3),
  spinTransferEfficiency_ratio: inputValue(0.5),
  drumComplianceFactor_ratio: inputValue(1),
}

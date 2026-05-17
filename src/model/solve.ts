import type { Blueprint, BlueprintValue, ModelInput } from "@/model/model"
import { dotVector2, scaleVector2, subtractVector2 } from "@/lib/math"

type RampLaunchGeometry = {
  rampLength_m: number
  releasePoint_x_m: number
  releasePoint_y_m: number
}

type DrumGeometry = {
  drumTiltAngle_rad: number
  impactPoint_x_m: number
  impactPoint_y_m: number
}

function blueprintSolvedValue(nominal: number, tolerance = 0): BlueprintValue {
  return {
    nominal,
    toleranceMinus: tolerance,
    tolerancePlus: tolerance,
  }
}

function blueprintValue(nominal: number): BlueprintValue {
  return {
    nominal,
    toleranceMinus: 0,
    tolerancePlus: 0,
  }
}

function blueprintInputToleranceValue(
  nominal: number,
  tolerance: number
): BlueprintValue {
  return {
    nominal,
    toleranceMinus: Math.abs(tolerance),
    tolerancePlus: Math.abs(tolerance),
  }
}

function blueprintNegativeToleranceValue(
  nominal: number,
  tolerance: number
): BlueprintValue {
  return {
    nominal,
    toleranceMinus: tolerance,
    tolerancePlus: 0,
  }
}

function solveDrumGeometry(input: ModelInput): DrumGeometry {
  // For the blueprint solve, impact is the marble center at the origin.
  // Pivot geometry belongs to the simulation stage.
  return {
    drumTiltAngle_rad: input.drumTiltAngle_rad,
    impactPoint_x_m: 0,
    impactPoint_y_m: 0,
  }
}

function solveRampLaunchGeometry(
  input: ModelInput,
  drumGeometry: DrumGeometry
): RampLaunchGeometry {
  // Ramp angle, measured from horizontal, positive counterclockwise.
  const rampAngle_rad = input.rampAngle_rad

  // Ramp energy efficiency, where 1 means no rolling loss.
  const rampEnergyEfficiency_ratio = input.rampEnergyEfficiency_ratio

  // Rolling acceleration factor, e.g. 5/7 for a solid sphere.
  const rollingAccelerationFactor_ratio = input.rollingInertiaFactor_ratio

  // Gravity magnitude.
  const gravity_mps2 = input.gravity_mps2

  // Target total time from release to impact.
  const totalTime_s = input.targetReleaseToImpactTime_s

  // Target impact speed along the drum normal.
  const targetNormalImpactSpeed_mps = input.targetNormalImpactSpeed_mps

  // Impact position of the marble center for the blueprint solve.
  const impactPoint_m = {
    x: drumGeometry.impactPoint_x_m,
    y: drumGeometry.impactPoint_y_m,
  }

  // Unit launch direction along the ramp.
  const rampDirection = {
    x: Math.cos(rampAngle_rad),
    y: Math.sin(rampAngle_rad),
  }

  // Unit normal of the tilted drum surface, pointing outward.
  const drumNormal = {
    x: -Math.sin(drumGeometry.drumTiltAngle_rad),
    y: Math.cos(drumGeometry.drumTiltAngle_rad),
  }

  // Gravity vector.
  const gravityVector_mps2 = {
    x: 0,
    y: -gravity_mps2,
  }

  // Rolling acceleration along the ramp.
  const rampAcceleration_mps2 =
    rampEnergyEfficiency_ratio *
    rollingAccelerationFactor_ratio *
    gravity_mps2 *
    -Math.sin(rampAngle_rad)

  // How much the launch direction points into the drum normal.
  const launchNormalAlignment_ratio = -dotVector2(drumNormal, rampDirection)

  // How much gravity accelerates the marble into the drum normal.
  const gravityNormalAcceleration_mps2 = -dotVector2(
    drumNormal,
    gravityVector_mps2
  )

  // Numerator of the ballistic flight-time equation.
  const flightTimeNumerator_mps =
    targetNormalImpactSpeed_mps -
    rampAcceleration_mps2 * launchNormalAlignment_ratio * totalTime_s

  // Denominator of the ballistic flight-time equation.
  const flightTimeDenominator_mps2 =
    gravityNormalAcceleration_mps2 -
    rampAcceleration_mps2 * launchNormalAlignment_ratio

  // Ballistic flight time after leaving the ramp.
  const flightTime_s = flightTimeNumerator_mps / flightTimeDenominator_mps2

  // Time spent rolling on the ramp.
  const rollingTime_s = totalTime_s - flightTime_s

  // Ramp exit speed.
  const rampExitSpeed_mps = rampAcceleration_mps2 * rollingTime_s

  // Required ramp length from rest.
  const rampLength_m = rampExitSpeed_mps ** 2 / (2 * rampAcceleration_mps2)

  // Ballistic launch displacement from ramp exit to impact.
  const ballisticLaunchDisplacement_m = scaleVector2(
    rampDirection,
    rampExitSpeed_mps * flightTime_s
  )

  // Ballistic gravity displacement from ramp exit to impact.
  const ballisticGravityDisplacement_m = scaleVector2(
    gravityVector_mps2,
    0.5 * flightTime_s ** 2
  )

  // Ramp displacement from release point to ramp exit.
  const rampDisplacement_m = scaleVector2(rampDirection, rampLength_m)

  // Rewind from impact to ramp exit.
  const rampExitPoint_m = subtractVector2(
    subtractVector2(impactPoint_m, ballisticLaunchDisplacement_m),
    ballisticGravityDisplacement_m
  )

  // Rewind from ramp exit to release point.
  const releasePoint_m = subtractVector2(rampExitPoint_m, rampDisplacement_m)

  return {
    rampLength_m,
    releasePoint_x_m: releasePoint_m.x,
    releasePoint_y_m: releasePoint_m.y,
  }
}

export function solveBlueprint(input: ModelInput): Blueprint {
  const drumGeometry = solveDrumGeometry(input)
  const rampLaunchGeometry = solveRampLaunchGeometry(input, drumGeometry)
  const manufacturingPositionTolerance_m = Math.abs(
    input.manufacturingPositionTolerance_m
  )
  const manufacturingLinearTolerance_m = Math.abs(
    input.manufacturingLinearTolerance_m
  )
  const manufacturingAngleTolerance_rad = Math.abs(
    input.manufacturingAngleTolerance_rad
  )

  return {
    marbleDiameter_m: blueprintValue(input.marbleDiameter_m),
    marbleMass_g: blueprintValue(input.marbleMass_g),

    targetReleaseToImpactTime_s: blueprintValue(
      input.targetReleaseToImpactTime_s
    ),
    targetNormalImpactSpeed_mps: blueprintValue(
      input.targetNormalImpactSpeed_mps
    ),

    rampAngle_rad: blueprintSolvedValue(
      input.rampAngle_rad,
      manufacturingAngleTolerance_rad
    ),
    rampLength_m: blueprintSolvedValue(
      rampLaunchGeometry.rampLength_m,
      manufacturingLinearTolerance_m
    ),
    releasePoint_x_m: blueprintSolvedValue(
      rampLaunchGeometry.releasePoint_x_m,
      manufacturingPositionTolerance_m
    ),
    releasePoint_y_m: blueprintSolvedValue(
      rampLaunchGeometry.releasePoint_y_m,
      manufacturingPositionTolerance_m
    ),
    impactPoint_x_m: blueprintSolvedValue(
      drumGeometry.impactPoint_x_m,
      manufacturingPositionTolerance_m
    ),
    impactPoint_y_m: blueprintSolvedValue(
      drumGeometry.impactPoint_y_m,
      manufacturingPositionTolerance_m
    ),
    drumTiltAngle_rad: blueprintSolvedValue(
      input.drumTiltAngle_rad,
      manufacturingAngleTolerance_rad
    ),
    drumPivotArmLength_m: blueprintSolvedValue(
      input.drumPivotArmLength_m,
      manufacturingLinearTolerance_m
    ),
    drumPivotAngle_rad: blueprintNegativeToleranceValue(
      0,
      Math.abs(input.drumPivotAngleRange_rad)
    ),

    gravity_mps2: blueprintValue(input.gravity_mps2),
    marbleDensity_kgpm3: blueprintValue(input.marbleDensity_kgpm3),
    rollingInertiaFactor_ratio: blueprintInputToleranceValue(
      input.rollingInertiaFactor_ratio,
      input.rollingInertiaFactorTolerance_ratio
    ),
    staticFrictionCoefficient_ratio: blueprintInputToleranceValue(
      input.staticFrictionCoefficient_ratio,
      input.staticFrictionCoefficientTolerance_ratio
    ),
    kineticFrictionCoefficient_ratio: blueprintInputToleranceValue(
      input.kineticFrictionCoefficient_ratio,
      input.kineticFrictionCoefficientTolerance_ratio
    ),
    minimumReliableRampAcceleration_mps2: blueprintInputToleranceValue(
      input.minimumReliableRampAcceleration_mps2,
      input.minimumReliableRampAccelerationTolerance_mps2
    ),
    rampEnergyEfficiency_ratio: blueprintInputToleranceValue(
      input.rampEnergyEfficiency_ratio,
      input.rampEnergyEfficiencyTolerance_ratio
    ),
    impactRestitutionCoefficient_ratio: blueprintInputToleranceValue(
      input.impactRestitutionCoefficient_ratio,
      input.impactRestitutionCoefficientTolerance_ratio
    ),
    impactFrictionCoefficient_ratio: blueprintInputToleranceValue(
      input.impactFrictionCoefficient_ratio,
      input.impactFrictionCoefficientTolerance_ratio
    ),
    spinTransferEfficiency_ratio: blueprintInputToleranceValue(
      input.spinTransferEfficiency_ratio,
      input.spinTransferEfficiencyTolerance_ratio
    ),
    drumComplianceFactor_ratio: blueprintInputToleranceValue(
      input.drumComplianceFactor_ratio,
      input.drumComplianceFactorTolerance_ratio
    ),
  }
}

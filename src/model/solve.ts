import type {
  Blueprint,
  BlueprintValue,
  InputValue,
  ModelInput,
} from "@/model/model"
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

function blueprintSolvedValue(nominal: number): BlueprintValue {
  return {
    max: nominal,
    min: nominal,
    nominal,
  }
}

function blueprintValue(input: InputValue): BlueprintValue {
  return {
    nominal: input.nominal,
    min: input.nominal - input.toleranceMinus,
    max: input.nominal + input.tolerancePlus,
  }
}

function solveDrumGeometry(input: ModelInput): DrumGeometry {
  // For the blueprint solve, impact is the marble center at the origin.
  // Pivot geometry belongs to the simulation stage.
  return {
    drumTiltAngle_rad: input.drumTiltAngle_rad.nominal,
    impactPoint_x_m: 0,
    impactPoint_y_m: 0,
  }
}

function solveRampLaunchGeometry(
  input: ModelInput,
  drumGeometry: DrumGeometry
): RampLaunchGeometry {
  // Ramp angle, measured from horizontal, positive counterclockwise.
  const rampAngle_rad = input.rampAngle_rad.nominal

  // Ramp energy efficiency, where 1 means no rolling loss.
  const rampEnergyEfficiency_ratio = input.rampEnergyEfficiency_ratio.nominal

  // Rolling acceleration factor, e.g. 5/7 for a solid sphere.
  const rollingAccelerationFactor_ratio =
    input.rollingInertiaFactor_ratio.nominal

  // Gravity magnitude.
  const gravity_mps2 = input.gravity_mps2.nominal

  // Target total time from release to impact.
  const totalTime_s = input.targetReleaseToImpactTime_s.nominal

  // Target impact speed along the drum normal.
  const targetNormalImpactSpeed_mps = input.targetNormalImpactSpeed_mps.nominal

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

  return {
    marbleDiameter_m: blueprintValue(input.marbleDiameter_m),
    marbleMass_g: blueprintValue(input.marbleMass_g),

    targetReleaseToImpactTime_s: blueprintValue(
      input.targetReleaseToImpactTime_s
    ),
    targetNormalImpactSpeed_mps: blueprintValue(
      input.targetNormalImpactSpeed_mps
    ),

    rampAngle_rad: blueprintValue(input.rampAngle_rad),
    rampLength_m: blueprintSolvedValue(rampLaunchGeometry.rampLength_m),
    releasePoint_x_m: blueprintSolvedValue(rampLaunchGeometry.releasePoint_x_m),
    releasePoint_y_m: blueprintSolvedValue(rampLaunchGeometry.releasePoint_y_m),
    impactPoint_x_m: blueprintSolvedValue(drumGeometry.impactPoint_x_m),
    impactPoint_y_m: blueprintSolvedValue(drumGeometry.impactPoint_y_m),
    drumTiltAngle_rad: blueprintValue(input.drumTiltAngle_rad),
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
    rampEnergyEfficiency_ratio: blueprintValue(
      input.rampEnergyEfficiency_ratio
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

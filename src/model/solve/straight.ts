import { dotVector2, scaleVector2, subtractVector2 } from "@/lib/math"
import type { ModelInput, SolveResult } from "@/model/model"
import type { ChuteLaunchGeometry, DrumGeometry } from "@/model/solve/types"

export function solveStraightChuteLaunchGeometry(
  input: ModelInput,
  drumGeometry: DrumGeometry
): SolveResult<ChuteLaunchGeometry> {
  // Chute entry angle, measured from horizontal, positive counterclockwise.
  const chuteEntryAngle_rad = input.chuteEntryAngle_rad

  // Chute energy efficiency, where 1 means no rolling loss.
  const chuteEnergyEfficiency_ratio = input.chuteEnergyEfficiency_ratio

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

  // Unit launch direction along the chute.
  const chuteDirection = {
    x: Math.cos(chuteEntryAngle_rad),
    y: Math.sin(chuteEntryAngle_rad),
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

  // Rolling acceleration along the chute.
  const chuteAcceleration_mps2 =
    chuteEnergyEfficiency_ratio *
    rollingAccelerationFactor_ratio *
    gravity_mps2 *
    -Math.sin(chuteEntryAngle_rad)

  // How much the launch direction points into the drum normal.
  const launchNormalAlignment_ratio = -dotVector2(drumNormal, chuteDirection)

  // How much gravity accelerates the marble into the drum normal.
  const gravityNormalAcceleration_mps2 = -dotVector2(
    drumNormal,
    gravityVector_mps2
  )

  // Numerator of the ballistic flight-time equation.
  const flightTimeNumerator_mps =
    targetNormalImpactSpeed_mps -
    chuteAcceleration_mps2 * launchNormalAlignment_ratio * totalTime_s

  // Denominator of the ballistic flight-time equation.
  const flightTimeDenominator_mps2 =
    gravityNormalAcceleration_mps2 -
    chuteAcceleration_mps2 * launchNormalAlignment_ratio

  // Ballistic flight time after leaving the chute.
  const flightTime_s = flightTimeNumerator_mps / flightTimeDenominator_mps2

  // Time spent rolling through the chute.
  const rollingTime_s = totalTime_s - flightTime_s

  // Chute exit speed.
  const chuteExitSpeed_mps = chuteAcceleration_mps2 * rollingTime_s

  // Required chute length from rest.
  const chuteLength_m = chuteExitSpeed_mps ** 2 / (2 * chuteAcceleration_mps2)

  // Ballistic launch displacement from chute exit to impact.
  const ballisticLaunchDisplacement_m = scaleVector2(
    chuteDirection,
    chuteExitSpeed_mps * flightTime_s
  )

  // Ballistic gravity displacement from chute exit to impact.
  const ballisticGravityDisplacement_m = scaleVector2(
    gravityVector_mps2,
    0.5 * flightTime_s ** 2
  )

  // Chute displacement from release point to chute exit.
  const chuteDisplacement_m = scaleVector2(chuteDirection, chuteLength_m)

  // Rewind from impact to chute exit.
  const chuteExitPoint_m = subtractVector2(
    subtractVector2(impactPoint_m, ballisticLaunchDisplacement_m),
    ballisticGravityDisplacement_m
  )

  // Rewind from chute exit to release point.
  const releasePoint_m = subtractVector2(chuteExitPoint_m, chuteDisplacement_m)

  return {
    type: "valid",
    value: {
      chuteBendEnabled: false,
      entryLength_m: chuteLength_m,
      exitLength_m: 0,
      releasePoint_x_m: releasePoint_m.x,
      releasePoint_y_m: releasePoint_m.y,
    },
  }
}

import {
  dotVector2,
  scaleVector2,
  subtractVector2,
  type Vector2,
} from "@/lib/math"
import type { ModelInput, SolveResult } from "@/model/model"
import type { ChuteLaunchGeometry, DrumGeometry } from "@/model/solve/types"

type FlightTimeCandidate = {
  chuteTime_s: number
  exitSpeed_mps: number
  flightTime_s: number
  residual_s: number
  totalStraightLength_m: number
}

type FlightTimeCandidateSearch =
  | { type: "found"; candidate: FlightTimeCandidate }
  | { type: "not-found"; reason: string }

type BendSolveSetup = {
  bendDrop_m: number
  bendLength_m: number
  bendRadius_m: number
  entryAngle_rad: number
  entryLengthShare_ratio: number
  exitAngle_rad: number
  gravityInwardNormalAcceleration_mps2: number
  normalExitAlignment: number
  rollingGravityScale_mps2: number
  signedBendAngle_rad: number
  straightDropPerLength_m: number
  targetNormalImpactSpeed_mps: number
  targetTotalTime_s: number
  turnSign: number
}

const ROOT_SAMPLE_COUNT = 64
const ROOT_ITERATION_COUNT = 48
const SIMPSON_INTERVAL_COUNT = 32
const SOLVE_EPSILON = 1e-9

export function solveBendChuteLaunchGeometry(
  input: ModelInput,
  drumGeometry: DrumGeometry
): SolveResult<ChuteLaunchGeometry> {
  // Chute entry angle, measured from horizontal, positive counterclockwise.
  const entryAngle_rad = input.chuteEntryAngle_rad

  // Chute exit angle after the bend.
  const exitAngle_rad = input.chuteExitAngle_rad

  // Signed angle swept by the bend, using the shortest turn.
  const signedBendAngle_rad = signedAngleDelta_rad(
    exitAngle_rad - entryAngle_rad
  )

  // Bend direction: positive turns counterclockwise, negative clockwise.
  // A zero-angle bend has no curved part, but still keeps entry/exit lengths.
  const turnSign = getTurnSign(signedBendAngle_rad)

  // Bend radius, controlled by the artist-facing "bend size".
  const bendRadius_m = input.chuteBendRadius_m

  // Fraction of straight chute before the bend.
  const entryLengthShare_ratio = input.chuteEntryLength_ratio

  // Chute energy efficiency, where 1 means no rolling loss.
  const chuteEnergyEfficiency_ratio = input.chuteEnergyEfficiency_ratio

  // Rolling acceleration factor, e.g. 5/7 for a solid sphere.
  const rollingAccelerationFactor_ratio = input.rollingInertiaFactor_ratio

  // Gravity magnitude.
  const gravity_mps2 = input.gravity_mps2

  // Target total time from release to impact.
  const targetTotalTime_s = input.targetReleaseToImpactTime_s

  // Target impact speed along the drum normal.
  const targetNormalImpactSpeed_mps = input.targetNormalImpactSpeed_mps

  // Impact position of the marble center for the blueprint solve.
  const impactPoint_m = {
    x: drumGeometry.impactPoint_x_m,
    y: drumGeometry.impactPoint_y_m,
  }

  // Unit launch direction after the marble leaves the chute.
  const exitDirection = {
    x: Math.cos(exitAngle_rad),
    y: Math.sin(exitAngle_rad),
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

  // Gravity scaled by rolling inertia and chute losses.
  const rollingGravityScale_mps2 =
    chuteEnergyEfficiency_ratio * rollingAccelerationFactor_ratio * gravity_mps2

  // How much the exit direction points into the drum normal.
  const normalExitAlignment = -dotVector2(exitDirection, drumNormal)

  // How much gravity accelerates the marble into the drum normal during flight.
  const gravityInwardNormalAcceleration_mps2 = -dotVector2(
    gravityVector_mps2,
    drumNormal
  )

  // Vertical displacement of the circular bend.
  const bendDy_m = getBendVerticalDisplacement_m({
    bendRadius_m,
    entryAngle_rad,
    exitAngle_rad,
    turnSign,
  })

  // Positive vertical drop through the bend. Downhill bends add speed.
  const bendDrop_m = -bendDy_m

  // Chute length along the curved bend.
  const bendLength_m = bendRadius_m * Math.abs(signedBendAngle_rad)

  // Drop per meter of straight chute, after the entry/exit split.
  const straightDropPerLength_m = -(
    entryLengthShare_ratio * Math.sin(entryAngle_rad) +
    (1 - entryLengthShare_ratio) * Math.sin(exitAngle_rad)
  )

  const setup: BendSolveSetup = {
    bendDrop_m,
    bendLength_m,
    bendRadius_m,
    entryAngle_rad,
    entryLengthShare_ratio,
    exitAngle_rad,
    gravityInwardNormalAcceleration_mps2,
    normalExitAlignment,
    rollingGravityScale_mps2,
    signedBendAngle_rad,
    straightDropPerLength_m,
    targetNormalImpactSpeed_mps,
    targetTotalTime_s,
    turnSign,
  }

  const invalidReason = getBendSetupInvalidReason(setup)

  if (invalidReason !== null) {
    return invalidSolve(invalidReason)
  }

  // The one unknown we solve numerically is ballistic flight time.
  // For each trial time, impact punch gives exit speed, exit speed gives drop,
  // and drop gives the required entry/exit chute lengths.
  const candidateSearch = chooseFlightTimeCandidate(setup)

  if (candidateSearch.type === "not-found") {
    return invalidSolve(candidateSearch.reason)
  }

  const candidate = candidateSearch.candidate

  // Once flight time and exit speed are known, rewind from impact to chute exit.
  const ballisticLaunchDisplacement_m = scaleVector2(
    exitDirection,
    candidate.exitSpeed_mps * candidate.flightTime_s
  )

  // Gravity displacement during the airborne part.
  const ballisticGravityDisplacement_m = scaleVector2(
    gravityVector_mps2,
    0.5 * candidate.flightTime_s ** 2
  )

  // Chute exit point, found by rewinding the launch and gravity motion.
  const chuteExitPoint_m = subtractVector2(
    subtractVector2(impactPoint_m, ballisticLaunchDisplacement_m),
    ballisticGravityDisplacement_m
  )

  // Straight chute length before the bend.
  const entryLength_m = entryLengthShare_ratio * candidate.totalStraightLength_m

  // Straight chute length after the bend.
  const exitLength_m =
    (1 - entryLengthShare_ratio) * candidate.totalStraightLength_m

  // Unit direction along the entry chute.
  const entryDirection = {
    x: Math.cos(entryAngle_rad),
    y: Math.sin(entryAngle_rad),
  }

  // Displacement across the first straight chute segment.
  const entryDisplacement_m = scaleVector2(entryDirection, entryLength_m)

  // Displacement across the circular bend.
  const bendDisplacement_m = getBendDisplacement_m({
    bendDy_m,
    bendRadius_m,
    entryAngle_rad,
    exitAngle_rad,
    turnSign,
  })

  // Displacement across the final straight chute segment.
  const exitDisplacement_m = scaleVector2(exitDirection, exitLength_m)

  // Total displacement from release point to chute exit.
  const releaseToExitDisplacement_m = addVector2(
    addVector2(entryDisplacement_m, bendDisplacement_m),
    exitDisplacement_m
  )

  // Rewind from chute exit to release point.
  const releasePoint_m = subtractVector2(
    chuteExitPoint_m,
    releaseToExitDisplacement_m
  )

  return {
    type: "valid",
    value: {
      chuteBendEnabled: true,
      entryLength_m,
      exitLength_m,
      releasePoint_x_m: releasePoint_m.x,
      releasePoint_y_m: releasePoint_m.y,
    },
  }
}

function evaluateFlightTimeCandidate(
  setup: BendSolveSetup,
  flightTime_s: number
): FlightTimeCandidate | null {
  if (flightTime_s <= 0 || flightTime_s >= setup.targetTotalTime_s) {
    return null
  }

  // Required exit speed from the impact punch equation.
  const exitSpeed_mps =
    (setup.targetNormalImpactSpeed_mps -
      flightTime_s * setup.gravityInwardNormalAcceleration_mps2) /
    setup.normalExitAlignment

  if (!Number.isFinite(exitSpeed_mps) || exitSpeed_mps <= 0) {
    return null
  }

  // Required vertical drop to reach that exit speed from rest.
  const requiredDrop_m =
    exitSpeed_mps ** 2 / (2 * setup.rollingGravityScale_mps2)

  // The bend contributes fixed drop; the straight pieces supply the rest.
  const totalStraightLength_m =
    (requiredDrop_m - setup.bendDrop_m) / setup.straightDropPerLength_m

  if (!Number.isFinite(totalStraightLength_m) || totalStraightLength_m < 0) {
    return null
  }

  // Straight chute length before the bend.
  const entryLength_m = setup.entryLengthShare_ratio * totalStraightLength_m

  // Straight chute length after the bend.
  const exitLength_m =
    (1 - setup.entryLengthShare_ratio) * totalStraightLength_m

  // Rolling acceleration along the entry chute.
  const entryAcceleration_mps2 =
    setup.rollingGravityScale_mps2 * -Math.sin(setup.entryAngle_rad)

  // Rolling acceleration along the exit chute.
  const exitAcceleration_mps2 =
    setup.rollingGravityScale_mps2 * -Math.sin(setup.exitAngle_rad)

  // Speed and time after the entry segment, starting from rest.
  const entryResult = advanceConstantAcceleration(
    0,
    entryLength_m,
    entryAcceleration_mps2
  )

  if (!entryResult.valid) {
    return null
  }

  // Speed after the bend, using the bend's vertical drop.
  const bendExitSpeedSquared_m2ps2 =
    entryResult.speed_mps ** 2 +
    2 * setup.rollingGravityScale_mps2 * setup.bendDrop_m

  if (bendExitSpeedSquared_m2ps2 < 0) {
    return null
  }

  const bendExitSpeed_mps = Math.sqrt(bendExitSpeedSquared_m2ps2)

  // Time spent inside the curved bend.
  const bendTime_s = getBendTime_s(setup, entryResult.speed_mps)

  if (!Number.isFinite(bendTime_s)) {
    return null
  }

  // Speed and time through the final straight segment.
  const exitResult = advanceConstantAcceleration(
    bendExitSpeed_mps,
    exitLength_m,
    exitAcceleration_mps2
  )

  if (!exitResult.valid) {
    return null
  }

  const chuteTime_s = entryResult.time_s + bendTime_s + exitResult.time_s

  return {
    chuteTime_s,
    exitSpeed_mps,
    flightTime_s,
    residual_s: chuteTime_s + flightTime_s - setup.targetTotalTime_s,
    totalStraightLength_m,
  }
}

function getBendTime_s(setup: BendSolveSetup, entrySpeed_mps: number) {
  if (setup.bendLength_m <= SOLVE_EPSILON) {
    return 0
  }

  let weightedIntegral = 0

  for (let index = 0; index <= SIMPSON_INTERVAL_COUNT; index += 1) {
    const progress = index / SIMPSON_INTERVAL_COUNT

    // Local chute angle partway through the bend.
    const angle_rad =
      setup.entryAngle_rad + progress * setup.signedBendAngle_rad

    // Vertical displacement from bend start to this sample point.
    const partialBendDy_m =
      (setup.bendRadius_m / setup.turnSign) *
      (Math.cos(setup.entryAngle_rad) - Math.cos(angle_rad))

    // Positive vertical drop from bend start to this sample point.
    const partialBendDrop_m = -partialBendDy_m

    // Speed at this sample point from energy.
    const speedSquared_m2ps2 =
      entrySpeed_mps ** 2 +
      2 * setup.rollingGravityScale_mps2 * partialBendDrop_m

    if (speedSquared_m2ps2 <= 0) {
      return Number.NaN
    }

    const simpsonWeight =
      index === 0 || index === SIMPSON_INTERVAL_COUNT
        ? 1
        : index % 2 === 0
          ? 2
          : 4

    weightedIntegral += simpsonWeight / Math.sqrt(speedSquared_m2ps2)
  }

  return (setup.bendLength_m * weightedIntegral) / (3 * SIMPSON_INTERVAL_COUNT)
}

function chooseFlightTimeCandidate(
  setup: BendSolveSetup
): FlightTimeCandidateSearch {
  let previousCandidate: FlightTimeCandidate | null = null
  let sawValidCandidate = false
  let alwaysTooSlow = true
  let alwaysTooFast = true

  for (let sample = 1; sample < ROOT_SAMPLE_COUNT; sample += 1) {
    const flightTime_s = (setup.targetTotalTime_s * sample) / ROOT_SAMPLE_COUNT
    const candidate = evaluateFlightTimeCandidate(setup, flightTime_s)

    if (candidate === null) {
      previousCandidate = null
      continue
    }

    if (
      previousCandidate !== null &&
      previousCandidate.residual_s * candidate.residual_s <= 0
    ) {
      const bisectionCandidate = bisectFlightTimeCandidate(
        setup,
        previousCandidate,
        candidate
      )

      if (bisectionCandidate === null) {
        return {
          reason:
            "Chute setup needs adjustment.\nThis bend is right on a solve edge. Nudge the bend size or bend position slightly and try again.",
          type: "not-found",
        }
      }

      return {
        candidate: bisectionCandidate,
        type: "found",
      }
    }

    sawValidCandidate = true
    alwaysTooSlow &&= candidate.residual_s > 0
    alwaysTooFast &&= candidate.residual_s < 0
    previousCandidate = candidate
  }

  if (!sawValidCandidate) {
    return {
      reason:
        "Chute setup needs adjustment.\nThis bend cannot make a valid launch with the current angles. Aim the exit more toward the drum and keep the chute sloping downhill.",
      type: "not-found",
    }
  }

  if (alwaysTooSlow) {
    return {
      reason:
        "Chute is too slow for the target time.\nMake the entry or exit angle steeper, or move the bend position to give the marble a faster path. Change timing or punch only as a last resort.",
      type: "not-found",
    }
  }

  if (alwaysTooFast) {
    return {
      reason:
        "Chute is too fast for the target time.\nMake the entry or exit angle gentler, increase the bend size, or move the bend position to soften the path. Change timing or punch only as a last resort.",
      type: "not-found",
    }
  }

  return {
    reason:
      "Chute setup needs adjustment.\nThis bend has a gap in the valid solve range. Nudge the bend size, bend position, or exit angle and try again.",
    type: "not-found",
  }
}

function bisectFlightTimeCandidate(
  setup: BendSolveSetup,
  lowerCandidate: FlightTimeCandidate,
  upperCandidate: FlightTimeCandidate
) {
  let lower = lowerCandidate
  let upper = upperCandidate

  for (let iteration = 0; iteration < ROOT_ITERATION_COUNT; iteration += 1) {
    const midpointFlightTime_s = (lower.flightTime_s + upper.flightTime_s) / 2
    const midpointCandidate = evaluateFlightTimeCandidate(
      setup,
      midpointFlightTime_s
    )

    if (midpointCandidate === null) {
      return null
    }

    if (lower.residual_s * midpointCandidate.residual_s <= 0) {
      upper = midpointCandidate
    } else {
      lower = midpointCandidate
    }
  }

  return Math.abs(lower.residual_s) < Math.abs(upper.residual_s) ? lower : upper
}

function advanceConstantAcceleration(
  initialSpeed_mps: number,
  distance_m: number,
  acceleration_mps2: number
) {
  if (distance_m <= SOLVE_EPSILON) {
    return {
      speed_mps: initialSpeed_mps,
      time_s: 0,
      valid: true,
    }
  }

  const finalSpeedSquared_m2ps2 =
    initialSpeed_mps ** 2 + 2 * acceleration_mps2 * distance_m

  if (finalSpeedSquared_m2ps2 < -SOLVE_EPSILON) {
    return {
      speed_mps: Number.NaN,
      time_s: Number.NaN,
      valid: false,
    }
  }

  const finalSpeed_mps = Math.sqrt(Math.max(0, finalSpeedSquared_m2ps2))

  if (Math.abs(acceleration_mps2) > SOLVE_EPSILON) {
    const time_s = (finalSpeed_mps - initialSpeed_mps) / acceleration_mps2

    return {
      speed_mps: finalSpeed_mps,
      time_s,
      valid: Number.isFinite(time_s) && time_s >= -SOLVE_EPSILON,
    }
  }

  if (initialSpeed_mps <= SOLVE_EPSILON) {
    return {
      speed_mps: Number.NaN,
      time_s: Number.NaN,
      valid: false,
    }
  }

  return {
    speed_mps: finalSpeed_mps,
    time_s: distance_m / initialSpeed_mps,
    valid: true,
  }
}

function getBendSetupInvalidReason({
  bendRadius_m,
  entryLengthShare_ratio,
  normalExitAlignment,
  rollingGravityScale_mps2,
  straightDropPerLength_m,
  targetNormalImpactSpeed_mps,
  targetTotalTime_s,
}: BendSolveSetup) {
  if (bendRadius_m <= 0) {
    return "Bend size is too small.\nUse a positive bend size so the chute has room to turn."
  }

  if (entryLengthShare_ratio <= 0 || entryLengthShare_ratio >= 1) {
    return "Bend position is too close to an end.\nMove bend position away from the end so the chute has both an entry and exit length."
  }

  if (targetTotalTime_s <= 0) {
    return "Timing target is too short.\nUse a positive release-to-impact time."
  }

  if (targetNormalImpactSpeed_mps <= 0) {
    return "Impact speed is too low.\nUse a positive punch target."
  }

  if (rollingGravityScale_mps2 <= 0) {
    return "The chute has no usable acceleration.\nCheck gravity, rolling inertia, and chute efficiency; they need to leave the marble some downhill acceleration."
  }

  if (straightDropPerLength_m <= 0) {
    return "The chute is not downhill enough.\nLower the entry angle or exit angle so the marble can gain speed before it leaves the chute."
  }

  if (normalExitAlignment <= SOLVE_EPSILON) {
    return "Exit angle misses the drum face.\nRotate the exit angle toward the drum surface so the launch has useful punch."
  }

  return null
}

function invalidSolve(reason: string): SolveResult<ChuteLaunchGeometry> {
  return {
    reason,
    type: "invalid",
  }
}

function signedAngleDelta_rad(angle_rad: number) {
  let nextAngle_rad = angle_rad

  while (nextAngle_rad <= -Math.PI) {
    nextAngle_rad += Math.PI * 2
  }

  while (nextAngle_rad > Math.PI) {
    nextAngle_rad -= Math.PI * 2
  }

  return nextAngle_rad
}

function getTurnSign(signedBendAngle_rad: number) {
  if (Math.abs(signedBendAngle_rad) <= SOLVE_EPSILON) {
    return 0
  }

  return Math.sign(signedBendAngle_rad)
}

function getBendVerticalDisplacement_m({
  bendRadius_m,
  entryAngle_rad,
  exitAngle_rad,
  turnSign,
}: {
  bendRadius_m: number
  entryAngle_rad: number
  exitAngle_rad: number
  turnSign: number
}) {
  if (turnSign === 0) {
    return 0
  }

  return (
    (bendRadius_m / turnSign) *
    (Math.cos(entryAngle_rad) - Math.cos(exitAngle_rad))
  )
}

function getBendDisplacement_m({
  bendDy_m,
  bendRadius_m,
  entryAngle_rad,
  exitAngle_rad,
  turnSign,
}: {
  bendDy_m: number
  bendRadius_m: number
  entryAngle_rad: number
  exitAngle_rad: number
  turnSign: number
}) {
  if (turnSign === 0) {
    return { x: 0, y: 0 }
  }

  return {
    x:
      (bendRadius_m / turnSign) *
      (Math.sin(exitAngle_rad) - Math.sin(entryAngle_rad)),
    y: bendDy_m,
  }
}

function addVector2(a: Vector2, b: Vector2) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  }
}

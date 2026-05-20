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
  entryLength_m: number
  exitLength_m: number
  exitSpeed_mps: number
  flightTime_s: number
  residual_s: number
}

type FlightTimeCandidateSearch =
  | { type: "found"; candidate: FlightTimeCandidate }
  | { type: "not-found"; reason: string }

type BendSolveSetup = {
  bendAngle_rad: number
  bendRadius_m: number
  bendDropPerRadius_mpm: number
  entryAngle_rad: number
  entryDrop_m: number
  entryLength_m: number
  exitAngle_rad: number
  exitDropPerMeter_mpm: number
  gravityInwardNormalAcceleration_mps2: number
  isStraightEquivalent: boolean
  normalExitAlignment: number
  rollingGravityScale_mps2: number
  targetNormalImpactSpeed_mps: number
  targetTotalTime_s: number
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

  // How much the chute turns from entry toward the flatter exit direction.
  const bendAngle_rad = input.chuteBendAngle_rad

  // Radius of the circular bend.
  const bendRadius_m = input.chuteBendRadius_m

  // Chute exit angle after the bend. This is derived, not user-authored.
  const exitAngle_rad = entryAngle_rad + bendAngle_rad

  // Straight chute length before the bend.
  const entryLength_m = input.chuteEntryLength_m

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

  // Fixed vertical drop through the entry chute run.
  const entryDrop_m = -entryLength_m * Math.sin(entryAngle_rad)

  // Vertical drop per meter of solved exit run.
  const exitDropPerMeter_mpm = -Math.sin(exitAngle_rad)

  // Bend drop per meter of bend radius.
  const bendDropPerRadius_mpm =
    Math.cos(exitAngle_rad) - Math.cos(entryAngle_rad)

  // At zero bend angle, bend mode is just a straight chute split into an entry
  // run plus a solved exit run. Keep the same solve path so the UI can slide
  // smoothly into and out of a visible bend.
  const isStraightEquivalent = bendAngle_rad <= SOLVE_EPSILON

  const setup: BendSolveSetup = {
    bendAngle_rad,
    bendRadius_m,
    bendDropPerRadius_mpm,
    entryAngle_rad,
    entryDrop_m,
    entryLength_m,
    exitAngle_rad,
    exitDropPerMeter_mpm,
    gravityInwardNormalAcceleration_mps2,
    isStraightEquivalent,
    normalExitAlignment,
    rollingGravityScale_mps2,
    targetNormalImpactSpeed_mps,
    targetTotalTime_s,
  }

  const invalidReason = getBendSetupInvalidReason(setup)

  if (invalidReason !== null) {
    return invalidSolve(invalidReason)
  }

  // The one unknown we solve numerically is ballistic flight time. For each
  // trial time, impact punch gives exit speed, exit speed gives total required
  // drop, and the remaining drop tells us the exit run length.
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

  // Unit direction along the entry chute.
  const entryDirection = {
    x: Math.cos(entryAngle_rad),
    y: Math.sin(entryAngle_rad),
  }

  // Displacement across the first straight chute segment.
  const entryDisplacement_m = scaleVector2(entryDirection, setup.entryLength_m)

  // Displacement across the circular bend.
  const bendDisplacement_m = getBendDisplacement_m({
    bendRadius_m,
    entryAngle_rad,
    exitAngle_rad,
  })

  // Displacement across the final straight chute segment.
  const exitDisplacement_m = scaleVector2(exitDirection, candidate.exitLength_m)

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
      bendRadius_m,
      chuteBendEnabled: true,
      entryLength_m: setup.entryLength_m,
      exitLength_m: candidate.exitLength_m,
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

  // The entry run and bend radius are fixed by the designer. The exit run
  // supplies the remaining drop.
  const fixedDrop_m = getFixedDrop_m(setup)
  const requiredExitDrop_m = requiredDrop_m - fixedDrop_m

  if (
    !Number.isFinite(requiredExitDrop_m) ||
    requiredExitDrop_m < -SOLVE_EPSILON
  ) {
    return null
  }

  const exitLength_m =
    Math.max(0, requiredExitDrop_m) / setup.exitDropPerMeter_mpm

  if (!Number.isFinite(exitLength_m) || exitLength_m < 0) {
    return null
  }

  const timing = getChuteTiming(setup, exitLength_m)

  if (timing === null) {
    return null
  }

  return {
    chuteTime_s: timing.chuteTime_s,
    entryLength_m: setup.entryLength_m,
    exitLength_m,
    exitSpeed_mps,
    flightTime_s,
    residual_s: timing.chuteTime_s + flightTime_s - setup.targetTotalTime_s,
  }
}

function getChuteTiming(setup: BendSolveSetup, exitLength_m: number) {
  // Rolling acceleration along the entry chute.
  const entryAcceleration_mps2 =
    setup.rollingGravityScale_mps2 * -Math.sin(setup.entryAngle_rad)

  // Rolling acceleration along the exit chute.
  const exitAcceleration_mps2 =
    setup.rollingGravityScale_mps2 * -Math.sin(setup.exitAngle_rad)

  // Speed and time after the entry segment, starting from rest.
  const entryResult = advanceConstantAcceleration(
    0,
    setup.entryLength_m,
    entryAcceleration_mps2
  )

  if (!entryResult.valid) {
    return null
  }

  // Speed after the bend, using the bend's vertical drop.
  const bendDrop_m = setup.isStraightEquivalent
    ? 0
    : setup.bendRadius_m * setup.bendDropPerRadius_mpm
  const bendExitSpeedSquared_m2ps2 =
    entryResult.speed_mps ** 2 + 2 * setup.rollingGravityScale_mps2 * bendDrop_m

  if (bendExitSpeedSquared_m2ps2 < 0) {
    return null
  }

  const bendExitSpeed_mps = Math.sqrt(bendExitSpeedSquared_m2ps2)

  // Time spent inside the curved bend.
  const bendTime_s = getBendTime_s(
    setup,
    setup.bendRadius_m,
    entryResult.speed_mps
  )

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

  return {
    chuteTime_s: entryResult.time_s + bendTime_s + exitResult.time_s,
  }
}

function getBendTime_s(
  setup: BendSolveSetup,
  bendRadius_m: number,
  entrySpeed_mps: number
) {
  const bendLength_m = bendRadius_m * setup.bendAngle_rad

  if (bendLength_m <= SOLVE_EPSILON) {
    return 0
  }

  if (entrySpeed_mps <= SOLVE_EPSILON) {
    const bendDrop_m = bendRadius_m * setup.bendDropPerRadius_mpm
    const bendExitSpeedSquared_m2ps2 =
      2 * setup.rollingGravityScale_mps2 * bendDrop_m

    if (bendExitSpeedSquared_m2ps2 <= 0) {
      return Number.NaN
    }

    return (2 * bendLength_m) / Math.sqrt(bendExitSpeedSquared_m2ps2)
  }

  let weightedIntegral = 0

  for (let index = 0; index <= SIMPSON_INTERVAL_COUNT; index += 1) {
    const progress = index / SIMPSON_INTERVAL_COUNT

    // Local chute angle partway through the bend.
    const angle_rad = setup.entryAngle_rad + progress * setup.bendAngle_rad

    // Positive vertical drop from bend start to this sample point.
    const partialBendDrop_m =
      bendRadius_m * (Math.cos(angle_rad) - Math.cos(setup.entryAngle_rad))

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

  return (bendLength_m * weightedIntegral) / (3 * SIMPSON_INTERVAL_COUNT)
}

function getFixedDrop_m(setup: BendSolveSetup) {
  const bendDrop_m = setup.isStraightEquivalent
    ? 0
    : setup.bendRadius_m * setup.bendDropPerRadius_mpm

  return setup.entryDrop_m + bendDrop_m
}

function chooseFlightTimeCandidate(
  setup: BendSolveSetup
): FlightTimeCandidateSearch {
  let previousCandidate: FlightTimeCandidate | null = null
  let sawValidCandidate = false
  let alwaysTooSlow = true
  let alwaysTooFast = true
  const flightTimes_s = getCandidateFlightTimes_s(setup)

  for (const flightTime_s of flightTimes_s) {
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
            "Chute setup needs adjustment.\nThis bend is right on a solve edge. Nudge the entry run, bend size, or bend angle slightly.",
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
        "Chute setup needs adjustment.\nThis bend cannot make a valid launch with the current entry run, bend size, and angles. Keep the chute sloping downhill or use a gentler bend.",
      type: "not-found",
    }
  }

  if (alwaysTooSlow) {
    return {
      reason:
        "Chute is too slow for the target time.\nMake the entry angle steeper, shorten the entry run, reduce the bend size, or reduce the bend angle to give the marble a faster path.",
      type: "not-found",
    }
  }

  if (alwaysTooFast) {
    return {
      reason:
        "Chute is too fast for the target time.\nMake the entry angle gentler, lengthen the entry run, increase the bend size, or increase the bend angle to soften the path.",
      type: "not-found",
    }
  }

  return {
    reason:
      "Chute setup needs adjustment.\nThis bend has a gap in the valid solve range. Nudge the entry run, bend size, or bend angle.",
    type: "not-found",
  }
}

function getCandidateFlightTimes_s(setup: BendSolveSetup) {
  const flightTimes_s: number[] = []

  for (let sample = 1; sample < ROOT_SAMPLE_COUNT; sample += 1) {
    flightTimes_s.push((setup.targetTotalTime_s * sample) / ROOT_SAMPLE_COUNT)
  }

  const maximumValidFlightTime_s = getMaximumValidFlightTime_s(setup)

  if (
    Number.isFinite(maximumValidFlightTime_s) &&
    maximumValidFlightTime_s > 0 &&
    maximumValidFlightTime_s < setup.targetTotalTime_s
  ) {
    flightTimes_s.push(maximumValidFlightTime_s)
  }

  return flightTimes_s
    .sort((a, b) => a - b)
    .filter((flightTime_s, index, sortedFlightTimes_s) => {
      return (
        index === 0 ||
        Math.abs(flightTime_s - sortedFlightTimes_s[index - 1]) > SOLVE_EPSILON
      )
    })
}

function getMaximumValidFlightTime_s(setup: BendSolveSetup) {
  if (setup.gravityInwardNormalAcceleration_mps2 <= SOLVE_EPSILON) {
    return setup.targetTotalTime_s
  }

  const fixedDrop_m = getFixedDrop_m(setup)
  const minimumExitSpeed_mps = Math.sqrt(
    Math.max(0, 2 * setup.rollingGravityScale_mps2 * fixedDrop_m)
  )
  const fixedDropBoundaryFlightTime_s =
    (setup.targetNormalImpactSpeed_mps -
      setup.normalExitAlignment * minimumExitSpeed_mps) /
    setup.gravityInwardNormalAcceleration_mps2
  const positiveExitSpeedBoundaryFlightTime_s =
    setup.targetNormalImpactSpeed_mps /
    setup.gravityInwardNormalAcceleration_mps2

  return Math.min(
    setup.targetTotalTime_s,
    fixedDropBoundaryFlightTime_s,
    positiveExitSpeedBoundaryFlightTime_s
  )
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
  bendAngle_rad,
  bendRadius_m,
  bendDropPerRadius_mpm,
  entryLength_m,
  exitAngle_rad,
  exitDropPerMeter_mpm,
  isStraightEquivalent,
  normalExitAlignment,
  rollingGravityScale_mps2,
  targetNormalImpactSpeed_mps,
  targetTotalTime_s,
}: BendSolveSetup) {
  if (
    !Number.isFinite(bendRadius_m) ||
    !Number.isFinite(entryLength_m) ||
    bendRadius_m <= 0 ||
    entryLength_m < 0
  ) {
    return "Chute dimensions need adjustment.\nUse a zero or positive entry run and a positive bend size."
  }

  if (bendAngle_rad < -SOLVE_EPSILON) {
    return "Bend angle cannot turn backward.\nUse zero or a positive bend angle so the chute either stays straight or smooths into a flatter launch."
  }

  if (!isStraightEquivalent && bendDropPerRadius_mpm <= SOLVE_EPSILON) {
    return "Bend angle does not add downhill drop.\nUse a bend angle that keeps the chute turning through a downhill path."
  }

  if (exitDropPerMeter_mpm <= SOLVE_EPSILON) {
    return "Exit angle needs downhill slope.\nReduce the bend angle so the solved exit run can keep accelerating the marble."
  }

  if (exitAngle_rad > SOLVE_EPSILON) {
    return "Bend angle is too large.\nReduce the bend angle so the chute still exits level or downhill."
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

  if (normalExitAlignment <= SOLVE_EPSILON) {
    return "Bend angle points the launch away from the drum.\nAdjust the bend angle so the chute exits toward the drum surface."
  }

  return null
}

function invalidSolve(reason: string): SolveResult<ChuteLaunchGeometry> {
  return {
    reason,
    type: "invalid",
  }
}

function getBendDisplacement_m({
  bendRadius_m,
  entryAngle_rad,
  exitAngle_rad,
}: {
  bendRadius_m: number
  entryAngle_rad: number
  exitAngle_rad: number
}) {
  return {
    x: bendRadius_m * (Math.sin(exitAngle_rad) - Math.sin(entryAngle_rad)),
    y: bendRadius_m * (Math.cos(entryAngle_rad) - Math.cos(exitAngle_rad)),
  }
}

function addVector2(a: Vector2, b: Vector2) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  }
}

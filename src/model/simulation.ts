import type {
  BlueprintRealization,
  Observation,
  ObservationChecks,
  ObservationAggregate,
  Snapshot,
} from "@/model/model"

type SimulationStageResult = {
  snapshot: Snapshot
  checks: Partial<ObservationChecks>
  invalidReason: string | null
}

const emptyChecks: ObservationChecks = {
  ballisticsImpactFound: null,
  contactMovingIntoDrumOk: null,
  targetNormalImpactSpeedError_mps: null,
  targetReleaseToImpactTimeError_s: null,
  rampReliableAccelerationOk: null,
  rampRequiredStaticFrictionCoefficient_ratio: null,
  rampStaticFrictionOk: null,
}

function getPivotedDrumSurfaceAngle_rad(
  blueprintRealization: BlueprintRealization
) {
  return (
    blueprintRealization.drumTiltAngle_rad +
    blueprintRealization.drumPivotAngle_rad
  )
}

function getDrumNormal(drumSurfaceAngle_rad: number) {
  return {
    x: -Math.sin(drumSurfaceAngle_rad),
    y: Math.cos(drumSurfaceAngle_rad),
  }
}

function simulateRelease(
  blueprintRealization: BlueprintRealization
): SimulationStageResult {
  // Horizontal release position solved by the blueprint.
  const releasePosition_x_m = blueprintRealization.releasePoint_x_m

  // Vertical release position solved by the blueprint.
  const releasePosition_y_m = blueprintRealization.releasePoint_y_m

  // For now, release means "placed at rest".
  const releaseSpeed_x_mps = 0

  // For now, release means "placed at rest".
  const releaseSpeed_y_mps = 0

  // At rest means no initial spin.
  const releaseSpin_radps = 0

  // Release is the start of the simulated timeline.
  const releaseTime_s = 0

  return {
    snapshot: {
      marblePosition_x_m: releasePosition_x_m,
      marblePosition_y_m: releasePosition_y_m,
      marbleSpeed_x_mps: releaseSpeed_x_mps,
      marbleSpeed_y_mps: releaseSpeed_y_mps,
      marbleSpin_radps: releaseSpin_radps,
      time_s: releaseTime_s,
    },
    checks: {},
    invalidReason: null,
  }
}

function simulateRampUntilDrop(
  blueprintRealization: BlueprintRealization,
  releaseSnapshot: Snapshot
): SimulationStageResult {
  // Ramp angle, measured from horizontal, positive counterclockwise.
  const rampAngle_rad = blueprintRealization.rampAngle_rad

  // Distance from the release point to the drop point along the ramp.
  const rampLength_m = blueprintRealization.rampLength_m

  // Gravity magnitude.
  const gravity_mps2 = blueprintRealization.gravity_mps2

  // Ramp energy efficiency, where 1 means no rolling loss.
  const rampEnergyEfficiency_ratio =
    blueprintRealization.rampEnergyEfficiency_ratio

  // Minimum acceleration we trust to start motion in the real world.
  const minimumReliableRampAcceleration_mps2 =
    blueprintRealization.minimumReliableRampAcceleration_mps2

  // Rolling acceleration factor, e.g. 5/7 for a solid sphere.
  const rollingInertiaFactor_ratio =
    blueprintRealization.rollingInertiaFactor_ratio

  // Radius lets us convert no-slip linear speed into marble spin.
  const marbleRadius_m = blueprintRealization.marbleDiameter_m / 2

  // Unit direction along the ramp, from release to drop.
  const rampDirection = {
    x: Math.cos(rampAngle_rad),
    y: Math.sin(rampAngle_rad),
  }

  // Release velocity projected along the ramp direction.
  const releaseSpeedAlongRamp_mps =
    releaseSnapshot.marbleSpeed_x_mps * rampDirection.x +
    releaseSnapshot.marbleSpeed_y_mps * rampDirection.y

  // Gravity component that accelerates the marble along the ramp.
  const gravityAlongRamp_mps2 = gravity_mps2 * -Math.sin(rampAngle_rad)

  // Rolling acceleration along the ramp after inertia and losses.
  const rampAcceleration_mps2 =
    rampEnergyEfficiency_ratio *
    rollingInertiaFactor_ratio *
    gravityAlongRamp_mps2

  // Existing forward speed means the marble is already moving along the ramp.
  const rampAlreadyMovingOk = releaseSpeedAlongRamp_mps > 0

  // Very small acceleration may not overcome real-world imperfections.
  const rampReliableAccelerationOk =
    rampAlreadyMovingOk ||
    Math.abs(rampAcceleration_mps2) >=
      Math.abs(minimumReliableRampAcceleration_mps2)

  // Gravity component that presses the marble into the ramp.
  const rampNormalAcceleration_mps2 = gravity_mps2 * Math.cos(rampAngle_rad)

  // Static friction provides the torque that makes the marble roll.
  const rollingFrictionAcceleration_mps2 =
    (1 - rollingInertiaFactor_ratio) * gravityAlongRamp_mps2

  // Static friction required for rolling without slipping.
  const rampRequiredStaticFrictionCoefficient_ratio =
    rampNormalAcceleration_mps2 > 0
      ? Math.abs(rollingFrictionAcceleration_mps2) /
        rampNormalAcceleration_mps2
      : Number.POSITIVE_INFINITY

  // Whether the provided friction coefficient is enough for no-slip rolling.
  const rampStaticFrictionOk =
    rampRequiredStaticFrictionCoefficient_ratio <=
    blueprintRealization.staticFrictionCoefficient_ratio

  const checks = {
    rampReliableAccelerationOk,
    rampRequiredStaticFrictionCoefficient_ratio,
    rampStaticFrictionOk,
  }

  // A negative distance would mean the blueprint asks us to roll backwards.
  if (rampLength_m < 0) {
    return {
      snapshot: releaseSnapshot,
      checks,
      invalidReason: "Ramp length is negative.",
    }
  }

  // A zero or negative marble radius cannot produce a meaningful spin.
  if (marbleRadius_m <= 0) {
    return {
      snapshot: releaseSnapshot,
      checks,
      invalidReason: "Marble radius is not positive.",
    }
  }

  // Near-horizontal ramps may solve on paper but fail to start in practice.
  if (!rampReliableAccelerationOk) {
    return {
      snapshot: releaseSnapshot,
      checks,
      invalidReason: "Ramp acceleration is below the reliable motion threshold.",
    }
  }

  // This simulation stage assumes rolling without slipping.
  if (!rampStaticFrictionOk) {
    return {
      snapshot: releaseSnapshot,
      checks,
      invalidReason: "Ramp static friction is too low for no-slip rolling.",
    }
  }

  // Predicted by the kinematic equation: v1^2 = v0^2 + 2 a L.
  const predictedExitSpeedSquared_m2ps2 =
    releaseSpeedAlongRamp_mps ** 2 + 2 * rampAcceleration_mps2 * rampLength_m

  // Negative predicted squared speed means no real exit speed exists.
  if (predictedExitSpeedSquared_m2ps2 < 0) {
    return {
      snapshot: releaseSnapshot,
      checks,
      invalidReason:
        "Ramp acceleration cannot carry the marble to the drop point.",
    }
  }

  // Speed along the ramp at the drop point.
  const exitSpeedAlongRamp_mps = Math.sqrt(predictedExitSpeedSquared_m2ps2)

  // Time spent on the ramp.
  let rampTime_s: number

  // Kinematic equation: v1 = v0 + a t.
  if (Math.abs(rampAcceleration_mps2) > Number.EPSILON) {
    rampTime_s =
      (exitSpeedAlongRamp_mps - releaseSpeedAlongRamp_mps) /
      rampAcceleration_mps2

  } else if (releaseSpeedAlongRamp_mps > 0) {
    // No acceleration means constant speed along the ramp.
    rampTime_s = rampLength_m / releaseSpeedAlongRamp_mps

  } else {
    // No acceleration and no release speed means nothing moves.
    return {
      snapshot: releaseSnapshot,
      checks,
      invalidReason: "Ramp acceleration and release speed are both zero.",
    }
  }

  // Negative or non-finite time means the kinematics are not physical.
  if (!Number.isFinite(rampTime_s) || rampTime_s < 0) {
    return {
      snapshot: releaseSnapshot,
      checks,
      invalidReason: "Ramp travel time is invalid.",
    }
  }

  // Drop position after moving along the ramp by its length.
  const dropPosition_x_m =
    releaseSnapshot.marblePosition_x_m + rampDirection.x * rampLength_m

  // Drop position after moving along the ramp by its length.
  const dropPosition_y_m =
    releaseSnapshot.marblePosition_y_m + rampDirection.y * rampLength_m

  // Drop speed vector points along the ramp.
  const dropSpeed_x_mps = rampDirection.x * exitSpeedAlongRamp_mps

  // Drop speed vector points along the ramp.
  const dropSpeed_y_mps = rampDirection.y * exitSpeedAlongRamp_mps

  // No-slip rolling converts the change in linear speed to spin.
  const spinGain_radps =
    (exitSpeedAlongRamp_mps - releaseSpeedAlongRamp_mps) / marbleRadius_m

  // Spin at the drop point.
  const dropSpin_radps = releaseSnapshot.marbleSpin_radps + spinGain_radps

  // Simulation time at the drop point.
  const dropTime_s = releaseSnapshot.time_s + rampTime_s

  return {
    snapshot: {
      marblePosition_x_m: dropPosition_x_m,
      marblePosition_y_m: dropPosition_y_m,
      marbleSpeed_x_mps: dropSpeed_x_mps,
      marbleSpeed_y_mps: dropSpeed_y_mps,
      marbleSpin_radps: dropSpin_radps,
      time_s: dropTime_s,
    },
    checks,
    invalidReason: null,
  }
}

function simulateBallisticsUntilImpact(
  blueprintRealization: BlueprintRealization,
  dropSnapshot: Snapshot
): SimulationStageResult {
  // Pivot angle applied to the whole drum assembly.
  const drumPivotAngle_rad = blueprintRealization.drumPivotAngle_rad

  // Distance from the pivot to the unpivoted impact point.
  const drumPivotArmLength_m = blueprintRealization.drumPivotArmLength_m

  // Gravity magnitude.
  const gravity_mps2 = blueprintRealization.gravity_mps2

  // Impact point before the pivot arm moves.
  const unpivotedImpactPoint_x_m = blueprintRealization.impactPoint_x_m

  // Impact point before the pivot arm moves.
  const unpivotedImpactPoint_y_m = blueprintRealization.impactPoint_y_m

  // The pivot sits one arm length to the negative X side of the impact point.
  const drumPivotPoint_x_m =
    unpivotedImpactPoint_x_m - drumPivotArmLength_m

  // The pivot sits horizontally level with the unpivoted impact point.
  const drumPivotPoint_y_m = unpivotedImpactPoint_y_m

  // The impact point starts one arm length to the positive X side of the pivot.
  const unpivotedImpactOffsetFromPivot_x_m = drumPivotArmLength_m

  // The impact point starts horizontally level with the pivot.
  const unpivotedImpactOffsetFromPivot_y_m = 0

  // Rotate the impact point around the pivot.
  const pivotedImpactOffsetFromPivot_x_m =
    unpivotedImpactOffsetFromPivot_x_m * Math.cos(drumPivotAngle_rad) -
    unpivotedImpactOffsetFromPivot_y_m * Math.sin(drumPivotAngle_rad)

  // Rotate the impact point around the pivot.
  const pivotedImpactOffsetFromPivot_y_m =
    unpivotedImpactOffsetFromPivot_x_m * Math.sin(drumPivotAngle_rad) +
    unpivotedImpactOffsetFromPivot_y_m * Math.cos(drumPivotAngle_rad)

  // Impact point for the marble center after pivoting.
  const impactPoint_x_m =
    drumPivotPoint_x_m + pivotedImpactOffsetFromPivot_x_m

  // Impact point for the marble center after pivoting.
  const impactPoint_y_m =
    drumPivotPoint_y_m + pivotedImpactOffsetFromPivot_y_m

  // Final drum surface angle after the pivot rotates the whole assembly.
  const drumSurfaceAngle_rad =
    getPivotedDrumSurfaceAngle_rad(blueprintRealization)

  const checks = {
    ballisticsImpactFound: false,
  }

  if (drumPivotArmLength_m < 0) {
    return {
      snapshot: dropSnapshot,
      checks,
      invalidReason: "Drum pivot arm length is negative.",
    }
  }

  // Unit normal of the tilted drum surface, pointing outward.
  const drumNormal = getDrumNormal(drumSurfaceAngle_rad)

  // Gravity vector.
  const gravityVector_mps2 = {
    x: 0,
    y: -gravity_mps2,
  }

  // Drop position relative to the impact point.
  const dropOffsetFromImpact = {
    x: dropSnapshot.marblePosition_x_m - impactPoint_x_m,
    y: dropSnapshot.marblePosition_y_m - impactPoint_y_m,
  }

  // Signed distance from the drop point to the drum line.
  const dropDistanceAlongDrumNormal_m =
    dropOffsetFromImpact.x * drumNormal.x +
    dropOffsetFromImpact.y * drumNormal.y

  // Drop velocity projected onto the drum normal.
  const dropSpeedAlongDrumNormal_mps =
    dropSnapshot.marbleSpeed_x_mps * drumNormal.x +
    dropSnapshot.marbleSpeed_y_mps * drumNormal.y

  // Gravity acceleration projected onto the drum normal.
  const gravityAlongDrumNormal_mps2 =
    gravityVector_mps2.x * drumNormal.x + gravityVector_mps2.y * drumNormal.y

  // Quadratic coefficient for position along the drum normal.
  const impactTimeQuadratic_a = 0.5 * gravityAlongDrumNormal_mps2

  // Linear coefficient for position along the drum normal.
  const impactTimeQuadratic_b = dropSpeedAlongDrumNormal_mps

  // Constant coefficient for position along the drum normal.
  const impactTimeQuadratic_c = dropDistanceAlongDrumNormal_m

  // Discriminant tells us whether the ballistic path reaches the drum line.
  const impactTimeDiscriminant =
    impactTimeQuadratic_b ** 2 -
    4 * impactTimeQuadratic_a * impactTimeQuadratic_c

  if (impactTimeDiscriminant < 0) {
    return {
      snapshot: dropSnapshot,
      checks,
      invalidReason: "Ballistic path does not intersect the drum surface.",
    }
  }

  // Candidate flight times from the quadratic equation.
  const impactTimeCandidates_s: number[] = []

  if (Math.abs(impactTimeQuadratic_a) > Number.EPSILON) {
    const impactTimeDiscriminantRoot = Math.sqrt(impactTimeDiscriminant)
    const denominator = 2 * impactTimeQuadratic_a

    impactTimeCandidates_s.push(
      (-impactTimeQuadratic_b - impactTimeDiscriminantRoot) / denominator,
      (-impactTimeQuadratic_b + impactTimeDiscriminantRoot) / denominator
    )
  } else if (Math.abs(impactTimeQuadratic_b) > Number.EPSILON) {
    impactTimeCandidates_s.push(
      -impactTimeQuadratic_c / impactTimeQuadratic_b
    )
  }

  // Only future or immediate intersections are physical.
  const validImpactTimeCandidates_s = impactTimeCandidates_s.filter(
    (candidate_s) => Number.isFinite(candidate_s) && candidate_s >= 0
  )

  if (validImpactTimeCandidates_s.length === 0) {
    return {
      snapshot: dropSnapshot,
      checks,
      invalidReason: "Ballistic path intersects the drum only in the past.",
    }
  }

  // The first future intersection is the impact.
  const flightTime_s = Math.min(...validImpactTimeCandidates_s)

  // Horizontal position after ballistic flight.
  const impactPosition_x_m =
    dropSnapshot.marblePosition_x_m +
    dropSnapshot.marbleSpeed_x_mps * flightTime_s +
    0.5 * gravityVector_mps2.x * flightTime_s ** 2

  // Vertical position after ballistic flight.
  const impactPosition_y_m =
    dropSnapshot.marblePosition_y_m +
    dropSnapshot.marbleSpeed_y_mps * flightTime_s +
    0.5 * gravityVector_mps2.y * flightTime_s ** 2

  // Horizontal speed after ballistic flight.
  const impactSpeed_x_mps =
    dropSnapshot.marbleSpeed_x_mps + gravityVector_mps2.x * flightTime_s

  // Vertical speed after ballistic flight.
  const impactSpeed_y_mps =
    dropSnapshot.marbleSpeed_y_mps + gravityVector_mps2.y * flightTime_s

  // Spin is unchanged while airborne.
  const impactSpin_radps = dropSnapshot.marbleSpin_radps

  // Simulation time at impact.
  const impactTime_s = dropSnapshot.time_s + flightTime_s

  return {
    snapshot: {
      marblePosition_x_m: impactPosition_x_m,
      marblePosition_y_m: impactPosition_y_m,
      marbleSpeed_x_mps: impactSpeed_x_mps,
      marbleSpeed_y_mps: impactSpeed_y_mps,
      marbleSpin_radps: impactSpin_radps,
      time_s: impactTime_s,
    },
    checks: {
      ballisticsImpactFound: true,
    },
    invalidReason: null,
  }
}

function simulateContactUntilBounce(
  blueprintRealization: BlueprintRealization,
  releaseSnapshot: Snapshot,
  impactIsTrusted: boolean,
  impactSnapshot: Snapshot
): SimulationStageResult {
  // Final drum surface angle after the pivot rotates the whole assembly.
  const drumSurfaceAngle_rad =
    getPivotedDrumSurfaceAngle_rad(blueprintRealization)

  // Radius lets us convert between spin and surface speed.
  const marbleRadius_m = blueprintRealization.marbleDiameter_m / 2

  // Impact restitution coefficient for the normal bounce.
  const impactRestitutionCoefficient_ratio =
    blueprintRealization.impactRestitutionCoefficient_ratio

  // Impact friction coefficient for tangential losses.
  const impactFrictionCoefficient_ratio =
    blueprintRealization.impactFrictionCoefficient_ratio

  // How much tangential spin slip transfers into bounce velocity.
  const spinTransferEfficiency_ratio =
    blueprintRealization.spinTransferEfficiency_ratio

  // Unit tangent of the drum surface.
  const drumTangent = {
    x: Math.cos(drumSurfaceAngle_rad),
    y: Math.sin(drumSurfaceAngle_rad),
  }

  // Unit normal of the drum surface.
  const drumNormal = getDrumNormal(drumSurfaceAngle_rad)

  // Impact velocity projected along the drum tangent.
  const impactTangentialSpeed_mps =
    impactSnapshot.marbleSpeed_x_mps * drumTangent.x +
    impactSnapshot.marbleSpeed_y_mps * drumTangent.y

  // Impact velocity projected along the drum normal.
  const impactNormalSpeed_mps =
    impactSnapshot.marbleSpeed_x_mps * drumNormal.x +
    impactSnapshot.marbleSpeed_y_mps * drumNormal.y

  // Choose the contact normal so incoming motion points into the drum.
  const contactNormalSign = impactNormalSpeed_mps <= 0 ? 1 : -1

  // Contact normal pointing away from the drum after impact.
  const contactNormal = {
    x: drumNormal.x * contactNormalSign,
    y: drumNormal.y * contactNormalSign,
  }

  // Incoming normal speed should be negative in contact-normal coordinates.
  const incomingNormalSpeed_mps = impactNormalSpeed_mps * contactNormalSign

  // Incoming velocity must move into the drum for a bounce to make sense.
  const contactMovingIntoDrumOk = incomingNormalSpeed_mps < 0

  // Target verification only makes sense if the marble really reached impact.
  const canVerifyTargets = impactIsTrusted

  // The error is actual total time minus requested total time.
  const targetReleaseToImpactTimeError_s = canVerifyTargets
    ? impactSnapshot.time_s -
      releaseSnapshot.time_s -
      blueprintRealization.targetReleaseToImpactTime_s
    : null

  // The impact speed target is measured into the drum normal.
  const targetNormalImpactSpeedError_mps = canVerifyTargets
    ? -impactNormalSpeed_mps -
      blueprintRealization.targetNormalImpactSpeed_mps
    : null

  const checks = {
    contactMovingIntoDrumOk,
    targetNormalImpactSpeedError_mps,
    targetReleaseToImpactTimeError_s,
  }

  if (marbleRadius_m <= 0) {
    return {
      snapshot: impactSnapshot,
      checks,
      invalidReason: "Marble radius is not positive.",
    }
  }

  if (!contactMovingIntoDrumOk) {
    return {
      snapshot: impactSnapshot,
      checks,
      invalidReason: "Marble is not moving into the drum at contact.",
    }
  }

  // Restitution reverses the incoming normal component and loses energy.
  const bounceNormalSpeed_mps =
    -impactRestitutionCoefficient_ratio * incomingNormalSpeed_mps

  // Impact friction reduces tangential sliding speed.
  const frictionRetainedTangentialSpeed_ratio =
    1 - impactFrictionCoefficient_ratio

  // Tangential speed after direct friction loss.
  const frictionTangentialSpeed_mps =
    impactTangentialSpeed_mps * frictionRetainedTangentialSpeed_ratio

  // Surface speed from marble spin at the contact patch.
  const spinSurfaceSpeed_mps = impactSnapshot.marbleSpin_radps * marbleRadius_m

  // Difference between rolling surface speed and tangential travel speed.
  const spinSlipSpeed_mps = spinSurfaceSpeed_mps - impactTangentialSpeed_mps

  // Spin slip can add or remove tangential bounce speed.
  const spinTransferSpeed_mps = spinSlipSpeed_mps * spinTransferEfficiency_ratio

  // Tangential speed after friction and spin transfer.
  const bounceTangentialSpeed_mps =
    frictionTangentialSpeed_mps + spinTransferSpeed_mps

  // Spin changes in the opposite direction of the transferred surface speed.
  const bounceSpin_radps =
    impactSnapshot.marbleSpin_radps -
    spinTransferSpeed_mps / marbleRadius_m

  // Horizontal bounce speed rebuilt from tangent and normal components.
  const bounceSpeed_x_mps =
    drumTangent.x * bounceTangentialSpeed_mps +
    contactNormal.x * bounceNormalSpeed_mps

  // Vertical bounce speed rebuilt from tangent and normal components.
  const bounceSpeed_y_mps =
    drumTangent.y * bounceTangentialSpeed_mps +
    contactNormal.y * bounceNormalSpeed_mps

  return {
    snapshot: {
      marblePosition_x_m: impactSnapshot.marblePosition_x_m,
      marblePosition_y_m: impactSnapshot.marblePosition_y_m,
      marbleSpeed_x_mps: bounceSpeed_x_mps,
      marbleSpeed_y_mps: bounceSpeed_y_mps,
      marbleSpin_radps: bounceSpin_radps,
      time_s: impactSnapshot.time_s,
    },
    checks,
    invalidReason: null,
  }
}

export function runSimulationStep(
  blueprintRealization: BlueprintRealization,
  _run: number
): Observation {
  void _run

  const releaseResult = simulateRelease(blueprintRealization)
  const releaseSnapshot = releaseResult.snapshot
  const rampResult = simulateRampUntilDrop(
    blueprintRealization,
    releaseSnapshot
  )
  const dropSnapshot = rampResult.snapshot
  const ballisticsResult = simulateBallisticsUntilImpact(
    blueprintRealization,
    dropSnapshot
  )
  const impactSnapshot = ballisticsResult.snapshot
  const contactResult = simulateContactUntilBounce(
    blueprintRealization,
    releaseSnapshot,
    rampResult.invalidReason === null &&
      ballisticsResult.invalidReason === null,
    impactSnapshot
  )
  const bounceSnapshot = contactResult.snapshot

  const stageResults = [
    releaseResult,
    rampResult,
    ballisticsResult,
    contactResult,
  ]

  // Later stages add their checks to the same observation.
  const checks = Object.assign(
    {},
    ...stageResults.map((result) => result.checks)
  )

  // The first invalid stage explains why the run should not be trusted.
  const invalidReason =
    stageResults.find((result) => result.invalidReason !== null)
      ?.invalidReason ?? null

  return {
    blueprintRealization,
    valid: invalidReason === null,
    invalidReason,
    checks: {
      ...emptyChecks,
      ...checks,
    },
    releaseSnapshot,
    dropSnapshot,
    impactSnapshot,
    bounceSnapshot,
  }
}

export function createObservationAggregate(
  requestedRuns: number
): ObservationAggregate {
  return {
    completedRuns: 0,
    requestedRuns,
    nominalObservation: null,
    samples: [],
  }
}

export function setNominalObservation(
  aggregate: ObservationAggregate,
  nominalObservation: Observation
): ObservationAggregate {
  return {
    ...aggregate,
    nominalObservation,
  }
}

export function reduceObservationAggregate(
  aggregate: ObservationAggregate,
  observation: Observation,
  requestedSampleCount: number
): ObservationAggregate {
  const completedRuns = aggregate.completedRuns + 1
  let samples = aggregate.samples

  if (requestedSampleCount > 0 && samples.length < requestedSampleCount) {
    samples = [...samples, observation]
  }

  return {
    ...aggregate,
    completedRuns,
    samples,
  }
}

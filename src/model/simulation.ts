import type {
  BlueprintRealization,
  Observation,
  ObservationChecks,
  Snapshot,
} from "@/model/model"

type SimulationStageResult = {
  snapshot: Snapshot
  checks: Partial<ObservationChecks>
  invalidReason: string | null
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

function simulateChuteUntilDrop(
  blueprintRealization: BlueprintRealization,
  releaseSnapshot: Snapshot
): SimulationStageResult {
  if (blueprintRealization.chuteBendEnabled) {
    return simulateBendChuteUntilDrop(blueprintRealization, releaseSnapshot)
  }

  return simulateStraightChuteUntilDrop(blueprintRealization, releaseSnapshot)
}

function simulateStraightChuteUntilDrop(
  blueprintRealization: BlueprintRealization,
  releaseSnapshot: Snapshot
): SimulationStageResult {
  // Chute entry angle, measured from horizontal, positive counterclockwise.
  const chuteEntryAngle_rad = blueprintRealization.chuteEntryAngle_rad

  // Distance from the release point to the drop point along the straight chute.
  const chuteLength_m = blueprintRealization.chuteEntryLength_m

  // Gravity magnitude.
  const gravity_mps2 = blueprintRealization.gravity_mps2

  // Chute energy efficiency, where 1 means no rolling loss.
  const chuteEnergyEfficiency_ratio =
    blueprintRealization.chuteEnergyEfficiency_ratio

  // Minimum acceleration we trust to start motion in the real world.
  const minimumReliableChuteAcceleration_mps2 =
    blueprintRealization.minimumReliableChuteAcceleration_mps2

  // Rolling acceleration factor, e.g. 5/7 for a solid sphere.
  const rollingInertiaFactor_ratio =
    blueprintRealization.rollingInertiaFactor_ratio

  // Radius lets us convert no-slip linear speed into marble spin.
  const marbleRadius_m = blueprintRealization.marbleDiameter_m / 2

  // Unit direction along the chute, from release to drop.
  const chuteDirection = {
    x: Math.cos(chuteEntryAngle_rad),
    y: Math.sin(chuteEntryAngle_rad),
  }

  // Release velocity projected along the chute direction.
  const releaseSpeedAlongChute_mps =
    releaseSnapshot.marbleSpeed_x_mps * chuteDirection.x +
    releaseSnapshot.marbleSpeed_y_mps * chuteDirection.y

  // Gravity component that accelerates the marble along the chute.
  const gravityAlongChute_mps2 = gravity_mps2 * -Math.sin(chuteEntryAngle_rad)

  // Rolling acceleration along the chute after inertia and losses.
  const chuteAcceleration_mps2 =
    chuteEnergyEfficiency_ratio *
    rollingInertiaFactor_ratio *
    gravityAlongChute_mps2

  // Gravity component that presses the marble into the chute.
  const chuteNormalAcceleration_mps2 =
    gravity_mps2 * Math.cos(chuteEntryAngle_rad)

  // Static friction provides the torque that makes the marble roll.
  const rollingFrictionAcceleration_mps2 =
    (1 - rollingInertiaFactor_ratio) * gravityAlongChute_mps2

  // Static friction required for rolling without slipping.
  const chuteRequiredStaticFrictionCoefficient_ratio =
    chuteNormalAcceleration_mps2 > 0
      ? Math.abs(rollingFrictionAcceleration_mps2) /
        chuteNormalAcceleration_mps2
      : Number.POSITIVE_INFINITY

  // Whether the provided friction coefficient is enough for no-slip rolling.
  const chuteStaticFrictionOk =
    chuteRequiredStaticFrictionCoefficient_ratio <=
    blueprintRealization.staticFrictionCoefficient_ratio

  // Kinetic friction is used only while the contact patch is sliding.
  const kineticFrictionCoefficient_ratio =
    blueprintRealization.kineticFrictionCoefficient_ratio

  // In this simple model, kinetic friction should not exceed static friction.
  const effectiveKineticFrictionCoefficient_ratio = Math.min(
    Math.max(0, kineticFrictionCoefficient_ratio),
    Math.max(0, blueprintRealization.staticFrictionCoefficient_ratio)
  )

  // Kinetic friction acceleration scale.
  const kineticFrictionAcceleration_mps2 =
    effectiveKineticFrictionCoefficient_ratio *
    Math.max(0, chuteNormalAcceleration_mps2)

  // Existing forward speed means the marble is already moving along the chute.
  const chuteAlreadyMovingOk = releaseSpeedAlongChute_mps > 0

  // If we cannot rely on static rolling, the chute initially uses sliding.
  const startingSlipSign = gravityAlongChute_mps2 >= 0 ? 1 : -1
  const startingSlidingAcceleration_mps2 =
    gravityAlongChute_mps2 - startingSlipSign * kineticFrictionAcceleration_mps2

  // Very small acceleration may not overcome real-world imperfections.
  const chuteReliableAccelerationOk =
    chuteAlreadyMovingOk ||
    Math.abs(
      chuteStaticFrictionOk
        ? chuteAcceleration_mps2
        : startingSlidingAcceleration_mps2
    ) >= Math.abs(minimumReliableChuteAcceleration_mps2)

  const checks = {
    chuteReliableAccelerationOk,
    chuteRequiredStaticFrictionCoefficient_ratio,
    chuteStaticFrictionOk,
  }

  // A negative distance would mean the blueprint asks us to roll backwards.
  if (chuteLength_m < 0) {
    return {
      snapshot: releaseSnapshot,
      checks,
      invalidReason: "Chute length is negative.",
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

  // Near-horizontal chutes may solve on paper but fail to start in practice.
  if (!chuteReliableAccelerationOk) {
    return {
      snapshot: releaseSnapshot,
      checks,
      invalidReason:
        "Chute acceleration is below the reliable motion threshold.",
    }
  }

  // Rolling acceleration factor beta maps to I = c m r^2.
  const marbleInertiaCoefficient_ratio = 1 / rollingInertiaFactor_ratio - 1

  // Without inertia, friction cannot convert sliding into spin.
  if (
    !Number.isFinite(marbleInertiaCoefficient_ratio) ||
    marbleInertiaCoefficient_ratio <= 0
  ) {
    return {
      snapshot: releaseSnapshot,
      checks,
      invalidReason: "Rolling inertia factor is invalid.",
    }
  }

  function travelTimeForDistance_s(
    distance_m: number,
    speed_mps: number,
    acceleration_mps2: number
  ) {
    // Zero distance means the segment is already complete.
    if (distance_m === 0) {
      return 0
    }

    // Constant speed case: L = v t.
    if (Math.abs(acceleration_mps2) <= Number.EPSILON) {
      return speed_mps > 0 ? distance_m / speed_mps : null
    }

    // Predicted by the kinematic equation: v1^2 = v0^2 + 2 a L.
    const predictedSpeedSquared_m2ps2 =
      speed_mps ** 2 + 2 * acceleration_mps2 * distance_m

    // Negative predicted squared speed means no real exit speed exists.
    if (predictedSpeedSquared_m2ps2 < 0) {
      return null
    }

    // Candidate exit speeds from the quadratic equation.
    const predictedSpeed_mps = Math.sqrt(predictedSpeedSquared_m2ps2)

    // Kinematic equation: v1 = v0 + a t.
    const firstTime_s = (predictedSpeed_mps - speed_mps) / acceleration_mps2

    // The second root matters when acceleration is negative.
    const secondTime_s = (-predictedSpeed_mps - speed_mps) / acceleration_mps2

    // Keep the earliest physical time.
    const positiveTimes_s = [firstTime_s, secondTime_s].filter(
      (time_s) => Number.isFinite(time_s) && time_s >= 0
    )

    return positiveTimes_s.length > 0 ? Math.min(...positiveTimes_s) : null
  }

  type ChuteSegmentResult = {
    distance_m: number
    speed_mps: number
    spin_radps: number
    time_s: number
  }

  function simulateRollingSegment(
    distance_m: number,
    startSpeed_mps: number,
    startSpin_radps: number
  ): ChuteSegmentResult | null {
    const segmentTime_s = travelTimeForDistance_s(
      distance_m,
      startSpeed_mps,
      chuteAcceleration_mps2
    )

    if (segmentTime_s === null) {
      return null
    }

    // Kinematic equation: v1 = v0 + a t.
    const endSpeed_mps = startSpeed_mps + chuteAcceleration_mps2 * segmentTime_s

    // No-slip rolling keeps v = omega r.
    const endSpin_radps =
      startSpin_radps + (endSpeed_mps - startSpeed_mps) / marbleRadius_m

    return {
      distance_m,
      speed_mps: endSpeed_mps,
      spin_radps: endSpin_radps,
      time_s: segmentTime_s,
    }
  }

  function simulateSlidingSegment(
    distance_m: number,
    startSpeed_mps: number,
    startSpin_radps: number,
    slipSign: number
  ): ChuteSegmentResult | null {
    // Kinetic friction pushes against the slipping contact patch.
    const segmentAcceleration_mps2 =
      gravityAlongChute_mps2 - slipSign * kineticFrictionAcceleration_mps2

    // The same friction creates torque and changes spin.
    const segmentSpinAcceleration_radps2 =
      (slipSign * kineticFrictionAcceleration_mps2) /
      (marbleInertiaCoefficient_ratio * marbleRadius_m)

    const segmentTime_s = travelTimeForDistance_s(
      distance_m,
      startSpeed_mps,
      segmentAcceleration_mps2
    )

    if (segmentTime_s === null) {
      return null
    }

    // Kinematic equation: v1 = v0 + a t.
    const endSpeed_mps =
      startSpeed_mps + segmentAcceleration_mps2 * segmentTime_s

    // Angular kinematic equation: omega1 = omega0 + alpha t.
    const endSpin_radps =
      startSpin_radps + segmentSpinAcceleration_radps2 * segmentTime_s

    return {
      distance_m,
      speed_mps: endSpeed_mps,
      spin_radps: endSpin_radps,
      time_s: segmentTime_s,
    }
  }

  // Current spin under our chute convention.
  const releaseSpin_radps = releaseSnapshot.marbleSpin_radps

  // Contact patch slip speed. Zero means v = omega r and pure rolling is possible.
  const releaseSlipSpeed_mps =
    releaseSpeedAlongChute_mps - releaseSpin_radps * marbleRadius_m

  // Numerical tolerance for deciding whether contact is already no-slip.
  const slipSpeedTolerance_mps = 1e-9

  // Rolling can start immediately only if the state is already no-slip.
  const startsRolling =
    chuteStaticFrictionOk &&
    Math.abs(releaseSlipSpeed_mps) <= slipSpeedTolerance_mps

  let exitSpeedAlongChute_mps: number
  let dropSpin_radps: number
  let chuteTime_s: number

  if (startsRolling) {
    const rollingResult = simulateRollingSegment(
      chuteLength_m,
      releaseSpeedAlongChute_mps,
      releaseSpin_radps
    )

    if (rollingResult === null) {
      return {
        snapshot: releaseSnapshot,
        checks,
        invalidReason:
          "Chute acceleration cannot carry the marble to the drop point.",
      }
    }

    exitSpeedAlongChute_mps = rollingResult.speed_mps
    dropSpin_radps = rollingResult.spin_radps
    chuteTime_s = rollingResult.time_s
  } else {
    // Positive slip means the marble is outrunning its spin.
    const firstSlipSign =
      Math.abs(releaseSlipSpeed_mps) > slipSpeedTolerance_mps
        ? Math.sign(releaseSlipSpeed_mps)
        : startingSlipSign

    // Sliding linear acceleration while that slip direction remains true.
    const slidingAcceleration_mps2 =
      gravityAlongChute_mps2 - firstSlipSign * kineticFrictionAcceleration_mps2

    // Sliding angular acceleration while that slip direction remains true.
    const slidingSpinAcceleration_radps2 =
      (firstSlipSign * kineticFrictionAcceleration_mps2) /
      (marbleInertiaCoefficient_ratio * marbleRadius_m)

    // Slip changes as linear speed and surface spin speed diverge or converge.
    const slipAcceleration_mps2 =
      slidingAcceleration_mps2 - slidingSpinAcceleration_radps2 * marbleRadius_m

    // Time until v = omega r, if friction is closing the slip gap.
    const timeUntilNoSlip_s =
      releaseSlipSpeed_mps * slipAcceleration_mps2 < 0
        ? -releaseSlipSpeed_mps / slipAcceleration_mps2
        : null

    // Distance traveled before the contact patch catches up.
    const distanceUntilNoSlip_m =
      timeUntilNoSlip_s === null
        ? null
        : releaseSpeedAlongChute_mps * timeUntilNoSlip_s +
          0.5 * slidingAcceleration_mps2 * timeUntilNoSlip_s ** 2

    const canCatchAndRoll =
      chuteStaticFrictionOk &&
      timeUntilNoSlip_s !== null &&
      distanceUntilNoSlip_m !== null &&
      timeUntilNoSlip_s >= 0 &&
      distanceUntilNoSlip_m >= 0 &&
      distanceUntilNoSlip_m <= chuteLength_m

    if (canCatchAndRoll) {
      const slidingResult = simulateSlidingSegment(
        distanceUntilNoSlip_m,
        releaseSpeedAlongChute_mps,
        releaseSpin_radps,
        firstSlipSign
      )

      if (slidingResult === null) {
        return {
          snapshot: releaseSnapshot,
          checks,
          invalidReason:
            "Sliding friction cannot carry the marble to rolling contact.",
        }
      }

      const rollingResult = simulateRollingSegment(
        chuteLength_m - slidingResult.distance_m,
        slidingResult.speed_mps,
        slidingResult.spin_radps
      )

      if (rollingResult === null) {
        return {
          snapshot: releaseSnapshot,
          checks,
          invalidReason:
            "Rolling acceleration cannot carry the marble to the drop point.",
        }
      }

      exitSpeedAlongChute_mps = rollingResult.speed_mps
      dropSpin_radps = rollingResult.spin_radps
      chuteTime_s = slidingResult.time_s + rollingResult.time_s
    } else {
      const slidingResult = simulateSlidingSegment(
        chuteLength_m,
        releaseSpeedAlongChute_mps,
        releaseSpin_radps,
        firstSlipSign
      )

      if (slidingResult === null) {
        return {
          snapshot: releaseSnapshot,
          checks,
          invalidReason:
            "Sliding friction cannot carry the marble to the drop point.",
        }
      }

      exitSpeedAlongChute_mps = slidingResult.speed_mps
      dropSpin_radps = slidingResult.spin_radps
      chuteTime_s = slidingResult.time_s
    }
  }

  // Negative or non-finite values mean the kinematics are not physical.
  if (
    !Number.isFinite(chuteTime_s) ||
    chuteTime_s < 0 ||
    !Number.isFinite(exitSpeedAlongChute_mps) ||
    exitSpeedAlongChute_mps < 0 ||
    !Number.isFinite(dropSpin_radps)
  ) {
    return {
      snapshot: releaseSnapshot,
      checks,
      invalidReason: "Chute travel result is invalid.",
    }
  }

  // Drop position after moving along the chute by its length.
  const dropPosition_x_m =
    releaseSnapshot.marblePosition_x_m + chuteDirection.x * chuteLength_m

  // Drop position after moving along the chute by its length.
  const dropPosition_y_m =
    releaseSnapshot.marblePosition_y_m + chuteDirection.y * chuteLength_m

  // Drop speed vector points along the chute.
  const dropSpeed_x_mps = chuteDirection.x * exitSpeedAlongChute_mps

  // Drop speed vector points along the chute.
  const dropSpeed_y_mps = chuteDirection.y * exitSpeedAlongChute_mps

  // Simulation time at the drop point.
  const dropTime_s = releaseSnapshot.time_s + chuteTime_s

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

function simulateBendChuteUntilDrop(
  blueprintRealization: BlueprintRealization,
  releaseSnapshot: Snapshot
): SimulationStageResult {
  return simulateStraightChuteUntilDrop(blueprintRealization, releaseSnapshot)
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
  const drumPivotPoint_x_m = unpivotedImpactPoint_x_m - drumPivotArmLength_m

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
  const impactPoint_x_m = drumPivotPoint_x_m + pivotedImpactOffsetFromPivot_x_m

  // Impact point for the marble center after pivoting.
  const impactPoint_y_m = drumPivotPoint_y_m + pivotedImpactOffsetFromPivot_y_m

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
    impactTimeCandidates_s.push(-impactTimeQuadratic_c / impactTimeQuadratic_b)
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

  // The deviation is actual total time minus requested total time.
  const targetReleaseToImpactTimeDeviation_s = canVerifyTargets
    ? impactSnapshot.time_s -
      releaseSnapshot.time_s -
      blueprintRealization.targetReleaseToImpactTime_s
    : null

  // The impact speed target is measured into the drum normal.
  const targetNormalImpactSpeedDeviation_mps = canVerifyTargets
    ? -impactNormalSpeed_mps - blueprintRealization.targetNormalImpactSpeed_mps
    : null

  const checks = {
    contactMovingIntoDrumOk,
    targetNormalImpactSpeedDeviation_mps,
    targetReleaseToImpactTimeDeviation_s,
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
    impactSnapshot.marbleSpin_radps - spinTransferSpeed_mps / marbleRadius_m

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
  const chuteResult = simulateChuteUntilDrop(
    blueprintRealization,
    releaseSnapshot
  )
  const dropSnapshot = chuteResult.snapshot
  const ballisticsResult = simulateBallisticsUntilImpact(
    blueprintRealization,
    dropSnapshot
  )
  const impactSnapshot = ballisticsResult.snapshot
  const contactResult = simulateContactUntilBounce(
    blueprintRealization,
    releaseSnapshot,
    chuteResult.invalidReason === null &&
      ballisticsResult.invalidReason === null,
    impactSnapshot
  )
  const bounceSnapshot = contactResult.snapshot

  const stageResults = [
    releaseResult,
    chuteResult,
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
      ballisticsImpactFound: null,
      contactMovingIntoDrumOk: null,
      targetNormalImpactSpeedDeviation_mps: null,
      targetReleaseToImpactTimeDeviation_s: null,
      chuteReliableAccelerationOk: null,
      chuteRequiredStaticFrictionCoefficient_ratio: null,
      chuteStaticFrictionOk: null,
      ...checks,
    },
    releaseSnapshot,
    dropSnapshot,
    impactSnapshot,
    bounceSnapshot,
  }
}

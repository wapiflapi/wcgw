import type {
  Blueprint,
  BlueprintValue,
  ModelInput,
  SolveResult,
} from "@/model/model"
import { solveBendChuteLaunchGeometry } from "@/model/solve/bend"
import { solveStraightChuteLaunchGeometry } from "@/model/solve/straight"
import type { ChuteLaunchGeometry, DrumGeometry } from "@/model/solve/types"

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

function solveChuteLaunchGeometry(
  input: ModelInput,
  drumGeometry: DrumGeometry
): SolveResult<ChuteLaunchGeometry> {
  if (input.chuteBendEnabled) {
    return solveBendChuteLaunchGeometry(input, drumGeometry)
  }

  return solveStraightChuteLaunchGeometry(input, drumGeometry)
}

export function solveBlueprint(input: ModelInput): SolveResult<Blueprint> {
  const drumGeometry = solveDrumGeometry(input)
  const chuteLaunchGeometryResult = solveChuteLaunchGeometry(
    input,
    drumGeometry
  )

  if (chuteLaunchGeometryResult.type === "invalid") {
    return chuteLaunchGeometryResult
  }

  const chuteLaunchGeometry = chuteLaunchGeometryResult.value
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
    type: "valid",
    value: {
      marbleDiameter_m: blueprintValue(input.marbleDiameter_m),
      marbleMass_g: blueprintValue(input.marbleMass_g),

      targetReleaseToImpactTime_s: blueprintValue(
        input.targetReleaseToImpactTime_s
      ),
      targetNormalImpactSpeed_mps: blueprintValue(
        input.targetNormalImpactSpeed_mps
      ),

      chuteEntryAngle_rad: blueprintSolvedValue(
        input.chuteEntryAngle_rad,
        manufacturingAngleTolerance_rad
      ),
      chuteBendEnabled: chuteLaunchGeometry.chuteBendEnabled,
      chuteBendRadius_m: blueprintSolvedValue(
        input.chuteBendRadius_m,
        manufacturingLinearTolerance_m
      ),
      chuteBendAngle_rad: blueprintSolvedValue(
        input.chuteBendAngle_rad,
        manufacturingAngleTolerance_rad
      ),
      chuteEntryLength_m: blueprintSolvedValue(
        chuteLaunchGeometry.entryLength_m,
        manufacturingLinearTolerance_m
      ),
      chuteExitLength_m: blueprintSolvedValue(
        chuteLaunchGeometry.exitLength_m,
        manufacturingLinearTolerance_m
      ),
      releasePoint_x_m: blueprintSolvedValue(
        chuteLaunchGeometry.releasePoint_x_m,
        manufacturingPositionTolerance_m
      ),
      releasePoint_y_m: blueprintSolvedValue(
        chuteLaunchGeometry.releasePoint_y_m,
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
      minimumReliableChuteAcceleration_mps2: blueprintInputToleranceValue(
        input.minimumReliableChuteAcceleration_mps2,
        input.minimumReliableChuteAccelerationTolerance_mps2
      ),
      chuteEnergyEfficiency_ratio: blueprintInputToleranceValue(
        input.chuteEnergyEfficiency_ratio,
        input.chuteEnergyEfficiencyTolerance_ratio
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
    },
  }
}

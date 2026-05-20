import type { ModelInput } from "@/model/model"
import { degToModelRad } from "@/model/units"

export type NumericInputRange = {
  max: number
  min: number
}

export type BendInputRanges = {
  chuteBendAngle_rad: NumericInputRange
  chuteBendRadius_m: NumericInputRange
  chuteEntryAngle_rad: NumericInputRange
  chuteEntryLength_m: NumericInputRange
}

const CHUTE_ENTRY_ANGLE_MIN_RAD = degToModelRad(-90)
const CHUTE_ENTRY_ANGLE_MAX_RAD = degToModelRad(0)
const CHUTE_EXIT_TO_DRUM_MARGIN_RAD = degToModelRad(1)
const CHUTE_BEND_ANGLE_MIN_RAD = degToModelRad(0)
const CHUTE_BEND_RADIUS_MAX_M = 0.5
const CHUTE_STRAIGHT_LENGTH_MAX_M = 1

export function clampInputValue(value: number, range: NumericInputRange) {
  return Math.min(range.max, Math.max(range.min, value))
}

function getChuteEntryAngleRange(
  input: ModelInput,
  chuteBendAngle_rad: number
): NumericInputRange {
  const maximumEntryAngle_rad = Math.min(
    CHUTE_ENTRY_ANGLE_MAX_RAD,
    input.drumTiltAngle_rad -
      CHUTE_EXIT_TO_DRUM_MARGIN_RAD -
      Math.max(0, chuteBendAngle_rad)
  )

  return {
    max: Math.max(CHUTE_ENTRY_ANGLE_MIN_RAD, maximumEntryAngle_rad),
    min: CHUTE_ENTRY_ANGLE_MIN_RAD,
  }
}

function getChuteBendAngleRange(
  input: ModelInput,
  chuteEntryAngle_rad: number
): NumericInputRange {
  const normalizedEntryAngle_rad = clampInputValue(chuteEntryAngle_rad, {
    max: CHUTE_ENTRY_ANGLE_MAX_RAD,
    min: CHUTE_ENTRY_ANGLE_MIN_RAD,
  })
  const maximumBendAngle_rad = Math.max(
    0,
    input.drumTiltAngle_rad -
      CHUTE_EXIT_TO_DRUM_MARGIN_RAD -
      normalizedEntryAngle_rad
  )

  return {
    max: Math.max(CHUTE_BEND_ANGLE_MIN_RAD, maximumBendAngle_rad),
    min: CHUTE_BEND_ANGLE_MIN_RAD,
  }
}

export function getBendInputRanges(input: ModelInput): BendInputRanges {
  const physicalEntryAngle_rad = clampInputValue(input.chuteEntryAngle_rad, {
    max: CHUTE_ENTRY_ANGLE_MAX_RAD,
    min: CHUTE_ENTRY_ANGLE_MIN_RAD,
  })
  const bendAngleRangeForCurrentEntry = getChuteBendAngleRange(
    input,
    physicalEntryAngle_rad
  )
  const normalizedBendAngle_rad = clampInputValue(
    input.chuteBendAngle_rad,
    bendAngleRangeForCurrentEntry
  )
  const entryAngleRangeForCurrentBend = getChuteEntryAngleRange(
    input,
    normalizedBendAngle_rad
  )
  const normalizedEntryAngle_rad = clampInputValue(
    physicalEntryAngle_rad,
    entryAngleRangeForCurrentBend
  )

  return {
    chuteBendAngle_rad: getChuteBendAngleRange(input, normalizedEntryAngle_rad),
    chuteBendRadius_m: {
      max: Math.max(CHUTE_BEND_RADIUS_MAX_M, input.marbleDiameter_m * 5),
      min: input.marbleDiameter_m * 5,
    },
    chuteEntryLength_m: {
      max: CHUTE_STRAIGHT_LENGTH_MAX_M,
      min: 0,
    },
    chuteEntryAngle_rad: getChuteEntryAngleRange(
      input,
      normalizedBendAngle_rad
    ),
  }
}

export type ChuteLaunchGeometry = {
  chuteBendEnabled: boolean
  entryLength_m: number
  exitLength_m: number
  releasePoint_x_m: number
  releasePoint_y_m: number
}

export type ChuteLaunchGeometryInvalidReason =
  | "bend-input-invalid"
  | "bend-target-timing-unreachable"

export type DrumGeometry = {
  drumTiltAngle_rad: number
  impactPoint_x_m: number
  impactPoint_y_m: number
}

export function getFreeFallHeightFromDuration_m(
  duration_s: number,
  gravity_mps2: number
) {
  return 0.5 * gravity_mps2 * duration_s * duration_s
}

export function getFreeFallDurationFromHeight_s(
  height_m: number,
  gravity_mps2: number
) {
  return Math.sqrt((2 * height_m) / gravity_mps2)
}

export function getFreeFallHeightFromSpeed_m(
  speed_mps: number,
  gravity_mps2: number
) {
  return (speed_mps * speed_mps) / (2 * gravity_mps2)
}

export function getFreeFallSpeedFromHeight_m(
  height_m: number,
  gravity_mps2: number
) {
  return Math.sqrt(2 * gravity_mps2 * height_m)
}

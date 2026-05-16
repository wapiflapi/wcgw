export function getSphereMass_g(diameter_m: number, density_kgpm3: number) {
  const radius_m = diameter_m / 2
  const volume_m3 = (4 / 3) * Math.PI * radius_m ** 3

  return volume_m3 * density_kgpm3 * 1000
}

export function isMassWithinRelativeTolerance(
  mass_g: number,
  expectedMass_g: number,
  toleranceRatio: number
) {
  if (expectedMass_g <= 0) {
    return true
  }

  return Math.abs(mass_g - expectedMass_g) / expectedMass_g <= toleranceRatio
}

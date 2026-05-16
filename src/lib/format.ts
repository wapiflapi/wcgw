export function formatNumber(value: number, digits = 3) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)).toString() : ""
}

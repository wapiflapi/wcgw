import type { Blueprint, BlueprintRealization } from "@/model/model"

export function createNominalBlueprintRealization(
  blueprint: Blueprint
): BlueprintRealization {
  return Object.fromEntries(
    Object.entries(blueprint).map(([key, value]) => [
      key,
      typeof value === "boolean" ? value : value.nominal,
    ])
  ) as BlueprintRealization
}

export function sampleBlueprintRealization(
  blueprint: Blueprint
): BlueprintRealization {
  return Object.fromEntries(
    Object.entries(blueprint).map(([key, value]) => [
      key,
      typeof value === "boolean"
        ? value
        : value.nominal -
          value.toleranceMinus +
          Math.random() * (value.toleranceMinus + value.tolerancePlus),
    ])
  ) as BlueprintRealization
}

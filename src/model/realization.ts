import type { Blueprint, BlueprintRealization } from "@/model/model"

export function createNominalBlueprintRealization(
  blueprint: Blueprint
): BlueprintRealization {
  return Object.fromEntries(
    Object.entries(blueprint).map(([key, value]) => [key, value.nominal])
  ) as BlueprintRealization
}

export function sampleBlueprintRealization(
  blueprint: Blueprint
): BlueprintRealization {
  return Object.fromEntries(
    Object.entries(blueprint).map(([key, value]) => [
      key,
      value.min + Math.random() * (value.max - value.min),
    ])
  ) as BlueprintRealization
}

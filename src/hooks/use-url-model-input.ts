import { useEffect, useState } from "react"

import { defaultModelInput } from "@/model/defaults"
import type { ModelInput } from "@/model/model"

const MODEL_HASH_PREFIX = "model:"

const MODEL_INPUT_HASH_ALIASES = {
  marbleDiameter_m: "md",
  marbleMass_g: "mm",
  targetReleaseToImpactTime_s: "rt",
  targetReleaseToImpactTimeTolerance_s: "rtt",
  targetNormalImpactSpeed_mps: "is",
  chuteEntryAngle_rad: "cea",
  chuteBendEnabled: "cbe",
  chuteBendRadius_m: "cbr",
  chuteEntryLength_ratio: "clr",
  chuteBendAngle_rad: "cba",
  drumTiltAngle_rad: "dt",
  drumPivotArmLength_m: "dpa",
  drumPivotAngleRange_rad: "dpr",
  manufacturingPositionTolerance_m: "mpt",
  manufacturingLinearTolerance_m: "mlt",
  manufacturingAngleTolerance_rad: "mat",
  gravity_mps2: "g",
  marbleDensity_kgpm3: "rho",
  rollingInertiaFactor_ratio: "ri",
  rollingInertiaFactorTolerance_ratio: "rit",
  staticFrictionCoefficient_ratio: "sf",
  staticFrictionCoefficientTolerance_ratio: "sft",
  kineticFrictionCoefficient_ratio: "kf",
  kineticFrictionCoefficientTolerance_ratio: "kft",
  minimumReliableChuteAcceleration_mps2: "mca",
  minimumReliableChuteAccelerationTolerance_mps2: "mcat",
  chuteEnergyEfficiency_ratio: "cee",
  chuteEnergyEfficiencyTolerance_ratio: "ceet",
  impactRestitutionCoefficient_ratio: "ir",
  impactRestitutionCoefficientTolerance_ratio: "irt",
  impactFrictionCoefficient_ratio: "if",
  impactFrictionCoefficientTolerance_ratio: "ift",
  spinTransferEfficiency_ratio: "st",
  spinTransferEfficiencyTolerance_ratio: "stt",
} satisfies Record<keyof ModelInput, string>

function modelInputKeys() {
  return Object.keys(defaultModelInput) as Array<keyof ModelInput>
}

function parseModelInputHashParams(hash: string) {
  return hash.startsWith(`#${MODEL_HASH_PREFIX}`)
    ? new URLSearchParams(hash.slice(MODEL_HASH_PREFIX.length + 1))
    : null
}

function parseModelInputHash(hash: string): ModelInput {
  const hashParams = parseModelInputHashParams(hash)

  if (hashParams === null) {
    return defaultModelInput
  }

  return modelInputKeys().reduce<ModelInput>((nextModelInput, key) => {
    const alias = MODEL_INPUT_HASH_ALIASES[key]
    const rawValue = hashParams.get(alias)

    if (rawValue === null || rawValue.trim() === "") {
      return nextModelInput
    }

    if (typeof defaultModelInput[key] === "boolean") {
      return {
        ...nextModelInput,
        [key]: rawValue === "true" || rawValue === "1",
      }
    }

    const parsedValue = Number(rawValue)

    if (!Number.isFinite(parsedValue)) {
      return nextModelInput
    }

    const value = key.endsWith("_rad")
      ? Number(parsedValue.toFixed(3))
      : parsedValue

    return {
      ...nextModelInput,
      [key]: value,
    }
  }, defaultModelInput)
}

function formatModelInputHash(modelInput: ModelInput) {
  const hashParams = new URLSearchParams()

  modelInputKeys().forEach((key) => {
    hashParams.set(MODEL_INPUT_HASH_ALIASES[key], String(modelInput[key]))
  })

  return `#${MODEL_HASH_PREFIX}${hashParams.toString()}`
}

function isDefaultModelInput(modelInput: ModelInput) {
  return modelInputKeys().every((key) =>
    Object.is(modelInput[key], defaultModelInput[key])
  )
}

function clearHash() {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`
  )
}

function syncModelInputHash(modelInput: ModelInput) {
  if (isDefaultModelInput(modelInput)) {
    if (window.location.hash) {
      clearHash()
    }

    return
  }

  const nextHash = formatModelInputHash(modelInput)

  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash)
  }
}

export function useUrlModelInput() {
  const [modelInput, setModelInput] = useState<ModelInput>(() =>
    parseModelInputHash(window.location.hash)
  )

  useEffect(() => {
    syncModelInputHash(modelInput)
  }, [modelInput])

  useEffect(() => {
    function updateModelInputFromHash() {
      setModelInput(parseModelInputHash(window.location.hash))
    }

    window.addEventListener("hashchange", updateModelInputFromHash)

    return () => {
      window.removeEventListener("hashchange", updateModelInputFromHash)
    }
  }, [])

  return [modelInput, setModelInput] as const
}

import { useEffect, useState } from "react"

import { defaultModelInput } from "@/model/defaults"
import type { ModelInput } from "@/model/model"

const MODEL_HASH_PREFIX = "model:"

export type UrlFeatureFlags = {
  chuteModeTabs: boolean
}

const DEFAULT_URL_FEATURE_FLAGS: UrlFeatureFlags = {
  chuteModeTabs: false,
}

const URL_FEATURE_FLAG_ALIASES = {
  chuteModeTabs: "bendTabs",
} satisfies Record<keyof UrlFeatureFlags, string>

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
  chuteExitAngle_rad: "cxa",
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

function parseBooleanHashValue(rawValue: string | null) {
  return rawValue === "true" || rawValue === "1"
}

function parseUrlFeatureFlags(hash: string): UrlFeatureFlags {
  const hashParams = parseModelInputHashParams(hash)

  if (hashParams === null) {
    return DEFAULT_URL_FEATURE_FLAGS
  }

  return {
    chuteModeTabs: parseBooleanHashValue(
      hashParams.get(URL_FEATURE_FLAG_ALIASES.chuteModeTabs)
    ),
  }
}

function formatModelInputHash(
  modelInput: ModelInput,
  featureFlags: UrlFeatureFlags
) {
  const hashParams = new URLSearchParams()

  modelInputKeys().forEach((key) => {
    hashParams.set(MODEL_INPUT_HASH_ALIASES[key], String(modelInput[key]))
  })

  if (featureFlags.chuteModeTabs) {
    hashParams.set(URL_FEATURE_FLAG_ALIASES.chuteModeTabs, "true")
  }

  return `#${MODEL_HASH_PREFIX}${hashParams.toString()}`
}

function isDefaultModelInput(modelInput: ModelInput) {
  return modelInputKeys().every((key) =>
    Object.is(modelInput[key], defaultModelInput[key])
  )
}

function isDefaultUrlFeatureFlags(featureFlags: UrlFeatureFlags) {
  return featureFlags.chuteModeTabs === DEFAULT_URL_FEATURE_FLAGS.chuteModeTabs
}

function clearHash() {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`
  )
}

function syncModelInputHash(
  modelInput: ModelInput,
  featureFlags: UrlFeatureFlags
) {
  if (
    isDefaultModelInput(modelInput) &&
    isDefaultUrlFeatureFlags(featureFlags)
  ) {
    if (window.location.hash) {
      clearHash()
    }

    return
  }

  const nextHash = formatModelInputHash(modelInput, featureFlags)

  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash)
  }
}

export function useUrlModelInput() {
  const [modelInput, setModelInput] = useState<ModelInput>(() =>
    parseModelInputHash(window.location.hash)
  )
  const [featureFlags, setFeatureFlags] = useState<UrlFeatureFlags>(() =>
    parseUrlFeatureFlags(window.location.hash)
  )

  useEffect(() => {
    syncModelInputHash(modelInput, featureFlags)
  }, [featureFlags, modelInput])

  useEffect(() => {
    function updateModelInputFromHash() {
      setModelInput(parseModelInputHash(window.location.hash))
      setFeatureFlags(parseUrlFeatureFlags(window.location.hash))
    }

    window.addEventListener("hashchange", updateModelInputFromHash)

    return () => {
      window.removeEventListener("hashchange", updateModelInputFromHash)
    }
  }, [])

  return [modelInput, setModelInput, featureFlags] as const
}

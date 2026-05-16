import { CaretDown } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FieldGroup } from "@/components/ui/field"
import { formatNumber } from "@/lib/format"
import type { Blueprint, BlueprintValue } from "@/model/model"
import { mToMm, radToDeg, sToMs } from "@/model/units"

type BlueprintPanelProps = {
  blueprint: Blueprint | null
}

type BlueprintItem = {
  label: string
  tolerance?: string
  value: string
}

const MAIN_BLUEPRINT_KEYS = new Set<keyof Blueprint>([
  "marbleDiameter_m",
  "marbleMass_g",
  "rampAngle_rad",
  "rampLength_m",
  "releasePoint_x_m",
  "releasePoint_y_m",
  "impactPoint_x_m",
  "impactPoint_y_m",
  "drumSurfaceAngle_rad",
  "drumPivotAngle_rad",
])

function hasRange(value: BlueprintValue) {
  return value.min !== value.nominal || value.max !== value.nominal
}

function formatBlueprintValue(
  value: BlueprintValue,
  unit: string,
  transform: (value: number) => number = (nextValue) => nextValue,
  digits = 2
) {
  const suffix = unit ? ` ${unit}` : ""
  const nominal = `${formatNumber(transform(value.nominal), digits)}${suffix}`

  if (!hasRange(value)) {
    return nominal
  }

  return `${nominal} (${formatNumber(transform(value.min), digits)}-${formatNumber(
    transform(value.max),
    digits
  )}${suffix}; tol ${formatBlueprintTolerance(value, unit, transform, digits)})`
}

function formatBlueprintTolerance(
  value: BlueprintValue,
  unit: string,
  transform: (value: number) => number = (nextValue) => nextValue,
  digits = 2
) {
  if (!hasRange(value)) {
    return undefined
  }

  const suffix = unit ? ` ${unit}` : ""
  const minus = transform(value.nominal) - transform(value.min)
  const plus = transform(value.max) - transform(value.nominal)

  return `-${formatNumber(minus, digits)} / +${formatNumber(plus, digits)}${suffix}`
}

function formatPoint(x: BlueprintValue, y: BlueprintValue) {
  return `x ${formatBlueprintValue(x, "mm", mToMm, 0)}, y ${formatBlueprintValue(
    y,
    "mm",
    mToMm,
    0
  )}`
}

function blueprintEntries(blueprint: Blueprint): BlueprintItem[] {
  return [
    {
      label: "Marble diameter",
      value: formatBlueprintValue(blueprint.marbleDiameter_m, "mm", mToMm, 0),
    },
    {
      label: "Marble mass",
      value: formatBlueprintValue(blueprint.marbleMass_g, "g", undefined, 1),
    },
    {
      label: "Ramp angle",
      value: formatBlueprintValue(blueprint.rampAngle_rad, "deg", radToDeg, 1),
    },
    {
      label: "Ramp length",
      value: formatBlueprintValue(blueprint.rampLength_m, "mm", mToMm, 0),
    },
    {
      label: "Release point",
      value: formatPoint(
        blueprint.releasePoint_x_m,
        blueprint.releasePoint_y_m
      ),
    },
    {
      label: "Impact point",
      value: formatPoint(blueprint.impactPoint_x_m, blueprint.impactPoint_y_m),
    },
    {
      label: "Drum angle",
      value: formatBlueprintValue(
        blueprint.drumSurfaceAngle_rad,
        "deg",
        radToDeg,
        1
      ),
    },
    {
      label: "Drum pivot angle",
      value: formatBlueprintValue(
        blueprint.drumPivotAngle_rad,
        "deg",
        radToDeg,
        1
      ),
    },
  ]
}

function remainingBlueprintEntries(blueprint: Blueprint): BlueprintItem[] {
  const labels: Record<keyof Blueprint, BlueprintItem> = {
    drumComplianceFactor_ratio: {
      label: "Drum compliance",
      value: formatBlueprintValue(blueprint.drumComplianceFactor_ratio, ""),
    },
    drumPivotAngle_rad: {
      label: "Drum pivot angle",
      value: formatBlueprintValue(
        blueprint.drumPivotAngle_rad,
        "deg",
        radToDeg
      ),
    },
    drumPivotPoint_x_m: {
      label: "Drum pivot X",
      value: formatBlueprintValue(blueprint.drumPivotPoint_x_m, "mm", mToMm, 0),
    },
    drumPivotPoint_y_m: {
      label: "Drum pivot Y",
      value: formatBlueprintValue(blueprint.drumPivotPoint_y_m, "mm", mToMm, 0),
    },
    drumSurfaceAngle_rad: {
      label: "Drum surface angle",
      value: formatBlueprintValue(
        blueprint.drumSurfaceAngle_rad,
        "deg",
        radToDeg
      ),
    },
    gravity_mps2: {
      label: "Gravity",
      value: formatBlueprintValue(blueprint.gravity_mps2, "m/s^2"),
    },
    impactFrictionCoefficient_ratio: {
      label: "Impact friction",
      value: formatBlueprintValue(
        blueprint.impactFrictionCoefficient_ratio,
        ""
      ),
    },
    impactPoint_x_m: {
      label: "Impact X",
      value: formatBlueprintValue(blueprint.impactPoint_x_m, "mm", mToMm, 0),
    },
    impactPoint_y_m: {
      label: "Impact Y",
      value: formatBlueprintValue(blueprint.impactPoint_y_m, "mm", mToMm, 0),
    },
    impactRestitutionCoefficient_ratio: {
      label: "Impact restitution",
      value: formatBlueprintValue(
        blueprint.impactRestitutionCoefficient_ratio,
        ""
      ),
    },
    marbleDensity_kgpm3: {
      label: "Marble density",
      value: formatBlueprintValue(
        blueprint.marbleDensity_kgpm3,
        "kg/m^3",
        undefined,
        0
      ),
    },
    marbleDiameter_m: {
      label: "Marble diameter",
      value: formatBlueprintValue(blueprint.marbleDiameter_m, "mm", mToMm, 0),
    },
    marbleMass_g: {
      label: "Marble mass",
      value: formatBlueprintValue(blueprint.marbleMass_g, "g", undefined, 1),
    },
    rampAngle_rad: {
      label: "Ramp angle",
      value: formatBlueprintValue(blueprint.rampAngle_rad, "deg", radToDeg),
    },
    rampEnergyEfficiency_ratio: {
      label: "Ramp efficiency",
      value: formatBlueprintValue(blueprint.rampEnergyEfficiency_ratio, ""),
    },
    rampLength_m: {
      label: "Ramp length",
      value: formatBlueprintValue(blueprint.rampLength_m, "mm", mToMm, 0),
    },
    releasePoint_x_m: {
      label: "Release X",
      value: formatBlueprintValue(blueprint.releasePoint_x_m, "mm", mToMm, 0),
    },
    releasePoint_y_m: {
      label: "Release Y",
      value: formatBlueprintValue(blueprint.releasePoint_y_m, "mm", mToMm, 0),
    },
    rollingInertiaFactor_ratio: {
      label: "Rolling inertia",
      value: formatBlueprintValue(blueprint.rollingInertiaFactor_ratio, ""),
    },
    spinTransferEfficiency_ratio: {
      label: "Impact spin transfer",
      value: formatBlueprintValue(blueprint.spinTransferEfficiency_ratio, ""),
    },
    staticFrictionCoefficient_ratio: {
      label: "Static friction",
      value: formatBlueprintValue(
        blueprint.staticFrictionCoefficient_ratio,
        ""
      ),
    },
    targetNormalImpactSpeed_mps: {
      label: "Target normal impact speed",
      value: formatBlueprintValue(blueprint.targetNormalImpactSpeed_mps, "m/s"),
    },
    targetReleaseToImpactTime_s: {
      label: "Target release to impact time",
      value: formatBlueprintValue(
        blueprint.targetReleaseToImpactTime_s,
        "ms",
        sToMs,
        1
      ),
    },
  }

  return (Object.keys(labels) as Array<keyof Blueprint>)
    .filter((key) => !MAIN_BLUEPRINT_KEYS.has(key))
    .map((key) => labels[key])
}

function BlueprintRows({ items }: { items: BlueprintItem[] }) {
  return (
    <dl className="grid gap-2">
      {items.map((item) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-4"
          key={item.label}
        >
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-right tabular-nums">
            {item.value}
            {item.tolerance ? (
              <span className="block text-muted-foreground">
                {item.tolerance}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function BlueprintPanel({ blueprint }: BlueprintPanelProps) {
  if (blueprint === null) {
    return <p className="text-muted-foreground">Blueprint pending</p>
  }

  return (
    <FieldGroup>
      <BlueprintRows items={blueprintEntries(blueprint)} />
      <Collapsible>
        <CollapsibleTrigger
          render={<Button className="h-auto p-0" variant="link" />}
        >
          Other values
          <CaretDown />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <BlueprintRows items={remainingBlueprintEntries(blueprint)} />
        </CollapsibleContent>
      </Collapsible>
    </FieldGroup>
  )
}

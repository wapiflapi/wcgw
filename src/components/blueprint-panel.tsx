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
  value: BlueprintValueLine[]
}

type BlueprintValueLine = {
  nominal: string
  prefix?: string
  segments?: BlueprintValueLine[]
  tolerance?: string
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
  "drumTiltAngle_rad",
])

function hasRange(value: BlueprintValue) {
  return value.min !== value.nominal || value.max !== value.nominal
}

function formatBlueprintNominal(
  value: BlueprintValue,
  unit: string,
  transform: (value: number) => number = (nextValue) => nextValue,
  digits = 2
) {
  const suffix = unit ? ` ${unit}` : ""
  return `${formatNumber(transform(value.nominal), digits)}${suffix}`
}

function formatBlueprintTolerance(
  value: BlueprintValue,
  transform: (value: number) => number = (nextValue) => nextValue,
  digits = 2
) {
  if (!hasRange(value)) {
    return undefined
  }
  const minus = transform(value.nominal) - transform(value.min)
  const plus = transform(value.max) - transform(value.nominal)
  const formattedMinus = formatNumber(minus, digits)
  const formattedPlus = formatNumber(plus, digits)

  if (formattedMinus === formattedPlus) {
    return `± ${formattedPlus}`
  }

  return `-${formattedMinus} / +${formattedPlus}`
}

function formatBlueprintValueLine(
  value: BlueprintValue,
  unit: string,
  transform: (value: number) => number = (nextValue) => nextValue,
  digits = 2,
  prefix?: string
): BlueprintValueLine {
  const tolerance = formatBlueprintTolerance(value, transform, digits)
  const nominal = formatBlueprintNominal(value, unit, transform, digits)

  return {
    nominal,
    prefix,
    tolerance,
  }
}

function formatScalarItem(
  label: string,
  value: BlueprintValue,
  unit: string,
  transform: (value: number) => number = (nextValue) => nextValue,
  digits = 2
): BlueprintItem {
  return {
    label,
    value: [formatBlueprintValueLine(value, unit, transform, digits)],
  }
}

function formatPointItem(
  label: string,
  x: BlueprintValue,
  y: BlueprintValue
): BlueprintItem {
  const xLine = formatBlueprintValueLine(x, "mm", mToMm, 0, "x")
  const yLine = formatBlueprintValueLine(y, "mm", mToMm, 0, "y")

  return {
    label,
    value: [
      {
        nominal: "",
        segments: [xLine, yLine],
      },
    ],
  }
}

function blueprintEntries(blueprint: Blueprint): BlueprintItem[] {
  return [
    formatScalarItem(
      "Marble diameter",
      blueprint.marbleDiameter_m,
      "mm",
      mToMm,
      0
    ),
    formatScalarItem("Marble mass", blueprint.marbleMass_g, "g", undefined, 1),
    formatScalarItem("Ramp angle", blueprint.rampAngle_rad, "deg", radToDeg, 1),
    formatScalarItem("Ramp length", blueprint.rampLength_m, "mm", mToMm, 0),
    formatPointItem(
      "Release point",
      blueprint.releasePoint_x_m,
      blueprint.releasePoint_y_m
    ),
    formatPointItem(
      "Impact point",
      blueprint.impactPoint_x_m,
      blueprint.impactPoint_y_m
    ),
    formatScalarItem(
      "Drum tilt angle",
      blueprint.drumTiltAngle_rad,
      "deg",
      radToDeg,
      1
    ),
  ]
}

function remainingBlueprintEntries(blueprint: Blueprint): BlueprintItem[] {
  const labels: Record<keyof Blueprint, BlueprintItem> = {
    drumComplianceFactor_ratio: formatScalarItem(
      "Drum compliance",
      blueprint.drumComplianceFactor_ratio,
      ""
    ),
    drumPivotArmLength_m: formatScalarItem(
      "Drum pivot arm length",
      blueprint.drumPivotArmLength_m,
      "mm",
      mToMm,
      0
    ),
    drumPivotAngle_rad: formatScalarItem(
      "Drum pivot angle",
      blueprint.drumPivotAngle_rad,
      "deg",
      radToDeg
    ),
    drumTiltAngle_rad: formatScalarItem(
      "Drum tilt angle",
      blueprint.drumTiltAngle_rad,
      "deg",
      radToDeg
    ),
    gravity_mps2: formatScalarItem("Gravity", blueprint.gravity_mps2, "m/s^2"),
    impactFrictionCoefficient_ratio: formatScalarItem(
      "Impact friction",
      blueprint.impactFrictionCoefficient_ratio,
      ""
    ),
    impactPoint_x_m: formatScalarItem(
      "Impact X",
      blueprint.impactPoint_x_m,
      "mm",
      mToMm,
      0
    ),
    impactPoint_y_m: formatScalarItem(
      "Impact Y",
      blueprint.impactPoint_y_m,
      "mm",
      mToMm,
      0
    ),
    impactRestitutionCoefficient_ratio: formatScalarItem(
      "Impact restitution",
      blueprint.impactRestitutionCoefficient_ratio,
      ""
    ),
    marbleDensity_kgpm3: formatScalarItem(
      "Marble density",
      blueprint.marbleDensity_kgpm3,
      "kg/m^3",
      undefined,
      0
    ),
    marbleDiameter_m: formatScalarItem(
      "Marble diameter",
      blueprint.marbleDiameter_m,
      "mm",
      mToMm,
      0
    ),
    marbleMass_g: formatScalarItem(
      "Marble mass",
      blueprint.marbleMass_g,
      "g",
      undefined,
      1
    ),
    manufacturingAngleTolerance_rad: formatScalarItem(
      "Manufacturing angular tolerance",
      blueprint.manufacturingAngleTolerance_rad,
      "deg",
      radToDeg
    ),
    manufacturingLinearTolerance_m: formatScalarItem(
      "Manufacturing linear tolerance",
      blueprint.manufacturingLinearTolerance_m,
      "mm",
      mToMm,
      2
    ),
    manufacturingPositionTolerance_m: formatScalarItem(
      "Manufacturing positional tolerance",
      blueprint.manufacturingPositionTolerance_m,
      "mm",
      mToMm,
      2
    ),
    rampAngle_rad: formatScalarItem(
      "Ramp angle",
      blueprint.rampAngle_rad,
      "deg",
      radToDeg
    ),
    rampEnergyEfficiency_ratio: formatScalarItem(
      "Ramp efficiency",
      blueprint.rampEnergyEfficiency_ratio,
      ""
    ),
    rampLength_m: formatScalarItem(
      "Ramp length",
      blueprint.rampLength_m,
      "mm",
      mToMm,
      0
    ),
    releasePoint_x_m: formatScalarItem(
      "Release X",
      blueprint.releasePoint_x_m,
      "mm",
      mToMm,
      0
    ),
    releasePoint_y_m: formatScalarItem(
      "Release Y",
      blueprint.releasePoint_y_m,
      "mm",
      mToMm,
      0
    ),
    rollingInertiaFactor_ratio: formatScalarItem(
      "Rolling inertia",
      blueprint.rollingInertiaFactor_ratio,
      ""
    ),
    spinTransferEfficiency_ratio: formatScalarItem(
      "Impact spin transfer",
      blueprint.spinTransferEfficiency_ratio,
      ""
    ),
    staticFrictionCoefficient_ratio: formatScalarItem(
      "Static friction",
      blueprint.staticFrictionCoefficient_ratio,
      ""
    ),
    targetNormalImpactSpeed_mps: formatScalarItem(
      "Target normal impact speed",
      blueprint.targetNormalImpactSpeed_mps,
      "m/s"
    ),
    targetReleaseToImpactTime_s: formatScalarItem(
      "Target release to impact time",
      blueprint.targetReleaseToImpactTime_s,
      "ms",
      sToMs,
      1
    ),
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
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1"
          key={item.label}
        >
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-right tabular-nums">
            {item.value.map((line) => (
              <span
                className="block"
                key={`${line.prefix ?? ""}${line.nominal}${line.tolerance ?? ""}${line.segments?.length ?? ""}`}
              >
                {line.segments ? (
                  line.segments.map((segment, index) => (
                    <span
                      key={`${segment.prefix ?? ""}${segment.nominal}${segment.tolerance ?? ""}`}
                    >
                      {index > 0 ? ", " : null}
                      {segment.prefix ? `${segment.prefix} ` : null}
                      {segment.nominal}
                      {segment.tolerance ? (
                        <span className="text-muted-foreground">
                          {" "}
                          {segment.tolerance}
                        </span>
                      ) : null}
                    </span>
                  ))
                ) : (
                  <>
                    {line.prefix ? `${line.prefix} ` : null}
                    {line.nominal}
                    {line.tolerance ? (
                      <span className="text-muted-foreground">
                        {" "}
                        {line.tolerance}
                      </span>
                    ) : null}
                  </>
                )}
              </span>
            ))}
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

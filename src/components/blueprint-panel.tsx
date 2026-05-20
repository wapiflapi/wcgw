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
  expandOtherValues?: boolean
  solveError?: string | null
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
  "chuteEntryAngle_rad",
  "chuteEntryLength_m",
  "chuteBendEnabled",
  "chuteBendRadius_m",
  "chuteBendAngle_rad",
  "chuteExitLength_m",
  "releasePoint_x_m",
  "releasePoint_y_m",
  "impactPoint_x_m",
  "impactPoint_y_m",
  "drumTiltAngle_rad",
])

function hasRange(value: BlueprintValue) {
  return value.toleranceMinus !== 0 || value.tolerancePlus !== 0
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
  const minus = Math.abs(
    transform(value.nominal) - transform(value.nominal - value.toleranceMinus)
  )
  const plus = Math.abs(
    transform(value.nominal + value.tolerancePlus) - transform(value.nominal)
  )
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
  const items = [
    formatScalarItem(
      "Marble diameter",
      blueprint.marbleDiameter_m,
      "mm",
      mToMm,
      0
    ),
    formatScalarItem("Marble mass", blueprint.marbleMass_g, "g", undefined, 1),
    formatScalarItem(
      "Entry angle",
      blueprint.chuteEntryAngle_rad,
      "deg",
      radToDeg,
      1
    ),
    formatScalarItem(
      "Entry length",
      blueprint.chuteEntryLength_m,
      "mm",
      mToMm,
      0
    ),
    ...(blueprint.chuteBendEnabled
      ? [
          formatScalarItem(
            "Bend size",
            blueprint.chuteBendRadius_m,
            "mm",
            mToMm,
            0
          ),
          formatScalarItem(
            "Bend angle",
            blueprint.chuteBendAngle_rad,
            "deg",
            radToDeg,
            1
          ),
          formatScalarItem(
            "Exit length",
            blueprint.chuteExitLength_m,
            "mm",
            mToMm,
            0
          ),
        ]
      : []),
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

  return items
}

function remainingBlueprintEntries(blueprint: Blueprint): BlueprintItem[] {
  const bendLabels = blueprint.chuteBendEnabled
    ? {
        chuteBendRadius_m: formatScalarItem(
          "Bend size",
          blueprint.chuteBendRadius_m,
          "mm",
          mToMm,
          0
        ),
        chuteBendAngle_rad: formatScalarItem(
          "Bend angle",
          blueprint.chuteBendAngle_rad,
          "deg",
          radToDeg
        ),
        chuteExitLength_m: formatScalarItem(
          "Exit length",
          blueprint.chuteExitLength_m,
          "mm",
          mToMm,
          0
        ),
      }
    : {}

  const labels: Partial<Record<keyof Blueprint, BlueprintItem>> = {
    ...bendLabels,
    chuteEntryLength_m: formatScalarItem(
      "Entry length",
      blueprint.chuteEntryLength_m,
      "mm",
      mToMm,
      0
    ),
    chuteEntryAngle_rad: formatScalarItem(
      "Entry angle",
      blueprint.chuteEntryAngle_rad,
      "deg",
      radToDeg
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
    kineticFrictionCoefficient_ratio: formatScalarItem(
      "Kinetic friction",
      blueprint.kineticFrictionCoefficient_ratio,
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
    minimumReliableChuteAcceleration_mps2: formatScalarItem(
      "Minimum reliable chute acceleration",
      blueprint.minimumReliableChuteAcceleration_mps2,
      "m/s^2"
    ),
    chuteEnergyEfficiency_ratio: formatScalarItem(
      "Chute efficiency",
      blueprint.chuteEnergyEfficiency_ratio,
      ""
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

  return (Object.keys(labels) as Array<keyof typeof labels>)
    .filter((key) => !MAIN_BLUEPRINT_KEYS.has(key))
    .map((key) => labels[key])
    .filter((item) => item !== undefined)
}

function BlueprintRows({ items }: { items: BlueprintItem[] }) {
  function renderValueLine(line: BlueprintValueLine) {
    return (
      <>
        {line.prefix ? `${line.prefix} ` : null}
        {line.nominal}
        {line.tolerance ? (
          <span className="text-muted-foreground"> {line.tolerance}</span>
        ) : null}
      </>
    )
  }

  return (
    <table className="w-full border-separate border-spacing-0">
      <tbody>
        {items.map((item) => (
          <tr key={item.label}>
            <th
              className="py-1 pr-4 text-left font-normal text-muted-foreground"
              scope="row"
            >
              {item.label}
            </th>
            <td className="py-1 text-right tabular-nums">
              {item.value.map((line) => (
                <span
                  key={`${line.prefix ?? ""}${line.nominal}${line.tolerance ?? ""}${line.segments?.length ?? ""}`}
                >
                  {line.segments
                    ? line.segments.map((segment, index) => (
                        <span
                          key={`${segment.prefix ?? ""}${segment.nominal}${segment.tolerance ?? ""}`}
                        >
                          {index > 0 ? ", " : null}
                          {renderValueLine(segment)}
                        </span>
                      ))
                    : renderValueLine(line)}
                </span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function BlueprintPanel({
  blueprint,
  expandOtherValues = false,
  solveError = null,
}: BlueprintPanelProps) {
  if (blueprint === null) {
    if (solveError !== null) {
      return <p className="text-muted-foreground">{solveError}</p>
    }

    return <p className="text-muted-foreground">Blueprint pending</p>
  }

  const remainingEntries = remainingBlueprintEntries(blueprint)

  return (
    <FieldGroup>
      <BlueprintRows items={blueprintEntries(blueprint)} />
      <Collapsible defaultOpen={expandOtherValues}>
        <CollapsibleTrigger
          className="flex w-full items-center justify-between"
          render={<Button className="px-0" type="button" variant="link" />}
        >
          <span className="text-muted-foreground">Other values</span>
          <span className="flex items-center gap-2">
            <span className="tabular-nums">+{remainingEntries.length}</span>
            <CaretDown className="size-4 text-muted-foreground" />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <BlueprintRows items={remainingEntries} />
        </CollapsibleContent>
      </Collapsible>
    </FieldGroup>
  )
}

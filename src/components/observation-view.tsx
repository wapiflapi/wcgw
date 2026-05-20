import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Observation, Snapshot } from "@/model/model"
import { mToMm, sToMs } from "@/model/units"

type ObservationViewProps = {
  observation: Observation | null
  showTitle?: boolean
  title: string
}

type ObservationItem = {
  label: string
  value: string
  tone?: "default" | "ok" | "failed" | "pending"
  emphasis?: "default" | "target"
}

type SnapshotItem = {
  label: string
  snapshot: Snapshot
}

function formatBool(value: boolean | null) {
  if (value === null) {
    return "pending"
  }

  return value ? "ok" : "failed"
}

function formatNullableSpeed_mps(speed_mps: number | null) {
  return speed_mps === null ? "pending" : `${formatNumber(speed_mps, 4)} m/s`
}

function formatNullableTime_s(time_s: number | null) {
  return time_s === null ? "pending" : `${formatNumber(sToMs(time_s), 1)} ms`
}

function boolTone(value: boolean | null): ObservationItem["tone"] {
  if (value === null) {
    return "pending"
  }

  return value ? "ok" : "failed"
}

function deviationTone(
  deviation: number | null,
  acceptableAbsoluteDeviation: number
): ObservationItem["tone"] {
  if (deviation === null) {
    return "pending"
  }

  return Math.abs(deviation) <= acceptableAbsoluteDeviation ? "ok" : "failed"
}

function valueToneClass(tone: ObservationItem["tone"]) {
  if (tone === "ok") {
    return "text-emerald-600 dark:text-emerald-400"
  }

  if (tone === "failed") {
    return "text-destructive"
  }

  if (tone === "pending") {
    return "text-muted-foreground"
  }

  return undefined
}

function ObservationRows({ items }: { items: ObservationItem[] }) {
  return (
    <table className="w-full border-separate border-spacing-0">
      <tbody>
        {items.map((item) => (
          <tr key={item.label}>
            <th
              className={cn(
                "py-1 pr-4 text-left font-normal text-muted-foreground",
                item.emphasis === "target" && "align-bottom"
              )}
              scope="row"
            >
              {item.label}
            </th>
            <td
              className={cn(
                "py-1 text-right tabular-nums",
                valueToneClass(item.tone),
                item.emphasis === "target" && "text-lg font-semibold"
              )}
            >
              {item.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SnapshotHeader({
  className,
  label,
  unit,
}: {
  className?: string
  label: string
  unit?: string
}) {
  if (!unit) {
    return (
      <th className={cn("pb-1 font-normal", className)} scope="col">
        {label}
      </th>
    )
  }

  return (
    <th
      className={cn("relative h-10 pb-1 align-top font-normal", className)}
      scope="col"
    >
      {label}
      <span className="absolute inset-x-0 bottom-1 text-right">
        &nbsp;{unit}
      </span>
    </th>
  )
}

function SnapshotRows({ items }: { items: SnapshotItem[] }) {
  return (
    <table className="w-full border-separate border-spacing-0">
      <thead>
        <tr className="text-muted-foreground">
          <SnapshotHeader className="pr-4 text-left" label="Event" />
          <SnapshotHeader className="text-right" label="Time" unit="ms" />
          <SnapshotHeader className="pl-4 text-right" label="X" unit="mm" />
          <SnapshotHeader className="pl-4 text-right" label="Y" unit="mm" />
          <SnapshotHeader className="pl-4 text-right" label="Vx" unit="m/s" />
          <SnapshotHeader className="pl-4 text-right" label="Vy" unit="m/s" />
          <SnapshotHeader
            className="pl-4 text-right"
            label="Spin"
            unit="rad/s"
          />
        </tr>
      </thead>
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
              {formatNumber(sToMs(item.snapshot.time_s), 1)}
            </td>
            <td className="py-1 pl-4 text-right tabular-nums">
              {formatNumber(mToMm(item.snapshot.marblePosition_x_m), 0)}
            </td>
            <td className="py-1 pl-4 text-right tabular-nums">
              {formatNumber(mToMm(item.snapshot.marblePosition_y_m), 0)}
            </td>
            <td className="py-1 pl-4 text-right tabular-nums">
              {formatNumber(item.snapshot.marbleSpeed_x_mps, 3)}
            </td>
            <td className="py-1 pl-4 text-right tabular-nums">
              {formatNumber(item.snapshot.marbleSpeed_y_mps, 3)}
            </td>
            <td className="py-1 pl-4 text-right tabular-nums">
              {formatNumber(item.snapshot.marbleSpin_radps, 1)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ObservationView({
  observation,
  showTitle = true,
  title,
}: ObservationViewProps) {
  if (observation === null) {
    return <p className="text-muted-foreground">{title} pending</p>
  }

  return (
    <FieldSet>
      {showTitle ? <FieldLegend>{title}</FieldLegend> : null}
      {observation.invalidReason ? (
        <FieldDescription>{observation.invalidReason}</FieldDescription>
      ) : null}
      <ObservationRows
        items={[
          {
            label: `Status of ${title}`,
            value: observation.valid ? "valid" : "invalid",
          },
          {
            label: "Timing deviation",
            value: formatNullableTime_s(
              observation.checks.targetReleaseToImpactTimeDeviation_s
            ),
            tone: deviationTone(
              observation.checks.targetReleaseToImpactTimeDeviation_s,
              0.001
            ),
            emphasis: "target",
          },
          {
            label: "Impact speed deviation",
            value: formatNullableSpeed_mps(
              observation.checks.targetNormalImpactSpeedDeviation_mps
            ),
            tone: deviationTone(
              observation.checks.targetNormalImpactSpeedDeviation_mps,
              0.01
            ),
            emphasis: "target",
          },
          {
            label: "Chute acceleration",
            value: formatBool(observation.checks.chuteReliableAccelerationOk),
            tone: boolTone(observation.checks.chuteReliableAccelerationOk),
          },
          {
            label: "Chute static friction",
            value: formatBool(observation.checks.chuteStaticFrictionOk),
            tone: boolTone(observation.checks.chuteStaticFrictionOk),
          },
          {
            label: "Ballistic impact",
            value: formatBool(observation.checks.ballisticsImpactFound),
            tone: boolTone(observation.checks.ballisticsImpactFound),
          },
          {
            label: "Contact direction",
            value: formatBool(observation.checks.contactMovingIntoDrumOk),
            tone: boolTone(observation.checks.contactMovingIntoDrumOk),
          },
        ]}
      />
      <FieldGroup>
        <SnapshotRows
          items={[
            {
              label: "Release",
              snapshot: observation.releaseSnapshot,
            },
            {
              label: "Drop",
              snapshot: observation.dropSnapshot,
            },
            {
              label: "Impact",
              snapshot: observation.impactSnapshot,
            },
            {
              label: "Bounce",
              snapshot: observation.bounceSnapshot,
            },
          ]}
        />
      </FieldGroup>
    </FieldSet>
  )
}

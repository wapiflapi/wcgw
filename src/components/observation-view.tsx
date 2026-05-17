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

function formatSnapshotPoint(snapshot: Snapshot) {
  return `x ${formatNumber(mToMm(snapshot.marblePosition_x_m), 0)} mm, y ${formatNumber(mToMm(snapshot.marblePosition_y_m), 0)} mm`
}

function formatSnapshotSpeed(snapshot: Snapshot) {
  return `x ${formatNumber(snapshot.marbleSpeed_x_mps, 3)} m/s, y ${formatNumber(snapshot.marbleSpeed_y_mps, 3)} m/s`
}

function formatTime_s(time_s: number) {
  return `${formatNumber(sToMs(time_s), 1)} ms`
}

function formatNullableSpeed_mps(speed_mps: number | null) {
  return speed_mps === null
    ? "pending"
    : `${formatNumber(speed_mps, 4)} m/s`
}

function formatNullableTime_s(time_s: number | null) {
  return time_s === null ? "pending" : formatTime_s(time_s)
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
    <dl className="grid gap-2">
      {items.map((item) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1"
          key={item.label}
        >
          <dt
            className={cn(
              "text-muted-foreground",
              item.emphasis === "target" && "self-end"
            )}
          >
            {item.label}
          </dt>
          <dd
            className={cn(
              "text-right tabular-nums",
              valueToneClass(item.tone),
              item.emphasis === "target" && "text-lg font-semibold"
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function SnapshotRows({ items }: { items: SnapshotItem[] }) {
  return (
    <dl className="grid gap-2">
      {items.map((item) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1"
          key={item.label}
        >
          <dt>
            {item.label}{" "}
            <span className="text-muted-foreground tabular-nums">
              ({formatTime_s(item.snapshot.time_s)})
            </span>
          </dt>
          <dd className="text-right tabular-nums">
            <span className="block">{formatSnapshotPoint(item.snapshot)}</span>
            <span className="block text-muted-foreground">
              {formatSnapshotSpeed(item.snapshot)}, spin{" "}
              {formatNumber(item.snapshot.marbleSpin_radps, 1)} rad/s
            </span>
          </dd>
        </div>
      ))}
    </dl>
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
            label: "Status",
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
            label: "Ramp acceleration",
            value: formatBool(observation.checks.rampReliableAccelerationOk),
            tone: boolTone(observation.checks.rampReliableAccelerationOk),
          },
          {
            label: "Ramp static friction",
            value: formatBool(observation.checks.rampStaticFrictionOk),
            tone: boolTone(observation.checks.rampStaticFrictionOk),
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

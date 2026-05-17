import {
  FieldDescription,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { formatNumber } from "@/lib/format"
import type { Observation, Snapshot } from "@/model/model"
import { mToMm, sToMs } from "@/model/units"

type ObservationViewProps = {
  observation: Observation | null
  title: string
}

type ObservationItem = {
  label: string
  value: string
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

function ObservationRows({ items }: { items: ObservationItem[] }) {
  return (
    <dl className="grid gap-2">
      {items.map((item) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1"
          key={item.label}
        >
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-right tabular-nums">{item.value}</dd>
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

export function ObservationView({ observation, title }: ObservationViewProps) {
  if (observation === null) {
    return <p className="text-muted-foreground">{title} pending</p>
  }

  return (
    <FieldSet>
      <FieldLegend>{title}</FieldLegend>
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
            label: "Ramp acceleration",
            value: formatBool(observation.checks.rampReliableAccelerationOk),
          },
          {
            label: "Ramp static friction",
            value: formatBool(observation.checks.rampStaticFrictionOk),
          },
          {
            label: "Required static friction",
            value:
              observation.checks.rampRequiredStaticFrictionCoefficient_ratio ===
              null
                ? "pending"
                : formatNumber(
                    observation.checks
                      .rampRequiredStaticFrictionCoefficient_ratio,
                    3
                  ),
          },
          {
            label: "Ballistic impact",
            value: formatBool(observation.checks.ballisticsImpactFound),
          },
          {
            label: "Contact direction",
            value: formatBool(observation.checks.contactMovingIntoDrumOk),
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

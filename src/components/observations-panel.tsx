import { CaretDown, Warning } from "@phosphor-icons/react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BlueprintPanel } from "@/components/blueprint-panel"
import { ObservationView } from "@/components/observation-view"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { FieldGroup, FieldSet } from "@/components/ui/field"
import { formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import type {
  Blueprint,
  BooleanCheckAggregate,
  NumericCheckAggregate,
  Observation,
  ObservationAggregate,
} from "@/model/model"
import { sToMs } from "@/model/units"

type ObservationsPanelProps = {
  blueprint: Blueprint | null
  observations: ObservationAggregate | null
  timingTolerance_s: number
}

type BooleanCheckItem = {
  label: string
  aggregate: BooleanCheckAggregate
}

type NumericCheckItem = {
  label: string
  aggregate: NumericCheckAggregate
  unit: string
  hasProblem?: boolean
  transform?: (value: number) => number
}

type ExtremeObservationItem = {
  observation: Observation | null
  title: string
  value: string
}

function numericStandardDeviation(aggregate: NumericCheckAggregate) {
  if (aggregate.count < 2) {
    return 0
  }

  return Math.sqrt(aggregate.varianceAccumulator / (aggregate.count - 1))
}

function formatPercent(value: number) {
  return `${formatNumber(value * 100, 1)}%`
}

function formatNumericCheckValue(
  aggregate: NumericCheckAggregate,
  value: number,
  unit: string,
  transform: (value: number) => number = (rawValue) => rawValue
) {
  if (aggregate.count === 0) {
    return "pending"
  }

  return `${formatNumber(transform(value), 3)} ${unit}`
}

function hasObservationProblems(
  observations: ObservationAggregate | null,
  timingTolerance_s: number
) {
  if (observations === null) {
    return false
  }

  const checkAggregate = observations.checkAggregate
  const timingDeviationAggregate = checkAggregate.targetReleaseToImpactTimeDeviation_s
  const timingOutsideTolerance =
    timingDeviationAggregate.count > 0 &&
    Math.max(
      Math.abs(timingDeviationAggregate.min),
      Math.abs(timingDeviationAggregate.max)
    ) > Math.abs(timingTolerance_s)

  return (
    checkAggregate.invalidCount > 0 ||
    checkAggregate.ballisticsImpactFound.failedCount > 0 ||
    checkAggregate.contactMovingIntoDrumOk.failedCount > 0 ||
    checkAggregate.rampReliableAccelerationOk.failedCount > 0 ||
    checkAggregate.rampStaticFrictionOk.failedCount > 0 ||
    timingOutsideTolerance
  )
}

function TargetStatsRows({ items }: { items: NumericCheckItem[] }) {
  return (
    <dl className="grid gap-2">
      {items.map((item) => {
        const standardDeviation = numericStandardDeviation(item.aggregate)

        return (
          <div
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1"
            key={item.label}
          >
            <dt
              className={cn(
                "text-muted-foreground",
                item.hasProblem && "text-destructive"
              )}
            >
              {item.label}
            </dt>
            <dd
              className={cn(
                "text-right tabular-nums",
                item.hasProblem && "text-destructive"
              )}
            >
              <span className="block">
                mean{" "}
                {formatNumericCheckValue(
                  item.aggregate,
                  item.aggregate.meanAbsolute,
                  item.unit,
                  item.transform
                )}
              </span>
              <span className="block text-muted-foreground">
                sd{" "}
                {formatNumericCheckValue(
                  item.aggregate,
                  standardDeviation,
                  item.unit,
                  item.transform
                )}
                , min{" "}
                {formatNumericCheckValue(
                  item.aggregate,
                  item.aggregate.min,
                  item.unit,
                  item.transform
                )}
                , max{" "}
                {formatNumericCheckValue(
                  item.aggregate,
                  item.aggregate.max,
                  item.unit,
                  item.transform
                )}
                , n {item.aggregate.count}
              </span>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function CheckFailureRows({ items }: { items: BooleanCheckItem[] }) {
  return (
    <dl className="grid gap-2">
      {items.map((item) => {
        const failureRate =
          item.aggregate.checkedCount === 0
            ? null
            : item.aggregate.failedCount / item.aggregate.checkedCount

        return (
          <div
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4"
            key={item.label}
          >
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd
              className={cn(
                "text-right tabular-nums",
                item.aggregate.failedCount > 0
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {failureRate === null ? "pending" : formatPercent(failureRate)}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

function formatObservationTimingDelta(observation: Observation | null) {
  const deviation_s = observation?.checks.targetReleaseToImpactTimeDeviation_s ?? null

  return deviation_s === null
    ? "pending"
    : `${formatNumber(sToMs(deviation_s), 3)} ms`
}

function formatObservationImpactSpeedDelta(observation: Observation | null) {
  const deviation_mps =
    observation?.checks.targetNormalImpactSpeedDeviation_mps ?? null

  return deviation_mps === null
    ? "pending"
    : `${formatNumber(deviation_mps, 4)} m/s`
}

function ExtremeObservationList({
  items,
}: {
  items: ExtremeObservationItem[]
}) {
  return (
    <FieldGroup>
      {items.map((item) => (
        <Collapsible key={item.title}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between"
            render={<Button className="px-0" type="button" variant="link" />}
          >
            <span>{item.title}</span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="tabular-nums">{item.value}</span>
              <CaretDown className="size-4" />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ObservationView
              observation={item.observation}
              showTitle={false}
              title={item.title}
            />
          </CollapsibleContent>
        </Collapsible>
      ))}
    </FieldGroup>
  )
}

function ObservationAggregateView({
  observations,
  timingTolerance_s,
}: {
  observations: ObservationAggregate | null
  timingTolerance_s: number
}) {
  if (observations === null) {
    return <p className="text-muted-foreground">Observations pending</p>
  }

  const checkAggregate = observations.checkAggregate
  const invalidRate =
    checkAggregate.observationCount === 0
      ? 0
      : checkAggregate.invalidCount / checkAggregate.observationCount
  const timingDeviationAggregate = checkAggregate.targetReleaseToImpactTimeDeviation_s
  const timingOutsideTolerance =
    timingDeviationAggregate.count > 0 &&
    Math.max(
      Math.abs(timingDeviationAggregate.min),
      Math.abs(timingDeviationAggregate.max)
    ) > Math.abs(timingTolerance_s)

  return (
    <FieldGroup>
      <FieldSet>
        <TargetStatsRows
          items={[
            {
              label: "Timing deviation",
              aggregate: checkAggregate.targetReleaseToImpactTimeDeviation_s,
              unit: "ms",
              hasProblem: timingOutsideTolerance,
              transform: sToMs,
            },
            {
              label: "Impact speed deviation",
              aggregate: checkAggregate.targetNormalImpactSpeedDeviation_mps,
              unit: "m/s",
            },
          ]}
        />
      </FieldSet>

      <FieldSet>
        <CheckFailureRows
          items={[
            {
              label: "Invalid observation",
              aggregate: {
                checkedCount: checkAggregate.observationCount,
                failedCount: checkAggregate.invalidCount,
              },
            },
            {
              label: "Ramp acceleration",
              aggregate: checkAggregate.rampReliableAccelerationOk,
            },
            {
              label: "Ramp static friction",
              aggregate: checkAggregate.rampStaticFrictionOk,
            },
            {
              label: "Ballistic impact",
              aggregate: checkAggregate.ballisticsImpactFound,
            },
            {
              label: "Contact direction",
              aggregate: checkAggregate.contactMovingIntoDrumOk,
            },
          ]}
        />
      </FieldSet>

      <p className="text-muted-foreground">
        {observations.completedRuns} / {observations.requestedRuns} runs,{" "}
        {observations.samples.length} samples, {formatPercent(invalidRate)}{" "}
        invalid
        {timingOutsideTolerance
          ? `, timing deviation above ${formatNumber(sToMs(Math.abs(timingTolerance_s)), 3)} ms`
          : ""}
      </p>

      <ExtremeObservationList
        items={[
          {
            title: "Earliest timing",
            observation: observations.earliestTimingObservation,
            value: formatObservationTimingDelta(
              observations.earliestTimingObservation
            ),
          },
          {
            title: "Latest timing",
            observation: observations.latestTimingObservation,
            value: formatObservationTimingDelta(
              observations.latestTimingObservation
            ),
          },
          {
            title: "Quietest impact",
            observation: observations.quietestImpactObservation,
            value: formatObservationImpactSpeedDelta(
              observations.quietestImpactObservation
            ),
          },
          {
            title: "Loudest impact",
            observation: observations.loudestImpactObservation,
            value: formatObservationImpactSpeedDelta(
              observations.loudestImpactObservation
            ),
          },
        ]}
      />
    </FieldGroup>
  )
}

export function ObservationsPanel({
  blueprint,
  observations,
  timingTolerance_s,
}: ObservationsPanelProps) {
  const hasProblems = hasObservationProblems(observations, timingTolerance_s)

  return (
    <Tabs defaultValue="blueprint">
      <TabsList className="w-full rounded-none border-b bg-background p-0">
        <TabsTrigger
          className="h-full rounded-none border-0 border-b-2 border-transparent bg-background data-active:border-primary data-active:shadow-none! dark:data-active:border-primary"
          value="blueprint"
        >
          Blueprint
        </TabsTrigger>
        <TabsTrigger
          className={cn(
            "h-full rounded-none border-0 border-b-2 border-transparent bg-background data-active:border-primary data-active:shadow-none! dark:data-active:border-primary",
            hasProblems && "text-destructive"
          )}
          value="observations"
        >
          Observations
          {hasProblems ? <Warning className="size-4" /> : null}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="blueprint">
        <FieldGroup>
          <BlueprintPanel blueprint={blueprint} />
          <ObservationView
            observation={observations?.nominalObservation ?? null}
            title="Nominal observation"
          />
        </FieldGroup>
      </TabsContent>
      <TabsContent value="observations">
        <ObservationAggregateView
          observations={observations}
          timingTolerance_s={timingTolerance_s}
        />
      </TabsContent>
    </Tabs>
  )
}

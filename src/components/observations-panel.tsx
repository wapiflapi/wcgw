import { useRef } from "react"

import { CaretDown, Copy, Warning } from "@phosphor-icons/react"
import { toast } from "sonner"

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
  solveError: string | null
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
  defaultOpen?: boolean
  observation: Observation | null
  title: string
  value: string
}

type ObservationCollapsibleListProps = {
  exportSpacing?: boolean
  forceOpen?: boolean
  items: ExtremeObservationItem[]
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

function formatNumericCheckNumber(
  aggregate: NumericCheckAggregate,
  value: number,
  transform: (value: number) => number = (rawValue) => rawValue
) {
  if (aggregate.count === 0) {
    return "pending"
  }

  return formatNumber(transform(value), 3)
}

function hasObservationProblems(
  observations: ObservationAggregate | null,
  timingTolerance_s: number
) {
  if (observations === null) {
    return false
  }

  const checkAggregate = observations.checkAggregate
  const timingDeviationAggregate =
    checkAggregate.targetReleaseToImpactTimeDeviation_s
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
    checkAggregate.chuteReliableAccelerationOk.failedCount > 0 ||
    checkAggregate.chuteStaticFrictionOk.failedCount > 0 ||
    timingOutsideTolerance
  )
}

function TargetStatsRows({ items }: { items: NumericCheckItem[] }) {
  return (
    <table className="w-full border-separate border-spacing-0">
      <thead>
        <tr className="text-muted-foreground">
          <th className="pr-4 pb-1 text-left font-normal" scope="col">
            Metric
          </th>
          <th className="pb-1 text-right font-normal" scope="col">
            Mean
          </th>
          <th className="pb-1 pl-4 text-right font-normal" scope="col">
            SD
          </th>
          <th className="pb-1 pl-4 text-right font-normal" scope="col">
            Min
          </th>
          <th className="pb-1 pl-4 text-right font-normal" scope="col">
            Max
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const standardDeviation = numericStandardDeviation(item.aggregate)

          return (
            <tr key={item.label}>
              <th
                className={cn(
                  "py-1 pr-4 text-left align-top font-normal text-muted-foreground",
                  item.hasProblem && "text-destructive"
                )}
                scope="row"
              >
                {item.label} {item.unit}
              </th>
              <td
                className={cn(
                  "py-1 text-right tabular-nums",
                  item.hasProblem && "text-destructive"
                )}
              >
                {formatNumericCheckNumber(
                  item.aggregate,
                  item.aggregate.meanAbsolute,
                  item.transform
                )}
              </td>
              <td
                className={cn(
                  "py-1 pl-4 text-right tabular-nums",
                  item.hasProblem && "text-destructive"
                )}
              >
                {formatNumericCheckNumber(
                  item.aggregate,
                  standardDeviation,
                  item.transform
                )}
              </td>
              <td
                className={cn(
                  "py-1 pl-4 text-right tabular-nums",
                  item.hasProblem && "text-destructive"
                )}
              >
                {formatNumericCheckNumber(
                  item.aggregate,
                  item.aggregate.min,
                  item.transform
                )}
              </td>
              <td
                className={cn(
                  "py-1 pl-4 text-right tabular-nums",
                  item.hasProblem && "text-destructive"
                )}
              >
                {formatNumericCheckNumber(
                  item.aggregate,
                  item.aggregate.max,
                  item.transform
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function CheckFailureRows({ items }: { items: BooleanCheckItem[] }) {
  return (
    <table className="w-full border-separate border-spacing-0">
      <thead>
        <tr className="text-muted-foreground">
          <th className="pr-4 pb-1 text-left font-normal" scope="col">
            Check
          </th>
          <th className="pb-1 text-right font-normal" scope="col">
            Failure rate
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const failureRate =
            item.aggregate.checkedCount === 0
              ? null
              : item.aggregate.failedCount / item.aggregate.checkedCount

          return (
            <tr key={item.label}>
              <th
                className="py-1 pr-4 text-left font-normal text-muted-foreground"
                scope="row"
              >
                {item.label}
              </th>
              <td
                className={cn(
                  "py-1 text-right tabular-nums",
                  item.aggregate.failedCount > 0
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {failureRate === null ? "pending" : formatPercent(failureRate)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function formatObservationTimingDelta(observation: Observation | null) {
  const deviation_s =
    observation?.checks.targetReleaseToImpactTimeDeviation_s ?? null

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

function ObservationCollapsibleList({
  exportSpacing = false,
  forceOpen = false,
  items,
}: ObservationCollapsibleListProps) {
  return (
    <FieldGroup>
      {items.map((item) => (
        <Collapsible
          defaultOpen={forceOpen || item.defaultOpen}
          key={item.title}
        >
          {exportSpacing ? <div>{"\n"}</div> : null}
          <CollapsibleTrigger
            className="flex w-full items-center justify-between"
            render={<Button className="px-0" type="button" variant="link" />}
          >
            <span className="text-muted-foreground">{item.title}</span>
            <span className="flex items-center gap-2">
              <span className="tabular-nums">{item.value}</span>
              <CaretDown className="size-4 text-muted-foreground" />
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

function formatObservationStatus(observation: Observation | null) {
  if (observation === null) {
    return "pending"
  }

  return observation.valid ? "valid" : "invalid"
}

function SimulationOverview({
  observations,
}: {
  observations: ObservationAggregate
}) {
  const completed = observations.completedRuns >= observations.requestedRuns

  return (
    <p className="text-muted-foreground">
      Based on{" "}
      <span className="tabular-nums">
        {completed
          ? formatNumber(observations.completedRuns, 0)
          : `${formatNumber(observations.completedRuns, 0)} of ${formatNumber(observations.requestedRuns, 0)}`}
      </span>{" "}
      simulated build variations;{" "}
      <span className="tabular-nums">
        {formatNumber(observations.samples.length, 0)}
      </span>{" "}
      representative examples retained.
    </p>
  )
}

function ObservationAggregateView({
  expandObservationDetails = false,
  observations,
  timingTolerance_s,
}: {
  expandObservationDetails?: boolean
  observations: ObservationAggregate | null
  timingTolerance_s: number
}) {
  if (observations === null) {
    return <p className="text-muted-foreground">Observations pending</p>
  }

  const checkAggregate = observations.checkAggregate
  const timingDeviationAggregate =
    checkAggregate.targetReleaseToImpactTimeDeviation_s
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
              label: "Timing",
              aggregate: checkAggregate.targetReleaseToImpactTimeDeviation_s,
              unit: "ms",
              hasProblem: timingOutsideTolerance,
              transform: sToMs,
            },
            {
              label: "Punch",
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
              label: "Chute acceleration",
              aggregate: checkAggregate.chuteReliableAccelerationOk,
            },
            {
              label: "Chute static friction",
              aggregate: checkAggregate.chuteStaticFrictionOk,
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

      <ObservationCollapsibleList
        forceOpen={expandObservationDetails}
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

      <SimulationOverview observations={observations} />
    </FieldGroup>
  )
}

async function copyElementToClipboard(element: HTMLElement) {
  const selection = window.getSelection()
  const range = document.createRange()

  selection?.removeAllRanges()
  range.selectNodeContents(element)
  selection?.addRange(range)

  const copied = document.execCommand("copy")
  selection?.removeAllRanges()

  if (copied) {
    return
  }

  const text = element.innerText.trim()

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.left = "-10000px"
  textarea.style.top = "0"
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand("copy")
  document.body.removeChild(textarea)
}

export function ObservationsPanel({
  blueprint,
  observations,
  solveError,
  timingTolerance_s,
}: ObservationsPanelProps) {
  const hasProblems = hasObservationProblems(observations, timingTolerance_s)
  const exportRef = useRef<HTMLDivElement>(null)

  async function copyExport() {
    const exportElement = exportRef.current

    if (!exportElement?.innerText.trim()) {
      toast.error("Nothing to export yet")
      return
    }

    try {
      await copyElementToClipboard(exportElement)
      toast.success("Right panel copied")
    } catch {
      toast.error("Could not copy right panel")
    }
  }

  return (
    <>
      <Tabs defaultValue="blueprint">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b">
          <TabsList className="w-full rounded-none border-b-0 bg-background p-0">
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
              {hasProblems ? (
                <Warning className="size-4 text-destructive" />
              ) : null}
            </TabsTrigger>
          </TabsList>
          <Button
            className="ml-2"
            size="icon-sm"
            title="Copy right panel"
            type="button"
            variant="ghost"
            onClick={copyExport}
          >
            <Copy />
          </Button>
        </div>

        <TabsContent value="blueprint">
          <FieldGroup>
            <BlueprintPanel blueprint={blueprint} solveError={solveError} />
            <ObservationCollapsibleList
              items={[
                {
                  defaultOpen: true,
                  observation: observations?.nominalObservation ?? null,
                  title: "Nominal observation",
                  value: formatObservationStatus(
                    observations?.nominalObservation ?? null
                  ),
                },
              ]}
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

      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 -left-[10000px] w-[26rem]"
        ref={exportRef}
      >
        <h2>Blueprint</h2>
        <FieldGroup>
          <BlueprintPanel
            blueprint={blueprint}
            expandOtherValues
            solveError={solveError}
          />
          <ObservationCollapsibleList
            exportSpacing
            forceOpen
            items={[
              {
                observation: observations?.nominalObservation ?? null,
                title: "Nominal observation",
                value: formatObservationStatus(
                  observations?.nominalObservation ?? null
                ),
              },
            ]}
          />
        </FieldGroup>
        <h2>Observations</h2>
        <ObservationAggregateView
          expandObservationDetails
          observations={observations}
          timingTolerance_s={timingTolerance_s}
        />
      </div>
    </>
  )
}

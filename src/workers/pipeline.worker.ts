import { expose } from "comlink"

import {
  type ObservationAggregate,
  type Blueprint,
  type ModelInput,
  type SolveResult,
} from "@/model/model"
import {
  createObservationAggregate,
  reduceObservationAggregate,
  setNominalObservation,
} from "@/model/aggregation"
import { runSimulationStep } from "@/model/simulation"
import {
  createNominalBlueprintRealization,
  sampleBlueprintRealization,
} from "@/model/realization"
import { solveBlueprint } from "@/model/solve"

export type PipelineEvent =
  | {
      result: SolveResult<Blueprint>
      type: "blueprint"
    }
  | {
      observations: ObservationAggregate
      type: "observations"
    }

export type PipelineWorkerApi = {
  computeBlueprint: (input: ModelInput) => Promise<SolveResult<Blueprint>>
  runPipeline: (
    input: ModelInput,
    options: PipelineRunOptions,
    onEvent: (event: PipelineEvent) => void
  ) => Promise<void>
}

export type PipelineRunOptions = {
  cancellationCheckEvery: number
  observationRequestedRuns: number
  observationSampleFillCheckpointEvery: number
  observationRecurringCheckpointEvery: number
  observationRequestedSampleCount: number
}

let activeRunId = 0

function isObservationCheckpoint(run: number, options: PipelineRunOptions) {
  const shouldCheckpointWhileFillingSamples =
    options.observationSampleFillCheckpointEvery > 0 &&
    run <= options.observationRequestedSampleCount &&
    run % options.observationSampleFillCheckpointEvery === 0

  return (
    shouldCheckpointWhileFillingSamples ||
    run % options.observationRecurringCheckpointEvery === 0 ||
    run === options.observationRequestedRuns
  )
}

function shouldYieldForCancellation(run: number, options: PipelineRunOptions) {
  if (options.cancellationCheckEvery <= 0) {
    return false
  }

  return run % options.cancellationCheckEvery === 0
}

function yieldToEventLoop() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const api: PipelineWorkerApi = {
  async computeBlueprint(input) {
    return solveBlueprint(input)
  },

  async runPipeline(input, options, onEvent) {
    const runId = ++activeRunId
    const blueprintResult = solveBlueprint(input)

    if (runId !== activeRunId) {
      return
    }

    onEvent({ result: blueprintResult, type: "blueprint" })

    if (blueprintResult.type === "invalid") {
      return
    }

    const blueprint = blueprintResult.value
    let observations = createObservationAggregate(
      options.observationRequestedRuns
    )

    const nominalRealization = createNominalBlueprintRealization(blueprint)

    observations = setNominalObservation(
      observations,
      runSimulationStep(nominalRealization, 1)
    )

    onEvent({
      observations,
      type: "observations",
    })

    await yieldToEventLoop()

    for (let run = 1; run <= options.observationRequestedRuns; run += 1) {
      if (runId !== activeRunId) {
        return
      }

      observations = reduceObservationAggregate(
        observations,
        runSimulationStep(sampleBlueprintRealization(blueprint), run + 1),
        options.observationRequestedSampleCount
      )

      if (isObservationCheckpoint(run, options)) {
        onEvent({
          observations,
          type: "observations",
        })
      }

      if (shouldYieldForCancellation(run, options)) {
        await yieldToEventLoop()
      }
    }
  },
}

expose(api)

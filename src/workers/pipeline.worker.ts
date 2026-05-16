import { expose } from "comlink"

import {
  type ObservationAggregate,
  type Blueprint,
  type ModelInput,
} from "@/model/model"
import {
  createObservationAggregate,
  reduceObservationAggregate,
  runSimulationStep,
} from "@/model/simulation"
import { solveBlueprint } from "@/model/solve"

export type PipelineEvent =
  | {
      blueprint: Blueprint
      type: "blueprint"
    }
  | {
      observations: ObservationAggregate
      type: "observations"
    }

export type PipelineWorkerApi = {
  computeBlueprint: (input: ModelInput) => Promise<Blueprint>
  runPipeline: (
    input: ModelInput,
    options: PipelineRunOptions,
    onEvent: (event: PipelineEvent) => void
  ) => Promise<void>
}

export type PipelineRunOptions = {
  cancellationCheckEvery: number
  observationCapRuns: number
  observationInitialCheckpoints: number[]
  observationRecurringCheckpointEvery: number
}

let activeRunId = 0

function isObservationCheckpoint(run: number, options: PipelineRunOptions) {
  return (
    options.observationInitialCheckpoints.includes(run) ||
    run % options.observationRecurringCheckpointEvery === 0 ||
    run === options.observationCapRuns
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
    const blueprint = solveBlueprint(input)
    let observations = createObservationAggregate(options.observationCapRuns)

    if (runId !== activeRunId) {
      return
    }

    onEvent({ blueprint, type: "blueprint" })

    for (let run = 1; run <= options.observationCapRuns; run += 1) {
      if (runId !== activeRunId) {
        return
      }

      observations = reduceObservationAggregate(
        observations,
        runSimulationStep(blueprint, run)
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

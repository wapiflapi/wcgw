import { proxy as comlinkProxy, releaseProxy, wrap } from "comlink"
import { useEffect, useState } from "react"

import type { Blueprint, ModelInput, ObservationAggregate } from "@/model/model"
import type {
  PipelineRunOptions,
  PipelineWorkerApi,
} from "@/workers/pipeline.worker"

export function usePipeline(
  modelInput: ModelInput,
  options: PipelineRunOptions
) {
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null)
  const [observations, setObservations] = useState<ObservationAggregate | null>(
    null
  )

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/pipeline.worker.ts", import.meta.url),
      { type: "module" }
    )
    const workerApi = wrap<PipelineWorkerApi>(worker)
    let active = true

    void workerApi.runPipeline(
      modelInput,
      options,
      comlinkProxy((event) => {
        if (!active) {
          return
        }

        if (event.type === "blueprint") {
          setBlueprint(event.blueprint)
          setObservations(null)
          return
        }

        setObservations(event.observations)
      })
    )

    return () => {
      active = false
      workerApi[releaseProxy]()
      worker.terminate()
    }
  }, [modelInput, options])

  return {
    blueprint,
    observations,
  }
}

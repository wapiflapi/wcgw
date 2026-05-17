import { proxy as comlinkProxy, releaseProxy, wrap } from "comlink"
import { useEffect, useRef, useState } from "react"

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
  const [observationsStale, setObservationsStale] = useState(false)
  const workerApiRef = useRef<PipelineWorkerApi | null>(null)

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/pipeline.worker.ts", import.meta.url),
      { type: "module" }
    )
    const workerApi = wrap<PipelineWorkerApi>(worker)
    workerApiRef.current = workerApi

    return () => {
      workerApiRef.current = null
      workerApi[releaseProxy]()
      worker.terminate()
    }
  }, [])

  useEffect(() => {
    const workerApi = workerApiRef.current

    if (workerApi === null) {
      return
    }

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
          setObservationsStale(true)
          return
        }

        setObservations(event.observations)
        setObservationsStale(false)
      })
    )

    return () => {
      active = false
    }
  }, [modelInput, options])

  return {
    blueprint,
    observations,
    observationsStale,
  }
}

import { useState } from "react"

import { DesignPanel } from "@/components/design-panel"
import { ObservationsPanel } from "@/components/observations-panel"
import { SchematicPanel } from "@/components/schematic-panel"
import { Toaster } from "@/components/ui/sonner"
import { usePipeline } from "@/hooks/use-pipeline"
import { defaultModelInput } from "@/model/defaults"
import type { ModelInput } from "@/model/model"
import type { PipelineRunOptions } from "@/workers/pipeline.worker"

const PIPELINE_RUN_OPTIONS: PipelineRunOptions = {
  cancellationCheckEvery: 25,
  observationRequestedRuns: 3000,
  observationInitialCheckpoints: [5, 10, 15, 20, 25, 100],
  observationRecurringCheckpointEvery: 1000,
  observationRequestedSampleCount: 25,
}

export function App() {
  const [modelInput, setModelInput] = useState<ModelInput>(defaultModelInput)
  const { blueprint, observations, observationsStale } = usePipeline(
    modelInput,
    PIPELINE_RUN_OPTIONS
  )

  return (
    <>
      <main className="grid min-h-svh grid-cols-1 sm:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] sm:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)_minmax(0,23rem)] lg:grid-rows-1 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)_minmax(0,26rem)]">
        <section className="p-4 sm:row-span-2 lg:row-span-1">
          <DesignPanel
            modelInput={modelInput}
            onModelInputChange={setModelInput}
          />
        </section>
        <section className="p-4 sm:col-start-2 sm:row-start-1 lg:col-start-2 lg:row-start-1">
          <SchematicPanel
            blueprint={blueprint}
            nominalObservation={observations?.nominalObservation ?? null}
            nominalObservationStale={observationsStale}
            sampledObservations={observations?.samples ?? []}
          />
        </section>
        <section className="p-4 sm:col-start-2 sm:row-start-2 lg:col-start-3 lg:row-start-1">
          <ObservationsPanel
            blueprint={blueprint}
            observations={observations}
            timingTolerance_s={modelInput.targetReleaseToImpactTimeTolerance_s}
          />
        </section>
      </main>
      <Toaster position="top-center" />
    </>
  )
}

export default App

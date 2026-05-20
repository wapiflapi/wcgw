import { DesignPanel } from "@/components/design-panel"
import { ObservationsPanel } from "@/components/observations-panel"
import { SchematicPanel } from "@/components/schematic-panel"
import { Toolbar } from "@/components/toolbar"
import { Toaster } from "@/components/ui/sonner"
import { usePipeline } from "@/hooks/use-pipeline"
import { useUrlModelInput } from "@/hooks/use-url-model-input"
import { defaultModelInput } from "@/model/defaults"
import type { PipelineRunOptions } from "@/workers/pipeline.worker"

const PIPELINE_RUN_OPTIONS: PipelineRunOptions = {
  cancellationCheckEvery: 25,
  observationRequestedRuns: 3000,
  observationSampleFillCheckpointEvery: 5,
  observationRecurringCheckpointEvery: 1000,
  observationRequestedSampleCount: 50,
}

export function App() {
  const [modelInput, setModelInput, featureFlags] = useUrlModelInput()
  const { blueprint, observations, observationsStale, solveError } =
    usePipeline(modelInput, PIPELINE_RUN_OPTIONS)

  return (
    <>
      <main className="grid min-h-svh grid-cols-1 sm:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] sm:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)_minmax(0,26rem)] lg:grid-rows-1 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)_minmax(0,26rem)]">
        <section className="p-4 sm:row-span-2 lg:row-span-1">
          <DesignPanel
            modelInput={modelInput}
            onModelInputChange={setModelInput}
            showChuteModeTabs={featureFlags.chuteModeTabs}
            solveError={solveError}
          />
        </section>
        <section className="grid min-h-[420px] min-w-0 grid-rows-[2rem_minmax(0,1fr)] p-4 sm:col-start-2 sm:row-start-1 sm:h-full sm:min-h-0 lg:col-start-2 lg:row-start-1">
          <Toolbar
            onResetModelInput={() => {
              setModelInput(defaultModelInput)
            }}
          />
          <SchematicPanel
            blueprint={blueprint}
            featuredObservations={[
              observations?.earliestTimingObservation ?? null,
              observations?.latestTimingObservation ?? null,
              observations?.quietestImpactObservation ?? null,
              observations?.loudestImpactObservation ?? null,
            ].filter((observation) => observation !== null)}
            nominalObservation={observations?.nominalObservation ?? null}
            nominalObservationStale={observationsStale}
            sampledObservations={observations?.samples ?? []}
          />
        </section>
        <section className="p-4 sm:col-start-2 sm:row-start-2 lg:col-start-3 lg:row-start-1">
          <ObservationsPanel
            blueprint={blueprint}
            observations={observations}
            solveError={solveError}
            timingTolerance_s={modelInput.targetReleaseToImpactTimeTolerance_s}
          />
        </section>
      </main>
      <Toaster position="top-center" />
    </>
  )
}

export default App

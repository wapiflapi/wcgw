import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BlueprintPanel } from "@/components/blueprint-panel"
import { ObservationView } from "@/components/observation-view"
import { FieldGroup } from "@/components/ui/field"
import type { Blueprint, ObservationAggregate } from "@/model/model"

type ObservationsPanelProps = {
  blueprint: Blueprint | null
  observations: ObservationAggregate | null
}

export function ObservationsPanel({
  blueprint,
  observations,
}: ObservationsPanelProps) {
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
          className="h-full rounded-none border-0 border-b-2 border-transparent bg-background data-active:border-primary data-active:shadow-none! dark:data-active:border-primary"
          value="observations"
        >
          Observations
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
        {observations === null
          ? "Observations pending"
          : `${observations.completedRuns} / ${observations.requestedRuns} runs, ${observations.samples.length} samples`}
      </TabsContent>
    </Tabs>
  )
}

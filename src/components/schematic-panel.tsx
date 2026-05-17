import { SchematicBoard } from "@/components/schematic-board"
import type { Blueprint, Observation } from "@/model/model"

type SchematicPanelProps = {
  blueprint: Blueprint | null
  featuredObservations: Observation[]
  nominalObservation: Observation | null
  nominalObservationStale: boolean
  sampledObservations: Observation[]
}

export function SchematicPanel({
  blueprint,
  featuredObservations,
  nominalObservation,
  nominalObservationStale,
  sampledObservations,
}: SchematicPanelProps) {
  return (
    <div className="min-h-0 min-w-0 overflow-auto p-4 sm:max-h-[600px]">
      <SchematicBoard
        blueprint={blueprint}
        featuredObservations={featuredObservations}
        nominalObservation={nominalObservation}
        nominalObservationStale={nominalObservationStale}
        sampledObservations={sampledObservations}
      />
    </div>
  )
}

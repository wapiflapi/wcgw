import { SchematicBoard } from "@/components/schematic-board"
import { Toolbar } from "@/components/toolbar"
import type { Blueprint } from "@/model/model"

type SchematicPanelProps = {
  blueprint: Blueprint | null
}

export function SchematicPanel({ blueprint }: SchematicPanelProps) {
  return (
    <section className="grid h-full min-w-0 grid-rows-[2rem_minmax(0,1fr)]">
      <Toolbar />
      <div className="max-h-[600px] min-h-0 min-w-0 overflow-auto p-4">
        <SchematicBoard blueprint={blueprint} />
      </div>
    </section>
  )
}

import { useEffect, useId, useState } from "react"

import { useTheme } from "@/components/theme-provider"

type BoardOptions = Omit<Partial<JXG.BoardAttributes>, "axis" | "grid"> & {
  axis?: boolean | Record<string, unknown>
  grid?: boolean | Record<string, unknown>
}

function getThemeColor(name: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

function initBoard(
  jsxGraph: typeof JXG,
  id: string,
  options: BoardOptions
): JXG.Board {
  // JSXGraph accepts object-valued axis/grid options at runtime, but its
  // published BoardAttributes type still narrows both fields to booleans.
  return jsxGraph.JSXGraph.initBoard(
    id,
    options as unknown as Partial<JXG.BoardAttributes>
  )
}

export function SchematicBoard() {
  const boardId = `schematic-${useId().replaceAll(":", "")}`
  const { resolvedTheme } = useTheme()
  const [renderedTheme, setRenderedTheme] = useState<
    typeof resolvedTheme | null
  >(null)

  useEffect(() => {
    let disposed = false
    let board: JXG.Board | null = null
    let freeBoard: ((board: JXG.Board) => void) | null = null
    const background = getThemeColor("--background")
    const border = getThemeColor("--border")
    const mutedForeground = getThemeColor("--muted-foreground")

    void import("jsxgraph").then((module) => {
      if (disposed) {
        return
      }

      const JXG = module.default
      freeBoard = (targetBoard) => {
        JXG.JSXGraph.freeBoard(targetBoard)
      }

      const boardOptions: BoardOptions = {
        axis: {
          highlightStrokeColor: mutedForeground,
          strokeColor: mutedForeground,
          strokeOpacity: 0.55,
          ticks: {
            label: {
              strokeColor: mutedForeground,
            },
            strokeColor: mutedForeground,
            strokeOpacity: 0.45,
          },
        },
        boundingbox: [-1, 1, 1, -1],
        drag: {
          enabled: false,
        },
        grid: {
          gridColor: border,
          gridOpacity: resolvedTheme === "dark" ? 0.32 : 0.75,
        },
        keepaspectratio: true,
        pan: {
          enabled: false,
        },
        resize: {
          enabled: true,
          throttle: 50,
        },
        showCopyright: false,
        showInfobox: false,
        showNavigation: false,
        zoom: false,
      }

      board = initBoard(JXG, boardId, boardOptions)
      board.setBoundingBox([-1, 1, 1, -1], true, "keep")
      board.containerObj.style.backgroundColor = background
      board.containerObj.style.borderColor = border

      setRenderedTheme(resolvedTheme)
    })

    return () => {
      disposed = true

      if (board !== null) {
        freeBoard?.(board)
      }
    }
  }, [boardId, resolvedTheme])

  return (
    <div
      id={boardId}
      className={
        renderedTheme === resolvedTheme
          ? "h-full w-full"
          : "h-full w-full opacity-0"
      }
    />
  )
}

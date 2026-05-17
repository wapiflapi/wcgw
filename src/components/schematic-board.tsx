import { useEffect, useId, useRef, useState } from "react"

import { useTheme } from "@/components/theme-provider"
import type { Blueprint } from "@/model/model"

type BoardOptions = Omit<Partial<JXG.BoardAttributes>, "axis" | "grid"> & {
  axis?: boolean | Record<string, unknown>
  grid?: boolean | Record<string, unknown>
}

type Point_m = {
  x_m: number
  y_m: number
}

type SchematicGeometry = {
  bounds: [number, number, number, number]
  drumLineA: Point_m
  drumLineB: Point_m
  impactPoint: Point_m
  rampExit: Point_m
  releasePoint: Point_m
}

type SchematicElements = {
  drumLine: JXG.GeometryElement
  drumLineA: JXG.Point
  drumLineB: JXG.Point
  impactPoint: JXG.Point
  rampExit: JXG.Point
  rampSegment: JXG.GeometryElement
  releasePoint: JXG.Point
}

type SchematicBoardProps = {
  blueprint: Blueprint | null
}

const DEFAULT_BOUNDS = [-1, 1, 1, -1] as [number, number, number, number]
const LINE_HANDLE_DISTANCE_m = 1
const MIN_VIEW_SIZE_m = 0.5
const VIEW_MARGIN_RATIO = 0.25

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

function lineHandlesThroughPoint(
  point: Point_m,
  angle_rad: number
): { a: Point_m; b: Point_m } {
  const direction_x = Math.cos(angle_rad)
  const direction_y = Math.sin(angle_rad)

  return {
    a: {
      x_m: point.x_m - direction_x * LINE_HANDLE_DISTANCE_m,
      y_m: point.y_m - direction_y * LINE_HANDLE_DISTANCE_m,
    },
    b: {
      x_m: point.x_m + direction_x * LINE_HANDLE_DISTANCE_m,
      y_m: point.y_m + direction_y * LINE_HANDLE_DISTANCE_m,
    },
  }
}

function getSchematicGeometry(blueprint: Blueprint): SchematicGeometry {
  const releasePoint = {
    x_m: blueprint.releasePoint_x_m.nominal,
    y_m: blueprint.releasePoint_y_m.nominal,
  }
  const impactPoint = {
    x_m: blueprint.impactPoint_x_m.nominal,
    y_m: blueprint.impactPoint_y_m.nominal,
  }
  const rampExit = {
    x_m:
      releasePoint.x_m +
      blueprint.rampLength_m.nominal *
        Math.cos(blueprint.rampAngle_rad.nominal),
    y_m:
      releasePoint.y_m +
      blueprint.rampLength_m.nominal *
        Math.sin(blueprint.rampAngle_rad.nominal),
  }
  const drumTiltAngle_rad = blueprint.drumTiltAngle_rad.nominal
  const drumSurfaceNormal = {
    x_m: -Math.sin(drumTiltAngle_rad),
    y_m: Math.cos(drumTiltAngle_rad),
  }
  const drumSurfaceContact = {
    x_m:
      impactPoint.x_m -
      drumSurfaceNormal.x_m * (blueprint.marbleDiameter_m.nominal / 2),
    y_m:
      impactPoint.y_m -
      drumSurfaceNormal.y_m * (blueprint.marbleDiameter_m.nominal / 2),
  }
  const drumLine = lineHandlesThroughPoint(
    drumSurfaceContact,
    drumTiltAngle_rad
  )
  const finitePoints = [releasePoint, rampExit, impactPoint]
  const xs = finitePoints.map((point) => point.x_m)
  const ys = finitePoints.map((point) => point.y_m)
  const minX_m = Math.min(...xs)
  const maxX_m = Math.max(...xs)
  const minY_m = Math.min(...ys)
  const maxY_m = Math.max(...ys)
  const width_m = Math.max(maxX_m - minX_m, MIN_VIEW_SIZE_m)
  const height_m = Math.max(maxY_m - minY_m, MIN_VIEW_SIZE_m)
  const viewSize_m = Math.max(width_m, height_m)
  const center_x_m = (minX_m + maxX_m) / 2
  const center_y_m = (minY_m + maxY_m) / 2
  const halfViewSize_m = (viewSize_m * (1 + VIEW_MARGIN_RATIO * 2)) / 2

  return {
    bounds: [
      center_x_m - halfViewSize_m,
      center_y_m + halfViewSize_m,
      center_x_m + halfViewSize_m,
      center_y_m - halfViewSize_m,
    ],
    drumLineA: drumLine.a,
    drumLineB: drumLine.b,
    impactPoint,
    rampExit,
    releasePoint,
  }
}

function movePoint(point: JXG.Point, nextPoint: Point_m) {
  point.moveTo([nextPoint.x_m, nextPoint.y_m], 0)
}

function createHiddenPoint(board: JXG.Board, point: Point_m) {
  return board.create("point", [point.x_m, point.y_m], {
    fixed: true,
    name: "",
    size: 1,
    visible: false,
  })
}

function createVisiblePoint(
  board: JXG.Board,
  point: Point_m,
  colors: {
    background: string
    primary: string
  }
) {
  return board.create("point", [point.x_m, point.y_m], {
    fillColor: colors.background,
    fixed: true,
    highlightFillColor: colors.background,
    highlightStrokeColor: colors.primary,
    name: "",
    size: 3,
    strokeColor: colors.primary,
  })
}

function createSchematicElements(
  board: JXG.Board,
  geometry: SchematicGeometry,
  colors: {
    background: string
    primary: string
  }
): SchematicElements {
  const releasePoint = createVisiblePoint(board, geometry.releasePoint, colors)
  const impactPoint = createVisiblePoint(board, geometry.impactPoint, colors)
  const rampExit = createHiddenPoint(board, geometry.rampExit)
  const drumLineA = createHiddenPoint(board, geometry.drumLineA)
  const drumLineB = createHiddenPoint(board, geometry.drumLineB)
  const rampSegment = board.create("segment", [releasePoint, rampExit], {
    fixed: true,
    highlightStrokeColor: colors.primary,
    strokeColor: colors.primary,
    strokeWidth: 3,
  })
  const drumLine = board.create("line", [drumLineA, drumLineB], {
    fixed: true,
    highlightStrokeColor: colors.primary,
    strokeColor: colors.primary,
    strokeWidth: 2,
  })

  return {
    drumLine,
    drumLineA,
    drumLineB,
    impactPoint,
    rampExit,
    rampSegment,
    releasePoint,
  }
}

function removeSchematicElements(
  board: JXG.Board,
  elements: SchematicElements
) {
  board.removeObject([
    elements.rampSegment,
    elements.drumLine,
    elements.releasePoint,
    elements.impactPoint,
    elements.rampExit,
    elements.drumLineA,
    elements.drumLineB,
  ])
}

function updateSchematicElements(
  board: JXG.Board,
  elements: SchematicElements,
  geometry: SchematicGeometry
) {
  movePoint(elements.releasePoint, geometry.releasePoint)
  movePoint(elements.impactPoint, geometry.impactPoint)
  movePoint(elements.rampExit, geometry.rampExit)
  movePoint(elements.drumLineA, geometry.drumLineA)
  movePoint(elements.drumLineB, geometry.drumLineB)
  board.setBoundingBox(geometry.bounds, true)
  board.update()
}

export function SchematicBoard({ blueprint }: SchematicBoardProps) {
  const boardId = `schematic-${useId().replaceAll(":", "")}`
  const { resolvedTheme } = useTheme()
  const [renderedTheme, setRenderedTheme] = useState<
    typeof resolvedTheme | null
  >(null)
  const boardRef = useRef<JXG.Board | null>(null)
  const elementsRef = useRef<SchematicElements | null>(null)
  const colorsRef = useRef<{
    background: string
    mutedForeground: string
    primary: string
  } | null>(null)

  useEffect(() => {
    let disposed = false
    let freeBoard: ((board: JXG.Board) => void) | null = null
    const background = getThemeColor("--background")
    const border = getThemeColor("--border")
    const mutedForeground = getThemeColor("--muted-foreground")
    const primary = getThemeColor("--primary")

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
            majorHeight: 6,
            minorHeight: 0,
            minorTicks: 0,
            strokeColor: mutedForeground,
            strokeOpacity: 0.45,
          },
        },
        boundingbox: DEFAULT_BOUNDS,
        drag: {
          enabled: false,
        },
        grid: false,
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

      const board = initBoard(JXG, boardId, boardOptions)

      board.containerObj.style.backgroundColor = background
      board.containerObj.style.borderColor = border
      boardRef.current = board
      colorsRef.current = {
        background,
        mutedForeground,
        primary,
      }
      setRenderedTheme(resolvedTheme)
    })

    return () => {
      disposed = true

      if (boardRef.current !== null) {
        freeBoard?.(boardRef.current)
        boardRef.current = null
        elementsRef.current = null
        colorsRef.current = null
      }
    }
  }, [boardId, resolvedTheme])

  useEffect(() => {
    const board = boardRef.current
    const colors = colorsRef.current

    if (board === null || colors === null) {
      return
    }

    if (blueprint === null) {
      if (elementsRef.current !== null) {
        removeSchematicElements(board, elementsRef.current)
        elementsRef.current = null
      }

      board.setBoundingBox(DEFAULT_BOUNDS, true)
      board.update()
      return
    }

    const geometry = getSchematicGeometry(blueprint)

    if (elementsRef.current === null) {
      elementsRef.current = createSchematicElements(board, geometry, colors)
    }

    updateSchematicElements(board, elementsRef.current, geometry)
  }, [blueprint, renderedTheme])

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

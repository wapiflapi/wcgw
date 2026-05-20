import { useEffect, useId, useRef, useState } from "react"

import { useTheme } from "@/components/theme-provider"
import type { Blueprint, Observation, Snapshot } from "@/model/model"

type BoardOptions = Omit<Partial<JXG.BoardAttributes>, "axis" | "grid"> & {
  axis?: boolean | Record<string, unknown>
  grid?: boolean | Record<string, unknown>
}

type Point_m = {
  x_m: number
  y_m: number
}

type Segment_m = {
  end: Point_m
  start: Point_m
}

type SchematicGeometry = {
  bounds: [number, number, number, number]
  drumLineA: Point_m
  drumLineB: Point_m
  impactPoint: Point_m
  chutePath: ChutePathGeometry
}

type ChutePathGeometry = {
  bendCenter: Point_m
  bendPoints: Point_m[]
  bendVisible: boolean
  entrySegment: Segment_m
  exitSegment: Segment_m
}

type SchematicElements = {
  chute: ChuteElements
  drumLine: JXG.GeometryElement
  drumLineA: JXG.Point
  drumLineB: JXG.Point
  impactPoint: JXG.Point
}

type ChuteElements = {
  bendArc: JXG.GeometryElement
  bendCenter: JXG.Point
  entryEnd: JXG.Point
  entrySegment: JXG.GeometryElement
  entryStart: JXG.Point
  exitEnd: JXG.Point
  exitSegment: JXG.GeometryElement
  exitStart: JXG.Point
}

type MarblePathStyle = {
  strokeColor: string
  strokeOpacity?: number
  strokeWidth: number
}

type MarblePathElements = {
  bounceArc: MarblePathCurve
  dropArc: MarblePathCurve
  boundsKey: string
  observation: Observation | null
  styleKey: string
}

type MarblePathCurve = JXG.GeometryElement & {
  dataX: number[]
  dataY: number[]
}

type SchematicBoardProps = {
  blueprint: Blueprint | null
  featuredObservations: Observation[]
  nominalObservation: Observation | null
  nominalObservationStale: boolean
  sampledObservations: Observation[]
}

const DEFAULT_BOUNDS = [-1, 1, 1, -1] as [number, number, number, number]
const LINE_HANDLE_DISTANCE_m = 1
const MIN_VIEW_SIZE_m = 0.5
const VIEW_MARGIN_RATIO = 0.25
const MIN_TRAJECTORY_TIME_s = 0.001
const TRAJECTORY_POINT_COUNT = 48
const CHUTE_BEND_POINT_COUNT = 48
const ACCEPTABLE_TIMING_DEVIATION_s = 0.001
const ACCEPTABLE_IMPACT_SPEED_DEVIATION_mps = 0.01

function getThemeColor(name: string) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
}

function isNullableBooleanCheckOk(value: boolean | null) {
  return value === true
}

function isNullableDeviationOk(
  deviation: number | null,
  acceptableAbsoluteDeviation: number
) {
  return (
    deviation !== null && Math.abs(deviation) <= acceptableAbsoluteDeviation
  )
}

function isObservationOk(observation: Observation) {
  const checks = observation.checks

  return (
    observation.valid &&
    isNullableBooleanCheckOk(checks.chuteReliableAccelerationOk) &&
    isNullableBooleanCheckOk(checks.chuteStaticFrictionOk) &&
    isNullableBooleanCheckOk(checks.ballisticsImpactFound) &&
    isNullableBooleanCheckOk(checks.contactMovingIntoDrumOk) &&
    isNullableDeviationOk(
      checks.targetReleaseToImpactTimeDeviation_s,
      ACCEPTABLE_TIMING_DEVIATION_s
    ) &&
    isNullableDeviationOk(
      checks.targetNormalImpactSpeedDeviation_mps,
      ACCEPTABLE_IMPACT_SPEED_DEVIATION_mps
    )
  )
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
  const chutePath = getChutePathGeometry(blueprint)
  const impactPoint = {
    x_m: blueprint.impactPoint_x_m.nominal,
    y_m: blueprint.impactPoint_y_m.nominal,
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
  const finitePoints = [
    chutePath.entrySegment.start,
    chutePath.entrySegment.end,
    ...chutePath.bendPoints,
    chutePath.exitSegment.start,
    chutePath.exitSegment.end,
    impactPoint,
  ]
  const bounds = getBoundsForPoints(finitePoints)

  return {
    bounds,
    drumLineA: drumLine.a,
    drumLineB: drumLine.b,
    impactPoint,
    chutePath,
  }
}

function getChutePathGeometry(blueprint: Blueprint): ChutePathGeometry {
  const entryAngle_rad = blueprint.chuteEntryAngle_rad.nominal
  const exitAngle_rad = blueprint.chuteExitAngle_rad.nominal
  const entryLength_m = blueprint.chuteEntryLength_m.nominal
  const exitLength_m = blueprint.chuteExitLength_m.nominal
  const bendRadius_m = blueprint.chuteBendRadius_m.nominal
  const bendAngle_rad = exitAngle_rad - entryAngle_rad
  const entryStart = {
    x_m: blueprint.releasePoint_x_m.nominal,
    y_m: blueprint.releasePoint_y_m.nominal,
  }
  const entryEnd = {
    x_m: entryStart.x_m + entryLength_m * Math.cos(entryAngle_rad),
    y_m: entryStart.y_m + entryLength_m * Math.sin(entryAngle_rad),
  }

  if (!blueprint.chuteBendEnabled || bendAngle_rad <= Number.EPSILON) {
    const exitEnd = {
      x_m: entryEnd.x_m + exitLength_m * Math.cos(entryAngle_rad),
      y_m: entryEnd.y_m + exitLength_m * Math.sin(entryAngle_rad),
    }

    return {
      bendCenter: entryEnd,
      bendPoints: [],
      bendVisible: false,
      entrySegment: {
        end: entryEnd,
        start: entryStart,
      },
      exitSegment: {
        end: exitEnd,
        start: entryEnd,
      },
    }
  }

  const bendPoints = getBendCurvePoints({
    bendAngle_rad,
    entryAngle_rad,
    entryEnd,
    exitAngle_rad,
    radius_m: bendRadius_m,
  })
  const exitStart = bendPoints[bendPoints.length - 1] ?? entryEnd
  const exitEnd = {
    x_m: exitStart.x_m + exitLength_m * Math.cos(exitAngle_rad),
    y_m: exitStart.y_m + exitLength_m * Math.sin(exitAngle_rad),
  }
  const bendCenter = getBendCenter({
    entryAngle_rad,
    entryEnd,
    radius_m: bendRadius_m,
  })

  return {
    bendCenter,
    bendPoints,
    bendVisible: bendPoints.length > 0,
    entrySegment: {
      end: entryEnd,
      start: entryStart,
    },
    exitSegment: {
      end: exitEnd,
      start: exitStart,
    },
  }
}

function getBoundsForPoints(points: Point_m[]) {
  const finitePoints = points.filter(
    (point) => Number.isFinite(point.x_m) && Number.isFinite(point.y_m)
  )

  if (finitePoints.length === 0) {
    return DEFAULT_BOUNDS
  }

  const xs = finitePoints.map((point) => point.x_m)
  const ys = finitePoints.map((point) => point.y_m)
  const minX_m = Math.min(...xs)
  const maxX_m = Math.max(...xs)
  const minY_m = Math.min(...ys)
  const maxY_m = Math.max(...ys)
  const width_m = Math.max(maxX_m - minX_m, MIN_VIEW_SIZE_m)
  const height_m = Math.max(maxY_m - minY_m, MIN_VIEW_SIZE_m)
  const viewSize_m = Math.max(width_m, height_m)
  const center_x_m = 0
  const center_y_m = (minY_m + maxY_m) / 2
  const halfViewSize_m = (viewSize_m * (1 + VIEW_MARGIN_RATIO * 2)) / 2

  return [
    center_x_m - halfViewSize_m,
    center_y_m + halfViewSize_m,
    center_x_m + halfViewSize_m,
    center_y_m - halfViewSize_m,
  ] as [number, number, number, number]
}

function getBendCurvePoints({
  bendAngle_rad,
  entryAngle_rad,
  entryEnd,
  exitAngle_rad,
  radius_m,
}: {
  bendAngle_rad: number
  entryAngle_rad: number
  entryEnd: Point_m
  exitAngle_rad: number
  radius_m: number
}) {
  const points: Point_m[] = []

  for (let index = 0; index < CHUTE_BEND_POINT_COUNT; index += 1) {
    const progress = index / (CHUTE_BEND_POINT_COUNT - 1)
    const angle_rad = entryAngle_rad + progress * bendAngle_rad
    const bendDx_m =
      radius_m * (Math.sin(angle_rad) - Math.sin(entryAngle_rad))
    const bendDy_m =
      radius_m * (Math.cos(entryAngle_rad) - Math.cos(angle_rad))

    points.push({
      x_m: entryEnd.x_m + bendDx_m,
      y_m: entryEnd.y_m + bendDy_m,
    })
  }

  // Keep the final point exactly aligned with the exit angle inputs. The
  // sampled curve normally lands here already; this removes tiny drift.
  const lastPoint = points[points.length - 1]
  if (lastPoint !== undefined) {
    lastPoint.x_m =
      entryEnd.x_m +
      radius_m * (Math.sin(exitAngle_rad) - Math.sin(entryAngle_rad))
    lastPoint.y_m =
      entryEnd.y_m +
      radius_m * (Math.cos(entryAngle_rad) - Math.cos(exitAngle_rad))
  }

  return points
}

function getBendCenter({
  entryAngle_rad,
  entryEnd,
  radius_m,
}: {
  entryAngle_rad: number
  entryEnd: Point_m
  radius_m: number
}) {
  return {
    x_m: entryEnd.x_m - radius_m * Math.sin(entryAngle_rad),
    y_m: entryEnd.y_m + radius_m * Math.cos(entryAngle_rad),
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
  },
  size: number
) {
  return board.create("point", [point.x_m, point.y_m], {
    fillColor: colors.background,
    fixed: true,
    highlightFillColor: colors.background,
    highlightStrokeColor: colors.primary,
    name: "",
    size,
    strokeColor: colors.primary,
    strokeWidth: 2,
  })
}

function createChuteElements(
  board: JXG.Board,
  chutePath: ChutePathGeometry,
  colors: {
    background: string
    primary: string
  }
): ChuteElements {
  const entryStart = createVisiblePoint(
    board,
    chutePath.entrySegment.start,
    colors,
    4
  )
  const entryEnd = createHiddenPoint(board, chutePath.entrySegment.end)
  const exitStart = createHiddenPoint(board, chutePath.exitSegment.start)
  const exitEnd = createHiddenPoint(board, chutePath.exitSegment.end)
  const bendCenter = createHiddenPoint(board, chutePath.bendCenter)
  const entrySegment = board.create("segment", [entryStart, entryEnd], {
    fixed: true,
    highlightStrokeColor: colors.primary,
    strokeColor: colors.primary,
    strokeWidth: 3,
  })
  const bendArc = board.create(
    "arc",
    [bendCenter, entryEnd, exitStart],
    {
      fixed: true,
      highlightStrokeColor: colors.primary,
      strokeColor: colors.primary,
      strokeWidth: 3,
      visible: chutePath.bendVisible,
    }
  )
  const exitSegment = board.create("segment", [exitStart, exitEnd], {
    fixed: true,
    highlightStrokeColor: colors.primary,
    strokeColor: colors.primary,
    strokeWidth: 3,
  })

  return {
    bendArc,
    bendCenter,
    entryEnd,
    entrySegment,
    entryStart,
    exitEnd,
    exitSegment,
    exitStart,
  }
}

function createSchematicElements(
  board: JXG.Board,
  geometry: SchematicGeometry,
  colors: {
    background: string
    primary: string
  }
): SchematicElements {
  const chute = createChuteElements(board, geometry.chutePath, colors)
  const impactPoint = createVisiblePoint(board, geometry.impactPoint, colors, 3)
  const drumLineA = createHiddenPoint(board, geometry.drumLineA)
  const drumLineB = createHiddenPoint(board, geometry.drumLineB)
  const drumLine = board.create("line", [drumLineA, drumLineB], {
    fixed: true,
    highlightStrokeColor: colors.primary,
    strokeColor: colors.primary,
    strokeWidth: 2,
  })

  return {
    chute,
    drumLine,
    drumLineA,
    drumLineB,
    impactPoint,
  }
}

function projectilePosition_x_m(snapshot: Snapshot, time_s: number) {
  return snapshot.marblePosition_x_m + snapshot.marbleSpeed_x_mps * time_s
}

function projectilePosition_y_m(
  snapshot: Snapshot,
  gravity_mps2: number,
  time_s: number
) {
  return (
    snapshot.marblePosition_y_m +
    snapshot.marbleSpeed_y_mps * time_s -
    0.5 * gravity_mps2 * time_s ** 2
  )
}

function positiveLinearTime_s(numerator: number, denominator: number) {
  if (Math.abs(denominator) <= Number.EPSILON) {
    return null
  }

  const time_s = numerator / denominator

  return time_s > MIN_TRAJECTORY_TIME_s ? time_s : null
}

function positiveQuadraticTimes_s(a: number, b: number, c: number) {
  if (Math.abs(a) <= Number.EPSILON) {
    const time_s = positiveLinearTime_s(-c, b)

    return time_s === null ? [] : [time_s]
  }

  const discriminant = b ** 2 - 4 * a * c

  if (discriminant < 0) {
    return []
  }

  const discriminantRoot = Math.sqrt(discriminant)
  const denominator = 2 * a
  const candidates = [
    (-b - discriminantRoot) / denominator,
    (-b + discriminantRoot) / denominator,
  ]

  return candidates.filter(
    (time_s) => Number.isFinite(time_s) && time_s > MIN_TRAJECTORY_TIME_s
  )
}

function getProjectileExitTime_s(
  snapshot: Snapshot,
  gravity_mps2: number,
  bounds: [number, number, number, number]
) {
  const [left_m, top_m, right_m, bottom_m] = bounds

  const horizontalExitTimes_s = [
    positiveLinearTime_s(
      left_m - snapshot.marblePosition_x_m,
      snapshot.marbleSpeed_x_mps
    ),
    positiveLinearTime_s(
      right_m - snapshot.marblePosition_x_m,
      snapshot.marbleSpeed_x_mps
    ),
  ].filter((time_s): time_s is number => time_s !== null)

  const verticalExitTimes_s = [
    ...positiveQuadraticTimes_s(
      -0.5 * gravity_mps2,
      snapshot.marbleSpeed_y_mps,
      snapshot.marblePosition_y_m - top_m
    ),
    ...positiveQuadraticTimes_s(
      -0.5 * gravity_mps2,
      snapshot.marbleSpeed_y_mps,
      snapshot.marblePosition_y_m - bottom_m
    ),
  ]

  const exitTimes_s = [...horizontalExitTimes_s, ...verticalExitTimes_s]

  if (exitTimes_s.length === 0) {
    return 1
  }

  return Math.min(...exitTimes_s)
}

function getProjectilePathPoints(
  snapshot: Snapshot,
  gravity_mps2: number,
  endTime_s: number
) {
  const pointCount = TRAJECTORY_POINT_COUNT
  const safeEndTime_s = Math.max(endTime_s, MIN_TRAJECTORY_TIME_s)
  const xValues_m: number[] = []
  const yValues_m: number[] = []

  for (let index = 0; index < pointCount; index += 1) {
    const ratio = index / (pointCount - 1)
    const time_s = safeEndTime_s * ratio

    xValues_m.push(projectilePosition_x_m(snapshot, time_s))
    yValues_m.push(projectilePosition_y_m(snapshot, gravity_mps2, time_s))
  }

  return {
    xValues_m,
    yValues_m,
  }
}

function isSnapshotDrawable(snapshot: Snapshot) {
  return (
    Number.isFinite(snapshot.marblePosition_x_m) &&
    Number.isFinite(snapshot.marblePosition_y_m) &&
    Number.isFinite(snapshot.marbleSpeed_x_mps) &&
    Number.isFinite(snapshot.marbleSpeed_y_mps) &&
    Number.isFinite(snapshot.time_s)
  )
}

function isObservationDrawable(observation: Observation) {
  return (
    Number.isFinite(observation.blueprintRealization.gravity_mps2) &&
    isSnapshotDrawable(observation.dropSnapshot) &&
    isSnapshotDrawable(observation.impactSnapshot) &&
    isSnapshotDrawable(observation.bounceSnapshot)
  )
}

function createMarblePathCurve(
  board: JXG.Board,
  style: MarblePathStyle
): MarblePathCurve {
  return board.create("curve", [[], []], {
    doAdvancedPlot: false,
    fixed: true,
    highlight: false,
    highlightStrokeColor: style.strokeColor,
    highlightStrokeOpacity: style.strokeOpacity,
    highlightStrokeWidth: style.strokeWidth,
    numberPointsHigh: TRAJECTORY_POINT_COUNT,
    numberPointsLow: TRAJECTORY_POINT_COUNT,
    strokeColor: style.strokeColor,
    strokeOpacity: style.strokeOpacity,
    strokeWidth: style.strokeWidth,
    useQdt: false,
    visible: false,
  }) as MarblePathCurve
}

function createMarblePathElements(
  board: JXG.Board,
  style: MarblePathStyle
): MarblePathElements {
  return {
    bounceArc: createMarblePathCurve(board, style),
    boundsKey: "",
    dropArc: createMarblePathCurve(board, style),
    observation: null,
    styleKey: "",
  }
}

function updateMarblePathCurve(
  curve: MarblePathCurve,
  snapshot: Snapshot,
  gravity_mps2: number,
  endTime_s: number
) {
  const { xValues_m, yValues_m } = getProjectilePathPoints(
    snapshot,
    gravity_mps2,
    endTime_s
  )

  curve.dataX.length = 0
  curve.dataY.length = 0
  curve.dataX.push(...xValues_m)
  curve.dataY.push(...yValues_m)
}

function hideMarblePathElements(elements: MarblePathElements) {
  elements.dropArc.setAttribute({ visible: false })
  elements.bounceArc.setAttribute({ visible: false })
  elements.observation = null
  elements.styleKey = ""
}

function styleKey(style: MarblePathStyle) {
  return [style.strokeColor, style.strokeOpacity ?? "", style.strokeWidth].join(
    ":"
  )
}

function boundsKey(bounds: [number, number, number, number]) {
  return bounds.join(":")
}

function updateMarblePathStyle(
  elements: MarblePathElements,
  style: MarblePathStyle
) {
  const nextStyleKey = styleKey(style)

  if (elements.styleKey === nextStyleKey) {
    return
  }

  const attributes = {
    highlightStrokeColor: style.strokeColor,
    highlightStrokeOpacity: style.strokeOpacity,
    highlightStrokeWidth: style.strokeWidth,
    strokeColor: style.strokeColor,
    strokeOpacity: style.strokeOpacity,
    strokeWidth: style.strokeWidth,
  }

  elements.dropArc.setAttribute(attributes)
  elements.bounceArc.setAttribute(attributes)
  elements.styleKey = nextStyleKey
}

function updateMarblePathElements(
  elements: MarblePathElements,
  bounds: [number, number, number, number],
  observation: Observation,
  style: MarblePathStyle
) {
  if (!isObservationDrawable(observation)) {
    hideMarblePathElements(elements)
    return
  }

  const gravity_mps2 = observation.blueprintRealization.gravity_mps2
  // Known flight time from drop to impact.
  const dropArcTime_s =
    observation.impactSnapshot.time_s - observation.dropSnapshot.time_s

  // Preview the bounce until it exits the current schematic viewport.
  const bounceArcTime_s = getProjectileExitTime_s(
    observation.bounceSnapshot,
    gravity_mps2,
    bounds
  )

  updateMarblePathStyle(elements, style)
  updateMarblePathCurve(
    elements.dropArc,
    observation.dropSnapshot,
    gravity_mps2,
    dropArcTime_s
  )
  updateMarblePathCurve(
    elements.bounceArc,
    observation.bounceSnapshot,
    gravity_mps2,
    bounceArcTime_s
  )
  elements.dropArc.setAttribute({ visible: true })
  elements.bounceArc.setAttribute({ visible: true })
  elements.observation = observation
}

function updateMarblePaths(
  board: JXG.Board,
  existingPaths: MarblePathElements[],
  bounds: [number, number, number, number],
  observations: Array<{
    observation: Observation
    style: MarblePathStyle
  }>
): MarblePathElements[] {
  const paths = [...existingPaths]
  const nextBoundsKey = boundsKey(bounds)

  for (let index = 0; index < observations.length; index += 1) {
    const path =
      paths[index] ?? createMarblePathElements(board, observations[index].style)

    if (paths[index] === undefined) {
      paths[index] = path
    }

    if (
      path.observation !== observations[index].observation ||
      path.boundsKey !== nextBoundsKey
    ) {
      updateMarblePathElements(
        path,
        bounds,
        observations[index].observation,
        observations[index].style
      )
      path.boundsKey = nextBoundsKey
    } else {
      updateMarblePathStyle(path, observations[index].style)
    }
  }

  for (let index = observations.length; index < paths.length; index += 1) {
    hideMarblePathElements(paths[index])
  }

  return paths
}

function removeSchematicElements(
  board: JXG.Board,
  elements: SchematicElements
) {
  board.removeObject([
    elements.chute.entrySegment,
    elements.chute.bendArc,
    elements.chute.exitSegment,
    elements.drumLine,
    elements.chute.entryStart,
    elements.chute.entryEnd,
    elements.chute.exitStart,
    elements.chute.exitEnd,
    elements.chute.bendCenter,
    elements.impactPoint,
    elements.drumLineA,
    elements.drumLineB,
  ])
}

function updateChuteElements(
  elements: ChuteElements,
  chutePath: ChutePathGeometry
) {
  movePoint(elements.entryStart, chutePath.entrySegment.start)
  movePoint(elements.entryEnd, chutePath.entrySegment.end)
  movePoint(elements.exitStart, chutePath.exitSegment.start)
  movePoint(elements.exitEnd, chutePath.exitSegment.end)
  movePoint(elements.bendCenter, chutePath.bendCenter)
  elements.bendArc.setAttribute({
    visible: chutePath.bendVisible,
  })
  elements.exitSegment.setAttribute({
    visible:
      chutePath.bendVisible ||
      distanceBetweenPoints_m(
        chutePath.exitSegment.start,
        chutePath.exitSegment.end
      ) >
        Number.EPSILON,
  })
}

function updateSchematicElements(
  board: JXG.Board,
  elements: SchematicElements,
  geometry: SchematicGeometry
) {
  updateChuteElements(elements.chute, geometry.chutePath)
  movePoint(elements.impactPoint, geometry.impactPoint)
  movePoint(elements.drumLineA, geometry.drumLineA)
  movePoint(elements.drumLineB, geometry.drumLineB)
  board.setBoundingBox(geometry.bounds, true)
}

function distanceBetweenPoints_m(a: Point_m, b: Point_m) {
  return Math.hypot(a.x_m - b.x_m, a.y_m - b.y_m)
}

export function SchematicBoard({
  blueprint,
  featuredObservations,
  nominalObservation,
  nominalObservationStale,
  sampledObservations,
}: SchematicBoardProps) {
  const boardId = `schematic-${useId().replaceAll(":", "")}`
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [renderedTheme, setRenderedTheme] = useState<
    typeof resolvedTheme | null
  >(null)
  const boardRef = useRef<JXG.Board | null>(null)
  const elementsRef = useRef<SchematicElements | null>(null)
  const marblePathsRef = useRef<MarblePathElements[]>([])
  const colorsRef = useRef<{
    background: string
    destructive: string
    mutedForeground: string
    primary: string
  } | null>(null)

  useEffect(() => {
    let disposed = false
    let freeBoard: ((board: JXG.Board) => void) | null = null
    const background = getThemeColor("--background")
    const border = getThemeColor("--border")
    const destructive = getThemeColor("--destructive")
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
          enabled: false,
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
        destructive,
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
        marblePathsRef.current = []
        colorsRef.current = null
      }
    }
  }, [boardId, resolvedTheme])

  useEffect(() => {
    const container = containerRef.current

    if (container === null) {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      boardRef.current?.resizeContainer(
        container.clientWidth,
        container.clientHeight
      )
    })

    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    const board = boardRef.current
    const colors = colorsRef.current

    if (board === null || colors === null) {
      return
    }

    if (blueprint === null) {
      if (marblePathsRef.current.length > 0) {
        marblePathsRef.current.forEach(hideMarblePathElements)
      }

      if (elementsRef.current !== null) {
        removeSchematicElements(board, elementsRef.current)
        elementsRef.current = null
      }

      board.setBoundingBox(DEFAULT_BOUNDS, true)
      board.update()
      return
    }

    const geometry = getSchematicGeometry(blueprint)

    board.suspendUpdate()

    if (elementsRef.current === null) {
      elementsRef.current = createSchematicElements(board, geometry, colors)
    }

    updateSchematicElements(board, elementsRef.current, geometry)

    const uniqueFeaturedObservations = featuredObservations.filter(
      (observation, index) =>
        featuredObservations.indexOf(observation) === index
    )
    const featuredObservationSet = new Set(uniqueFeaturedObservations)
    const nonNominalFeaturedObservations = uniqueFeaturedObservations.filter(
      (observation) => observation !== nominalObservation
    )
    const sampleStyle = {
      strokeColor: colors.primary,
      strokeOpacity: nominalObservationStale ? 0.03 : 0.08,
      strokeWidth: 2,
    }
    const nominalStyle = {
      strokeColor: colors.primary,
      strokeOpacity: 1,
      strokeWidth: 2,
    }
    const getFeaturedStyle = (observation: Observation): MarblePathStyle => ({
      strokeColor: isObservationOk(observation)
        ? colors.primary
        : colors.destructive,
      strokeOpacity: sampleStyle.strokeOpacity,
      strokeWidth: 2,
    })
    const marblePathSpecs: Array<{
      observation: Observation
      style: MarblePathStyle
    }> = [
      ...sampledObservations
        .filter(
          (observation) =>
            observation !== nominalObservation &&
            !featuredObservationSet.has(observation)
        )
        .map((observation) => ({
          observation,
          style: sampleStyle,
        })),
      ...nonNominalFeaturedObservations.map((observation) => ({
        observation,
        style: getFeaturedStyle(observation),
      })),
      ...(nominalObservation === null
        ? []
        : [
            {
              observation: nominalObservation,
              style: nominalStyle,
            },
          ]),
    ]

    marblePathsRef.current = updateMarblePaths(
      board,
      marblePathsRef.current,
      geometry.bounds,
      marblePathSpecs
    )

    board.unsuspendUpdate()
  }, [
    blueprint,
    featuredObservations,
    nominalObservation,
    nominalObservationStale,
    sampledObservations,
    renderedTheme,
  ])

  return (
    <div
      ref={containerRef}
      id={boardId}
      className={
        renderedTheme === resolvedTheme
          ? "h-full w-full"
          : "h-full w-full opacity-0"
      }
    />
  )
}

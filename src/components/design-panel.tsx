import { Info, WarningCircle } from "@phosphor-icons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FieldRow,
  FieldRowCompact,
  NumberField,
  SliderField,
} from "@/components/control-fields"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatNumber } from "@/lib/format"
import {
  getFreeFallDurationFromHeight_s,
  getFreeFallHeightFromDuration_m,
  getFreeFallHeightFromSpeed_m,
  getFreeFallSpeedFromHeight_m,
} from "@/model/free-fall"
import { clampInputValue, getBendInputRanges } from "@/model/input-constraints"
import { getSphereMass_g, isMassWithinRelativeTolerance } from "@/model/marble"
import type { ModelInput } from "@/model/model"
import {
  degToModelRad,
  mToMm,
  mmToM,
  msToS,
  radToDeg,
  sToMs,
} from "@/model/units"

type DesignPanelProps = {
  modelInput: ModelInput
  onModelInputChange: (modelInput: ModelInput) => void
  solveError: string | null
}

type ValueWithToleranceFieldProps = {
  id: string
  label: React.ReactNode
  unit?: string
  value: string
  toleranceId: string
  toleranceValue: string
  toleranceWhy?: string
  onValueChange: (value: number) => void
  onToleranceChange: (value: number) => void
}

function InfoLabel({ children, why }: { children: string; why?: string }) {
  if (!why) {
    return children
  }

  return (
    <span className="flex w-full items-center gap-2">
      <span>{children}</span>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              className="ml-auto size-3 p-0 hover:bg-transparent"
              size="icon-xs"
              variant="ghost"
            />
          }
        >
          <Info className="size-3" />
        </PopoverTrigger>
        <PopoverContent align="end" side="top">
          <PopoverDescription>{why}</PopoverDescription>
        </PopoverContent>
      </Popover>
    </span>
  )
}

function ToleranceLabel({ why }: { why?: string }) {
  return <InfoLabel why={why}>Tolerance</InfoLabel>
}

function ValueWithToleranceField({
  id,
  label,
  unit,
  value,
  toleranceId,
  toleranceValue,
  toleranceWhy,
  onValueChange,
  onToleranceChange,
}: ValueWithToleranceFieldProps) {
  return (
    <FieldRowCompact>
      <NumberField
        id={id}
        label={label}
        unit={unit}
        value={value}
        onChange={onValueChange}
      />
      <NumberField
        id={toleranceId}
        label={<ToleranceLabel why={toleranceWhy} />}
        prefix="±"
        unit={unit}
        value={toleranceValue}
        onChange={onToleranceChange}
      />
    </FieldRowCompact>
  )
}

function SolveErrorAlert({ message }: { message: string }) {
  const [summary, ...details] = message.split("\n").filter(Boolean)
  const detail = details.join(" ")

  return (
    <Alert>
      <WarningCircle className="text-destructive" />
      <AlertTitle className="text-destructive">{summary}</AlertTitle>
      {detail ? (
        <AlertDescription className="text-foreground">
          {detail}
        </AlertDescription>
      ) : null}
    </Alert>
  )
}

export function DesignPanel({
  modelInput,
  onModelInputChange,
  solveError,
}: DesignPanelProps) {
  function updateInput<Key extends keyof ModelInput>(
    key: Key,
    value: ModelInput[Key]
  ) {
    onModelInputChange({
      ...modelInput,
      [key]: value,
    })
  }

  function updateInputs(updates: Partial<ModelInput>) {
    onModelInputChange({
      ...modelInput,
      ...updates,
    })
  }

  const gravity_mps2 = modelInput.gravity_mps2
  const bendInputRanges = getBendInputRanges(modelInput)
  const minimumChuteBendRadius_mm = mToMm(bendInputRanges.chuteBendRadius_m.min)
  const maximumChuteBendRadius_mm = mToMm(bendInputRanges.chuteBendRadius_m.max)
  const chuteBendRadiusStep_mm = 1
  const minimumChuteEntryLength_mm = mToMm(
    bendInputRanges.chuteEntryLength_m.min
  )
  const maximumChuteEntryLength_mm = mToMm(
    bendInputRanges.chuteEntryLength_m.max
  )
  const chuteEntryLengthStep_mm = 1
  const bendEntryAngle_rad = clampInputValue(
    modelInput.chuteEntryAngle_rad,
    bendInputRanges.chuteEntryAngle_rad
  )
  const bendEntryAngle_deg = radToDeg(bendEntryAngle_rad)
  const maximumBendEntryAngle_deg = radToDeg(
    bendInputRanges.chuteEntryAngle_rad.max
  )
  const bendAngle_rad = clampInputValue(
    modelInput.chuteBendAngle_rad,
    bendInputRanges.chuteBendAngle_rad
  )
  const bendAngle_deg = radToDeg(bendAngle_rad)
  const maximumBendAngle_deg = radToDeg(bendInputRanges.chuteBendAngle_rad.max)
  const bendRadius_m = clampInputValue(
    modelInput.chuteBendRadius_m,
    bendInputRanges.chuteBendRadius_m
  )
  const bendEntryLength_m = clampInputValue(
    modelInput.chuteEntryLength_m,
    bendInputRanges.chuteEntryLength_m
  )
  const expectedMarbleMass_g = getSphereMass_g(
    modelInput.marbleDiameter_m,
    modelInput.marbleDensity_kgpm3
  )
  const expectedMarbleMassMin_g = expectedMarbleMass_g * 0.9
  const expectedMarbleMassMax_g = expectedMarbleMass_g * 1.1
  const isMarbleMassExpected = isMassWithinRelativeTolerance(
    modelInput.marbleMass_g,
    expectedMarbleMass_g,
    0.1
  )
  const referenceDropHeight_m = 1
  const referenceDropTime_s = getFreeFallDurationFromHeight_s(
    referenceDropHeight_m,
    gravity_mps2
  )
  const positionTolerance_m = Math.abs(
    modelInput.manufacturingPositionTolerance_m
  )
  const lowerToleranceDropHeight_m = Math.max(
    0,
    referenceDropHeight_m - positionTolerance_m
  )
  const lowerToleranceDropTime_s = getFreeFallDurationFromHeight_s(
    lowerToleranceDropHeight_m,
    gravity_mps2
  )
  const upperToleranceDropTime_s = getFreeFallDurationFromHeight_s(
    referenceDropHeight_m + positionTolerance_m,
    gravity_mps2
  )
  const positionToleranceTimingError_s = Math.max(
    Math.abs(referenceDropTime_s - lowerToleranceDropTime_s),
    Math.abs(upperToleranceDropTime_s - referenceDropTime_s)
  )
  const isPositionToleranceWithinTimingTolerance =
    positionToleranceTimingError_s <=
    Math.abs(modelInput.targetReleaseToImpactTimeTolerance_s)

  return (
    <Tabs defaultValue="blueprint">
      <TabsList className="w-full rounded-none border-b bg-background p-0">
        <TabsTrigger
          className="h-full rounded-none border-0 border-b-2 border-transparent bg-background data-active:border-primary data-active:shadow-none! dark:data-active:border-primary"
          value="blueprint"
        >
          Design
        </TabsTrigger>
        <TabsTrigger
          className="h-full rounded-none border-0 border-b-2 border-transparent bg-background data-active:border-primary data-active:shadow-none! dark:data-active:border-primary"
          value="construction"
        >
          Construction
        </TabsTrigger>
        <TabsTrigger
          className="h-full rounded-none border-0 border-b-2 border-transparent bg-background data-active:border-primary data-active:shadow-none! dark:data-active:border-primary"
          value="simulation"
        >
          Simulation
        </TabsTrigger>
      </TabsList>

      <TabsContent value="blueprint">
        <FieldGroup className="gap-4">
          <FieldSet>
            <FieldLegend>Marble</FieldLegend>
            <FieldRowCompact>
              <NumberField
                id="marbleDiameter_mm"
                label={
                  <InfoLabel why="Sets the marble radius used by rolling, spin, and contact geometry. Editing diameter also updates the mass estimate from the density.">
                    Diameter
                  </InfoLabel>
                }
                unit="mm"
                value={formatNumber(mToMm(modelInput.marbleDiameter_m), 0)}
                onChange={(diameter_mm) => {
                  const diameter_m = mmToM(diameter_mm)

                  updateInputs({
                    marbleDiameter_m: diameter_m,
                    marbleMass_g: getSphereMass_g(
                      diameter_m,
                      modelInput.marbleDensity_kgpm3
                    ),
                  })
                }}
              />
              <NumberField
                id="marbleMass_g"
                label={
                  <InfoLabel why="Carried into the blueprint as the marble mass. The current trajectory math mostly uses geometry, but mass belongs here for impact energy and punch calculations.">
                    Mass
                  </InfoLabel>
                }
                unit="g"
                value={formatNumber(modelInput.marbleMass_g, 0)}
                onChange={(mass_g) => {
                  updateInput("marbleMass_g", mass_g)
                }}
              />
            </FieldRowCompact>
            {isMarbleMassExpected ? null : (
              <FieldError>
                Expected {formatNumber(expectedMarbleMassMin_g, 1)}-
                {formatNumber(expectedMarbleMassMax_g, 1)} g for this diameter
                and density.
              </FieldError>
            )}
          </FieldSet>

          <FieldSet>
            <FieldLegend>Timing</FieldLegend>
            <FieldRowCompact>
              <NumberField
                id="timingDropHeight_mm"
                label={
                  <InfoLabel why="An intuitive timing control. The UI converts this drop height into the target release-to-impact time using gravity.">
                    Same as dropping from
                  </InfoLabel>
                }
                unit="mm"
                value={formatNumber(
                  mToMm(
                    getFreeFallHeightFromDuration_m(
                      modelInput.targetReleaseToImpactTime_s,
                      gravity_mps2
                    )
                  ),
                  0
                )}
                onChange={(height_mm) => {
                  updateInput(
                    "targetReleaseToImpactTime_s",
                    getFreeFallDurationFromHeight_s(
                      mmToM(height_mm),
                      gravity_mps2
                    )
                  )
                }}
              />
              <NumberField
                id="targetReleaseToImpactTime_ms"
                label={
                  <InfoLabel why="The solver tries to make the marble take this long from release to drum impact. Observations compare simulated timing against it.">
                    Target total time
                  </InfoLabel>
                }
                unit="ms"
                value={formatNumber(
                  sToMs(modelInput.targetReleaseToImpactTime_s),
                  3
                )}
                onChange={(time_ms) => {
                  updateInput("targetReleaseToImpactTime_s", msToS(time_ms))
                }}
              />
            </FieldRowCompact>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Punch</FieldLegend>
            <FieldRowCompact>
              <NumberField
                id="punchDropHeight_mm"
                label={
                  <InfoLabel why="An intuitive punch control. The UI converts this drop height into a target normal impact speed.">
                    Same as dropping from
                  </InfoLabel>
                }
                unit="mm"
                value={formatNumber(
                  mToMm(
                    getFreeFallHeightFromSpeed_m(
                      modelInput.targetNormalImpactSpeed_mps,
                      gravity_mps2
                    )
                  ),
                  0
                )}
                onChange={(height_mm) => {
                  updateInput(
                    "targetNormalImpactSpeed_mps",
                    getFreeFallSpeedFromHeight_m(mmToM(height_mm), gravity_mps2)
                  )
                }}
              />
              <NumberField
                id="targetNormalImpactSpeed_mps"
                label={
                  <InfoLabel why="The speed into the drum surface normal. The solver uses this as the punch target and observations check the simulated impact against it.">
                    Impact speed
                  </InfoLabel>
                }
                unit="m/s"
                value={formatNumber(modelInput.targetNormalImpactSpeed_mps, 4)}
                onChange={(speed_mps) => {
                  updateInput("targetNormalImpactSpeed_mps", speed_mps)
                }}
              />
            </FieldRowCompact>
          </FieldSet>

          <FieldSet>
            <Tabs
              className="gap-4"
              value={modelInput.chuteBendEnabled ? "bend" : "straight"}
              onValueChange={(value) => {
                const bendEnabled = value === "bend"

                updateInputs({
                  chuteBendEnabled: bendEnabled,
                })
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-medium">Chute</div>
                <TabsList>
                  <TabsTrigger value="straight">Straight</TabsTrigger>
                  <TabsTrigger value="bend">Bend</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="straight">
                <SliderField
                  id="straightChuteEntryAngle_deg"
                  label={
                    <InfoLabel why="Sets the initial chute direction and how much gravity accelerates the marble before launch.">
                      Entry angle
                    </InfoLabel>
                  }
                  unit="deg"
                  value={radToDeg(modelInput.chuteEntryAngle_rad)}
                  min={-90}
                  max={0}
                  step={1}
                  inverted
                  onChange={(angle_deg) => {
                    updateInput("chuteEntryAngle_rad", degToModelRad(angle_deg))
                  }}
                />
              </TabsContent>
              <TabsContent value="bend">
                <FieldGroup>
                  <SliderField
                    id="bendChuteEntryAngle_deg"
                    label={
                      <InfoLabel why="Sets the initial chute direction and how much gravity accelerates the marble before launch.">
                        Entry angle
                      </InfoLabel>
                    }
                    unit="deg"
                    value={bendEntryAngle_deg}
                    min={-90}
                    max={maximumBendEntryAngle_deg}
                    step={1}
                    inverted
                    virtualMax={0}
                    onChange={(angle_deg) => {
                      updateInput(
                        "chuteEntryAngle_rad",
                        clampInputValue(
                          degToModelRad(angle_deg),
                          bendInputRanges.chuteEntryAngle_rad
                        )
                      )
                    }}
                  />
                  <SliderField
                    id="chuteBendAngle_deg"
                    label={
                      <InfoLabel why="Sets how far the bend turns from the entry direction toward a flatter launch. Smaller values look closer to a straight chute.">
                        Bend angle
                      </InfoLabel>
                    }
                    unit="deg"
                    value={bendAngle_deg}
                    min={0}
                    max={maximumBendAngle_deg}
                    step={1}
                    virtualMax={90}
                    onChange={(angle_deg) => {
                      updateInput(
                        "chuteBendAngle_rad",
                        clampInputValue(
                          degToModelRad(angle_deg),
                          bendInputRanges.chuteBendAngle_rad
                        )
                      )
                    }}
                  />
                  <SliderField
                    id="chuteEntryLength_mm"
                    label={
                      <InfoLabel why="Straight chute length before the bend. Set to zero when the chute should start directly on the curve.">
                        Entry run
                      </InfoLabel>
                    }
                    unit="mm"
                    value={mToMm(bendEntryLength_m)}
                    min={minimumChuteEntryLength_mm}
                    max={maximumChuteEntryLength_mm}
                    step={chuteEntryLengthStep_mm}
                    onChange={(length_mm) => {
                      updateInput(
                        "chuteEntryLength_m",
                        clampInputValue(
                          mmToM(length_mm),
                          bendInputRanges.chuteEntryLength_m
                        )
                      )
                    }}
                  />
                  <SliderField
                    id="chuteBendRadius_mm"
                    label={
                      <InfoLabel why="Radius of the curved bend. Smaller values make a tighter turn; larger values make the chute closer to a straight path.">
                        Bend size
                      </InfoLabel>
                    }
                    unit="mm"
                    value={mToMm(bendRadius_m)}
                    min={minimumChuteBendRadius_mm}
                    max={maximumChuteBendRadius_mm}
                    step={chuteBendRadiusStep_mm}
                    onChange={(radius_mm) => {
                      updateInput(
                        "chuteBendRadius_m",
                        clampInputValue(
                          mmToM(radius_mm),
                          bendInputRanges.chuteBendRadius_m
                        )
                      )
                    }}
                  />
                </FieldGroup>
              </TabsContent>
              {solveError ? <SolveErrorAlert message={solveError} /> : null}
            </Tabs>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Drum</FieldLegend>
            <SliderField
              id="drumTiltAngle_deg"
              label={
                <InfoLabel why="Sets the drum surface normal at the nominal impact point. This changes the solved release point and the impact-speed target direction.">
                  Tilt angle
                </InfoLabel>
              }
              unit="deg"
              value={radToDeg(modelInput.drumTiltAngle_rad)}
              min={-45}
              max={0}
              step={0.1}
              inverted
              onChange={(angle_deg) => {
                updateInput("drumTiltAngle_rad", degToModelRad(angle_deg))
              }}
            />
          </FieldSet>
        </FieldGroup>
      </TabsContent>

      <TabsContent value="construction">
        <FieldGroup className="gap-4">
          <FieldSet>
            <FieldLegend>Drum Pivot</FieldLegend>
            <FieldGroup>
              <SliderField
                id="drumPivotAngleRange_deg"
                label={
                  <InfoLabel why="Simulation samples a negative-to-zero pivot rotation from this range to model the drum assembly moving around its arm.">
                    Pivot angle range
                  </InfoLabel>
                }
                unit="deg"
                value={radToDeg(modelInput.drumPivotAngleRange_rad)}
                min={0}
                max={90}
                step={1}
                onChange={(angle_deg) => {
                  updateInput(
                    "drumPivotAngleRange_rad",
                    degToModelRad(angle_deg)
                  )
                }}
              />
              <SliderField
                id="drumPivotArmLength_mm"
                label={
                  <InfoLabel why="Distance from the unpivoted impact point to the pivot. When the drum pivots, this arm length determines how far the impact point moves.">
                    Pivot arm length
                  </InfoLabel>
                }
                unit="mm"
                value={mToMm(modelInput.drumPivotArmLength_m)}
                min={0}
                max={1000}
                step={1}
                onChange={(length_mm) => {
                  updateInput("drumPivotArmLength_m", mmToM(length_mm))
                }}
              />
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Manufacturing</FieldLegend>
            <FieldRow>
              <NumberField
                id="targetReleaseToImpactTimeTolerance_ms"
                label={
                  <InfoLabel why="Small timing errors are easy to hear. Five milliseconds is a strict but useful starting point for judging whether the build is drifting.">
                    Timing tolerance
                  </InfoLabel>
                }
                prefix="±"
                unit="ms"
                value={formatNumber(
                  sToMs(modelInput.targetReleaseToImpactTimeTolerance_s),
                  1
                )}
                onChange={(tolerance_ms) => {
                  updateInput(
                    "targetReleaseToImpactTimeTolerance_s",
                    msToS(tolerance_ms)
                  )
                }}
              />
              <NumberField
                id="manufacturingPositionTolerance_mm"
                label={
                  <InfoLabel why="Mounting and alignment errors can dominate the printed part accuracy, especially if the assembly flexes or vibrates.">
                    Positional tolerance
                  </InfoLabel>
                }
                prefix="±"
                unit="mm"
                value={formatNumber(
                  mToMm(modelInput.manufacturingPositionTolerance_m),
                  2
                )}
                onChange={(tolerance_mm) => {
                  updateInput(
                    "manufacturingPositionTolerance_m",
                    mmToM(tolerance_mm)
                  )
                }}
              />
              <NumberField
                id="manufacturingLinearTolerance_mm"
                label={
                  <InfoLabel why="Desktop FDM ABS dimensions are often around half a millimeter off unless the printer and part are dialed in.">
                    Linear tolerance
                  </InfoLabel>
                }
                prefix="±"
                unit="mm"
                value={formatNumber(
                  mToMm(modelInput.manufacturingLinearTolerance_m),
                  2
                )}
                onChange={(tolerance_mm) => {
                  updateInput(
                    "manufacturingLinearTolerance_m",
                    mmToM(tolerance_mm)
                  )
                }}
              />
              <NumberField
                id="manufacturingAngleTolerance_deg"
                label={
                  <InfoLabel why="A one degree angular build error is a practical starting guess for a small assembled rig.">
                    Angular tolerance
                  </InfoLabel>
                }
                prefix="±"
                unit="deg"
                value={formatNumber(
                  radToDeg(modelInput.manufacturingAngleTolerance_rad),
                  2
                )}
                onChange={(tolerance_deg) => {
                  updateInput(
                    "manufacturingAngleTolerance_rad",
                    degToModelRad(tolerance_deg)
                  )
                }}
              />
            </FieldRow>
            {isPositionToleranceWithinTimingTolerance ? null : (
              <FieldError>
                Positional tolerance can shift a 1 m free fall by{" "}
                {formatNumber(sToMs(positionToleranceTimingError_s), 2)} ms,
                above the{" "}
                {formatNumber(
                  sToMs(
                    Math.abs(modelInput.targetReleaseToImpactTimeTolerance_s)
                  ),
                  2
                )}{" "}
                ms timing tolerance.
              </FieldError>
            )}
          </FieldSet>
        </FieldGroup>
      </TabsContent>

      <TabsContent value="simulation">
        <FieldGroup className="gap-4">
          <FieldSet>
            <FieldLegend>Environment</FieldLegend>
            <FieldRow>
              <NumberField
                id="gravity_mps2"
                label={
                  <InfoLabel why="Used for free-fall conversions, blueprint solving, chute acceleration, and ballistic trajectories.">
                    Gravity
                  </InfoLabel>
                }
                unit="m/s^2"
                value={formatNumber(gravity_mps2, 2)}
                onChange={(gravity) => {
                  updateInput("gravity_mps2", gravity)
                }}
              />
              <NumberField
                id="marbleDensity_kgpm3"
                label={
                  <InfoLabel why="Used to estimate marble mass automatically from diameter. It does not directly change the current trajectory math.">
                    Marble density
                  </InfoLabel>
                }
                unit="kg/m^3"
                value={formatNumber(modelInput.marbleDensity_kgpm3, 0)}
                onChange={(density_kgpm3) => {
                  updateInput("marbleDensity_kgpm3", density_kgpm3)
                }}
              />
            </FieldRow>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Roll</FieldLegend>
            <FieldGroup>
              <ValueWithToleranceField
                id="chuteEnergyEfficiency_ratio"
                label={
                  <InfoLabel why="Scales the ideal rolling acceleration along the chute. Lower values mean more energy lost before launch.">
                    Chute efficiency
                  </InfoLabel>
                }
                value={formatNumber(modelInput.chuteEnergyEfficiency_ratio, 2)}
                toleranceId="chuteEnergyEfficiencyTolerance_ratio"
                toleranceValue={formatNumber(
                  modelInput.chuteEnergyEfficiencyTolerance_ratio,
                  2
                )}
                toleranceWhy="A 3D printed ABS chute can lose energy through roughness, layer lines, seams, and a messy launch."
                onValueChange={(efficiency) => {
                  updateInput("chuteEnergyEfficiency_ratio", efficiency)
                }}
                onToleranceChange={(tolerance) => {
                  updateInput("chuteEnergyEfficiencyTolerance_ratio", tolerance)
                }}
              />
              <ValueWithToleranceField
                id="staticFrictionCoefficient_ratio"
                label={
                  <InfoLabel why="Used to decide whether the marble can roll without slipping on the chute.">
                    Static friction
                  </InfoLabel>
                }
                unit="mu"
                value={formatNumber(
                  modelInput.staticFrictionCoefficient_ratio,
                  2
                )}
                toleranceId="staticFrictionCoefficientTolerance_ratio"
                toleranceValue={formatNumber(
                  modelInput.staticFrictionCoefficientTolerance_ratio,
                  2
                )}
                toleranceWhy="Steel on printed ABS depends heavily on surface finish, dust, layer direction, and contact pressure."
                onValueChange={(coefficient) => {
                  updateInput("staticFrictionCoefficient_ratio", coefficient)
                }}
                onToleranceChange={(tolerance) => {
                  updateInput(
                    "staticFrictionCoefficientTolerance_ratio",
                    tolerance
                  )
                }}
              />
              <ValueWithToleranceField
                id="kineticFrictionCoefficient_ratio"
                label={
                  <InfoLabel why="Used when the marble is sliding on the chute. It sets the sliding acceleration and spin-up rate.">
                    Kinetic friction
                  </InfoLabel>
                }
                unit="mu"
                value={formatNumber(
                  modelInput.kineticFrictionCoefficient_ratio,
                  2
                )}
                toleranceId="kineticFrictionCoefficientTolerance_ratio"
                toleranceValue={formatNumber(
                  modelInput.kineticFrictionCoefficientTolerance_ratio,
                  2
                )}
                toleranceWhy="Sliding friction is usually lower than static friction, but printed ABS surface finish makes it uncertain."
                onValueChange={(coefficient) => {
                  updateInput("kineticFrictionCoefficient_ratio", coefficient)
                }}
                onToleranceChange={(tolerance) => {
                  updateInput(
                    "kineticFrictionCoefficientTolerance_ratio",
                    tolerance
                  )
                }}
              />
              <ValueWithToleranceField
                id="minimumReliableChuteAcceleration_mps2"
                label={
                  <InfoLabel why="Used as a reliability check for shallow chutes where ideal math may say motion happens but the real marble may stick or chatter.">
                    Minimum reliable acceleration
                  </InfoLabel>
                }
                unit="m/s^2"
                value={formatNumber(
                  modelInput.minimumReliableChuteAcceleration_mps2,
                  2
                )}
                toleranceId="minimumReliableChuteAccelerationTolerance_mps2"
                toleranceValue={formatNumber(
                  modelInput.minimumReliableChuteAccelerationTolerance_mps2,
                  2
                )}
                toleranceWhy="This catches shallow chutes where real marbles may stick, chatter, or need a nudge despite ideal math."
                onValueChange={(acceleration_mps2) => {
                  updateInput(
                    "minimumReliableChuteAcceleration_mps2",
                    acceleration_mps2
                  )
                }}
                onToleranceChange={(tolerance_mps2) => {
                  updateInput(
                    "minimumReliableChuteAccelerationTolerance_mps2",
                    tolerance_mps2
                  )
                }}
              />
              <ValueWithToleranceField
                id="rollingInertiaFactor_ratio"
                label={
                  <InfoLabel why="Converts gravity along the chute into rolling acceleration and relates chute speed to marble spin. A solid sphere is 5/7.">
                    Rolling inertia
                  </InfoLabel>
                }
                value={formatNumber(modelInput.rollingInertiaFactor_ratio, 3)}
                toleranceId="rollingInertiaFactorTolerance_ratio"
                toleranceValue={formatNumber(
                  modelInput.rollingInertiaFactorTolerance_ratio,
                  3
                )}
                toleranceWhy="For a solid sphere this is essentially 5/7, so the tolerance stays tiny unless the marble is unusual."
                onValueChange={(factor) => {
                  updateInput("rollingInertiaFactor_ratio", factor)
                }}
                onToleranceChange={(tolerance) => {
                  updateInput("rollingInertiaFactorTolerance_ratio", tolerance)
                }}
              />
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Impact</FieldLegend>
            <FieldGroup>
              <ValueWithToleranceField
                id="spinTransferEfficiency_ratio"
                label={
                  <InfoLabel why="Controls how much surface slip at impact is converted into marble spin and tangential bounce speed.">
                    Impact spin transfer
                  </InfoLabel>
                }
                value={formatNumber(modelInput.spinTransferEfficiency_ratio, 2)}
                toleranceId="spinTransferEfficiencyTolerance_ratio"
                toleranceValue={formatNumber(
                  modelInput.spinTransferEfficiencyTolerance_ratio,
                  2
                )}
                toleranceWhy="Use this as the expected repeatability after tuning this drum's impact response."
                onValueChange={(efficiency) => {
                  updateInput("spinTransferEfficiency_ratio", efficiency)
                }}
                onToleranceChange={(tolerance) => {
                  updateInput(
                    "spinTransferEfficiencyTolerance_ratio",
                    tolerance
                  )
                }}
              />
              <ValueWithToleranceField
                id="impactRestitutionCoefficient_ratio"
                label={
                  <InfoLabel why="Controls the normal bounce. Higher values return more speed away from the drum surface after impact.">
                    Impact restitution
                  </InfoLabel>
                }
                value={formatNumber(
                  modelInput.impactRestitutionCoefficient_ratio,
                  2
                )}
                toleranceId="impactRestitutionCoefficientTolerance_ratio"
                toleranceValue={formatNumber(
                  modelInput.impactRestitutionCoefficientTolerance_ratio,
                  2
                )}
                toleranceWhy="Use this as variation around a measured or tuned bounce response for this drum."
                onValueChange={(coefficient) => {
                  updateInput("impactRestitutionCoefficient_ratio", coefficient)
                }}
                onToleranceChange={(tolerance) => {
                  updateInput(
                    "impactRestitutionCoefficientTolerance_ratio",
                    tolerance
                  )
                }}
              />
              <ValueWithToleranceField
                id="impactFrictionCoefficient_ratio"
                label={
                  <InfoLabel why="Controls how much tangential speed is lost during contact with the drum head.">
                    Impact friction
                  </InfoLabel>
                }
                value={formatNumber(
                  modelInput.impactFrictionCoefficient_ratio,
                  2
                )}
                toleranceId="impactFrictionCoefficientTolerance_ratio"
                toleranceValue={formatNumber(
                  modelInput.impactFrictionCoefficientTolerance_ratio,
                  2
                )}
                toleranceWhy="Use this as variation around a measured or tuned tangential response for this drum."
                onValueChange={(coefficient) => {
                  updateInput("impactFrictionCoefficient_ratio", coefficient)
                }}
                onToleranceChange={(tolerance) => {
                  updateInput(
                    "impactFrictionCoefficientTolerance_ratio",
                    tolerance
                  )
                }}
              />
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
      </TabsContent>
    </Tabs>
  )
}

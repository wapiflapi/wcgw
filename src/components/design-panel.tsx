import { Info } from "@phosphor-icons/react"

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
import { getSphereMass_g, isMassWithinRelativeTolerance } from "@/model/marble"
import type { ModelInput } from "@/model/model"
import { degToRad, mToMm, mmToM, msToS, radToDeg, sToMs } from "@/model/units"

type DesignPanelProps = {
  modelInput: ModelInput
  onModelInputChange: (modelInput: ModelInput) => void
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

export function DesignPanel({
  modelInput,
  onModelInputChange,
}: DesignPanelProps) {
  function updateInput(key: keyof ModelInput, value: number) {
    onModelInputChange({
      ...modelInput,
      [key]: value,
    })
  }

  function updateInputs(updates: Partial<Record<keyof ModelInput, number>>) {
    onModelInputChange(
      Object.entries(updates).reduce<ModelInput>(
        (nextModelInput, [key, value]) => ({
          ...nextModelInput,
          [key]: value,
        }),
        modelInput
      )
    )
  }

  const gravity_mps2 = modelInput.gravity_mps2
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
                    Normal impact speed
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
            <FieldLegend>Ramp</FieldLegend>
            <SliderField
              id="rampAngle_deg"
              label={
                <InfoLabel why="Sets the ramp direction and how much gravity accelerates the marble along the ramp before launch.">
                  Ramp angle
                </InfoLabel>
              }
              unit="deg"
              value={radToDeg(modelInput.rampAngle_rad)}
              min={-90}
              max={0}
              step={1}
              inverted
              onChange={(angle_deg) => {
                updateInput("rampAngle_rad", degToRad(angle_deg))
              }}
            />
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
                updateInput("drumTiltAngle_rad", degToRad(angle_deg))
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
                  updateInput("drumPivotAngleRange_rad", degToRad(angle_deg))
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
                    degToRad(tolerance_deg)
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
                  <InfoLabel why="Used for free-fall conversions, blueprint solving, ramp acceleration, and ballistic trajectories.">
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
            <FieldLegend>Impact</FieldLegend>
            <FieldGroup>
              <ValueWithToleranceField
                id="drumComplianceFactor_ratio"
                label={
                  <InfoLabel why="A placeholder calibration factor for how much the drum head flexes during contact. It is carried through the model for the contact math.">
                    Drum compliance
                  </InfoLabel>
                }
                value={formatNumber(modelInput.drumComplianceFactor_ratio, 2)}
                toleranceId="drumComplianceFactorTolerance_ratio"
                toleranceValue={formatNumber(
                  modelInput.drumComplianceFactorTolerance_ratio,
                  2
                )}
                toleranceWhy="Snare head flex and tension are very uncertain, so this gets a deliberately wide range."
                onValueChange={(factor) => {
                  updateInput("drumComplianceFactor_ratio", factor)
                }}
                onToleranceChange={(tolerance) => {
                  updateInput("drumComplianceFactorTolerance_ratio", tolerance)
                }}
              />
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
                toleranceWhy="Spin transfer through a short hit on a vibrating membrane is hard to estimate without measuring it."
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
                toleranceWhy="A steel marble on a flexible drum head can bounce very differently depending on head tension and impact speed."
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
                toleranceWhy="Impact friction on a moving drum membrane is a guesstimate, not a stable material table value."
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

          <FieldSet>
            <FieldLegend>Friction & Losses</FieldLegend>
            <FieldGroup>
              <ValueWithToleranceField
                id="rampEnergyEfficiency_ratio"
                label={
                  <InfoLabel why="Scales the ideal rolling acceleration along the ramp. Lower values mean more energy lost before launch.">
                    Ramp efficiency
                  </InfoLabel>
                }
                value={formatNumber(modelInput.rampEnergyEfficiency_ratio, 2)}
                toleranceId="rampEnergyEfficiencyTolerance_ratio"
                toleranceValue={formatNumber(
                  modelInput.rampEnergyEfficiencyTolerance_ratio,
                  2
                )}
                toleranceWhy="A 3D printed ABS ramp can lose energy through roughness, layer lines, seams, and a messy launch."
                onValueChange={(efficiency) => {
                  updateInput("rampEnergyEfficiency_ratio", efficiency)
                }}
                onToleranceChange={(tolerance) => {
                  updateInput("rampEnergyEfficiencyTolerance_ratio", tolerance)
                }}
              />
              <ValueWithToleranceField
                id="staticFrictionCoefficient_ratio"
                label={
                  <InfoLabel why="Used to decide whether the marble can roll without slipping on the ramp.">
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
                  <InfoLabel why="Used when the marble is sliding on the ramp. It sets the sliding acceleration and spin-up rate.">
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
                id="minimumReliableRampAcceleration_mps2"
                label={
                  <InfoLabel why="Used as a reliability check for shallow ramps where ideal math may say motion happens but the real marble may stick or chatter.">
                    Minimum reliable acceleration
                  </InfoLabel>
                }
                unit="m/s^2"
                value={formatNumber(
                  modelInput.minimumReliableRampAcceleration_mps2,
                  2
                )}
                toleranceId="minimumReliableRampAccelerationTolerance_mps2"
                toleranceValue={formatNumber(
                  modelInput.minimumReliableRampAccelerationTolerance_mps2,
                  2
                )}
                toleranceWhy="This catches shallow ramps where real marbles may stick, chatter, or need a nudge despite ideal math."
                onValueChange={(acceleration_mps2) => {
                  updateInput(
                    "minimumReliableRampAcceleration_mps2",
                    acceleration_mps2
                  )
                }}
                onToleranceChange={(tolerance_mps2) => {
                  updateInput(
                    "minimumReliableRampAccelerationTolerance_mps2",
                    tolerance_mps2
                  )
                }}
              />
              <ValueWithToleranceField
                id="rollingInertiaFactor_ratio"
                label={
                  <InfoLabel why="Converts gravity along the ramp into rolling acceleration and relates ramp speed to marble spin. A solid sphere is 5/7.">
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
        </FieldGroup>
      </TabsContent>
    </Tabs>
  )
}

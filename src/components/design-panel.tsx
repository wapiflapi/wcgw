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
                label="Diameter"
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
                label="Mass"
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
                label="Same as dropping from"
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
                label="Target total time"
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
            <FieldLegend>Loudness</FieldLegend>
            <FieldRowCompact>
              <NumberField
                id="loudnessDropHeight_mm"
                label="Same as dropping from"
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
                label="Normal impact speed"
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
              label="Ramp angle"
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
              label="Tilt angle"
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

      <TabsContent value="simulation">
        <FieldGroup className="gap-4">
          <FieldSet>
            <FieldLegend>Drum Pivot</FieldLegend>
            <FieldGroup>
              <SliderField
                id="drumPivotAngleRange_deg"
                label="Pivot angle range"
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
                label="Pivot arm length"
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
            <FieldLegend>Tolerances</FieldLegend>
            <FieldRow>
              <NumberField
                id="targetReleaseToImpactTimeTolerance_ms"
                label="Timing tolerance"
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
                label="Positional tolerance"
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
                label="Linear tolerance"
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
                label="Angular tolerance"
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
                above the {formatNumber(
                  sToMs(Math.abs(modelInput.targetReleaseToImpactTimeTolerance_s)),
                  2
                )}{" "}
                ms timing tolerance.
              </FieldError>
            )}
          </FieldSet>

          <FieldSet>
            <FieldLegend>Friction & Losses</FieldLegend>
            <FieldRow>
              <NumberField
                id="staticFrictionCoefficient_ratio"
                label="Static friction"
                unit="mu"
                value={formatNumber(
                  modelInput.staticFrictionCoefficient_ratio,
                  2
                )}
                onChange={(coefficient) => {
                  updateInput("staticFrictionCoefficient_ratio", coefficient)
                }}
              />
              <NumberField
                id="kineticFrictionCoefficient_ratio"
                label="Kinetic friction"
                unit="mu"
                value={formatNumber(
                  modelInput.kineticFrictionCoefficient_ratio,
                  2
                )}
                onChange={(coefficient) => {
                  updateInput("kineticFrictionCoefficient_ratio", coefficient)
                }}
              />
              <NumberField
                id="rampEnergyEfficiency_ratio"
                label="Ramp efficiency"
                value={formatNumber(modelInput.rampEnergyEfficiency_ratio, 2)}
                onChange={(efficiency) => {
                  updateInput("rampEnergyEfficiency_ratio", efficiency)
                }}
              />
              <NumberField
                id="rollingInertiaFactor_ratio"
                label="Rolling inertia"
                value={formatNumber(modelInput.rollingInertiaFactor_ratio, 2)}
                onChange={(factor) => {
                  updateInput("rollingInertiaFactor_ratio", factor)
                }}
              />
              <NumberField
                id="minimumReliableRampAcceleration_mps2"
                label="Minimum reliable acceleration"
                unit="m/s^2"
                value={formatNumber(
                  modelInput.minimumReliableRampAcceleration_mps2,
                  2
                )}
                onChange={(acceleration_mps2) => {
                  updateInput(
                    "minimumReliableRampAcceleration_mps2",
                    acceleration_mps2
                  )
                }}
              />
              <NumberField
                id="gravity_mps2"
                label="Gravity"
                unit="m/s^2"
                value={formatNumber(gravity_mps2, 2)}
                onChange={(gravity) => {
                  updateInput("gravity_mps2", gravity)
                }}
              />
              <NumberField
                id="marbleDensity_kgpm3"
                label="Marble density"
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
            <FieldRow>
              <NumberField
                id="impactRestitutionCoefficient_ratio"
                label="Impact restitution"
                value={formatNumber(
                  modelInput.impactRestitutionCoefficient_ratio,
                  2
                )}
                onChange={(coefficient) => {
                  updateInput("impactRestitutionCoefficient_ratio", coefficient)
                }}
              />
              <NumberField
                id="impactFrictionCoefficient_ratio"
                label="Impact friction"
                value={formatNumber(
                  modelInput.impactFrictionCoefficient_ratio,
                  2
                )}
                onChange={(coefficient) => {
                  updateInput("impactFrictionCoefficient_ratio", coefficient)
                }}
              />
              <NumberField
                id="spinTransferEfficiency_ratio"
                label="Impact spin transfer"
                value={formatNumber(modelInput.spinTransferEfficiency_ratio, 2)}
                onChange={(efficiency) => {
                  updateInput("spinTransferEfficiency_ratio", efficiency)
                }}
              />
              <NumberField
                id="drumComplianceFactor_ratio"
                label="Drum compliance"
                value={formatNumber(modelInput.drumComplianceFactor_ratio, 2)}
                onChange={(factor) => {
                  updateInput("drumComplianceFactor_ratio", factor)
                }}
              />
            </FieldRow>
          </FieldSet>
        </FieldGroup>
      </TabsContent>
    </Tabs>
  )
}

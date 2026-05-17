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
  function updateNominal(key: keyof ModelInput, nominal: number) {
    onModelInputChange({
      ...modelInput,
      [key]: {
        ...modelInput[key],
        nominal,
      },
    })
  }

  function updateNominals(updates: Partial<Record<keyof ModelInput, number>>) {
    onModelInputChange(
      Object.entries(updates).reduce<ModelInput>(
        (nextModelInput, [key, nominal]) => ({
          ...nextModelInput,
          [key]: {
            ...nextModelInput[key as keyof ModelInput],
            nominal,
          },
        }),
        modelInput
      )
    )
  }

  const gravity_mps2 = modelInput.gravity_mps2.nominal
  const expectedMarbleMass_g = getSphereMass_g(
    modelInput.marbleDiameter_m.nominal,
    modelInput.marbleDensity_kgpm3.nominal
  )
  const expectedMarbleMassMin_g = expectedMarbleMass_g * 0.9
  const expectedMarbleMassMax_g = expectedMarbleMass_g * 1.1
  const isMarbleMassExpected = isMassWithinRelativeTolerance(
    modelInput.marbleMass_g.nominal,
    expectedMarbleMass_g,
    0.1
  )

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
                value={formatNumber(
                  mToMm(modelInput.marbleDiameter_m.nominal),
                  0
                )}
                onChange={(diameter_mm) => {
                  const diameter_m = mmToM(diameter_mm)

                  updateNominals({
                    marbleDiameter_m: diameter_m,
                    marbleMass_g: getSphereMass_g(
                      diameter_m,
                      modelInput.marbleDensity_kgpm3.nominal
                    ),
                  })
                }}
              />
              <NumberField
                id="marbleMass_g"
                label="Mass"
                unit="g"
                value={formatNumber(modelInput.marbleMass_g.nominal, 0)}
                onChange={(mass_g) => {
                  updateNominal("marbleMass_g", mass_g)
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
                      modelInput.targetReleaseToImpactTime_s.nominal,
                      gravity_mps2
                    )
                  ),
                  0
                )}
                onChange={(height_mm) => {
                  updateNominal(
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
                  sToMs(modelInput.targetReleaseToImpactTime_s.nominal),
                  3
                )}
                onChange={(time_ms) => {
                  updateNominal("targetReleaseToImpactTime_s", msToS(time_ms))
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
                      modelInput.targetNormalImpactSpeed_mps.nominal,
                      gravity_mps2
                    )
                  ),
                  0
                )}
                onChange={(height_mm) => {
                  updateNominal(
                    "targetNormalImpactSpeed_mps",
                    getFreeFallSpeedFromHeight_m(mmToM(height_mm), gravity_mps2)
                  )
                }}
              />
              <NumberField
                id="targetNormalImpactSpeed_mps"
                label="Normal impact speed"
                unit="m/s"
                value={formatNumber(
                  modelInput.targetNormalImpactSpeed_mps.nominal,
                  4
                )}
                onChange={(speed_mps) => {
                  updateNominal("targetNormalImpactSpeed_mps", speed_mps)
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
              value={radToDeg(modelInput.rampAngle_rad.nominal)}
              min={-90}
              max={0}
              step={1}
              inverted
              onChange={(angle_deg) => {
                updateNominal("rampAngle_rad", degToRad(angle_deg))
              }}
            />
          </FieldSet>

          <FieldSet>
            <FieldLegend>Drum</FieldLegend>
            <SliderField
              id="drumTiltAngle_deg"
              label="Tilt angle"
              unit="deg"
              value={radToDeg(modelInput.drumTiltAngle_rad.nominal)}
              min={-45}
              max={0}
              step={0.1}
              inverted
              onChange={(angle_deg) => {
                updateNominal("drumTiltAngle_rad", degToRad(angle_deg))
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
                id="drumPivotAngle_deg"
                label="Pivot angle"
                unit="deg"
                value={radToDeg(modelInput.drumPivotAngle_rad.nominal)}
                min={-90}
                max={0}
                step={1}
                inverted
                onChange={(angle_deg) => {
                  updateNominal("drumPivotAngle_rad", degToRad(angle_deg))
                }}
              />
              <SliderField
                id="drumPivotArmLength_mm"
                label="Pivot arm length"
                unit="mm"
                value={mToMm(modelInput.drumPivotArmLength_m.nominal)}
                min={0}
                max={1000}
                step={1}
                onChange={(length_mm) => {
                  updateNominal("drumPivotArmLength_m", mmToM(length_mm))
                }}
              />
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Manufacturing</FieldLegend>
            <FieldRow>
              <NumberField
                id="manufacturingPositionTolerance_mm"
                label="Positional tolerance"
                prefix="±"
                unit="mm"
                value={formatNumber(
                  mToMm(modelInput.manufacturingPositionTolerance_m.nominal),
                  2
                )}
                onChange={(tolerance_mm) => {
                  updateNominal(
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
                  mToMm(modelInput.manufacturingLinearTolerance_m.nominal),
                  2
                )}
                onChange={(tolerance_mm) => {
                  updateNominal(
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
                  radToDeg(modelInput.manufacturingAngleTolerance_rad.nominal),
                  2
                )}
                onChange={(tolerance_deg) => {
                  updateNominal(
                    "manufacturingAngleTolerance_rad",
                    degToRad(tolerance_deg)
                  )
                }}
              />
            </FieldRow>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Friction & Losses</FieldLegend>
            <FieldRow>
              <NumberField
                id="staticFrictionCoefficient_ratio"
                label="Static friction"
                unit="mu"
                value={formatNumber(
                  modelInput.staticFrictionCoefficient_ratio.nominal,
                  2
                )}
                onChange={(coefficient) => {
                  updateNominal("staticFrictionCoefficient_ratio", coefficient)
                }}
              />
              <NumberField
                id="rampEnergyEfficiency_ratio"
                label="Ramp efficiency"
                value={formatNumber(
                  modelInput.rampEnergyEfficiency_ratio.nominal,
                  2
                )}
                onChange={(efficiency) => {
                  updateNominal("rampEnergyEfficiency_ratio", efficiency)
                }}
              />
              <NumberField
                id="rollingInertiaFactor_ratio"
                label="Rolling inertia"
                value={formatNumber(
                  modelInput.rollingInertiaFactor_ratio.nominal,
                  2
                )}
                onChange={(factor) => {
                  updateNominal("rollingInertiaFactor_ratio", factor)
                }}
              />
              <NumberField
                id="gravity_mps2"
                label="Gravity"
                unit="m/s^2"
                value={formatNumber(gravity_mps2, 2)}
                onChange={(gravity) => {
                  updateNominal("gravity_mps2", gravity)
                }}
              />
              <NumberField
                id="marbleDensity_kgpm3"
                label="Marble density"
                unit="kg/m^3"
                value={formatNumber(modelInput.marbleDensity_kgpm3.nominal, 0)}
                onChange={(density_kgpm3) => {
                  updateNominal("marbleDensity_kgpm3", density_kgpm3)
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
                  modelInput.impactRestitutionCoefficient_ratio.nominal,
                  2
                )}
                onChange={(coefficient) => {
                  updateNominal(
                    "impactRestitutionCoefficient_ratio",
                    coefficient
                  )
                }}
              />
              <NumberField
                id="impactFrictionCoefficient_ratio"
                label="Impact friction"
                value={formatNumber(
                  modelInput.impactFrictionCoefficient_ratio.nominal,
                  2
                )}
                onChange={(coefficient) => {
                  updateNominal("impactFrictionCoefficient_ratio", coefficient)
                }}
              />
              <NumberField
                id="spinTransferEfficiency_ratio"
                label="Impact spin transfer"
                value={formatNumber(
                  modelInput.spinTransferEfficiency_ratio.nominal,
                  2
                )}
                onChange={(efficiency) => {
                  updateNominal("spinTransferEfficiency_ratio", efficiency)
                }}
              />
              <NumberField
                id="drumComplianceFactor_ratio"
                label="Drum compliance"
                value={formatNumber(
                  modelInput.drumComplianceFactor_ratio.nominal,
                  2
                )}
                onChange={(factor) => {
                  updateNominal("drumComplianceFactor_ratio", factor)
                }}
              />
            </FieldRow>
          </FieldSet>
        </FieldGroup>
      </TabsContent>
    </Tabs>
  )
}

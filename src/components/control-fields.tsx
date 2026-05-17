import { useState } from "react"

import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Slider } from "@/components/ui/slider"
import { formatNumber } from "@/lib/format"

type NumberFieldProps = {
  id: string
  label: string
  prefix?: string
  unit?: string
  value?: string
  defaultValue?: string
  onChange?: (value: number) => void
}

type SliderFieldProps = {
  id: string
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  inverted?: boolean
  onChange: (value: number) => void
}

function getNumberStep(value: string) {
  const numericValue = Math.abs(Number(value))

  if (!Number.isFinite(numericValue) || numericValue < 10) {
    return 0.01
  }

  if (numericValue < 50) {
    return 1
  }

  return 10 ** Math.max(1, Math.floor(Math.log10(numericValue)) - 1)
}

export function NumberField({
  id,
  label,
  prefix,
  unit,
  value,
  defaultValue,
  onChange,
}: NumberFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState("")
  const inputValue = isEditing ? draftValue : (value ?? defaultValue ?? "")
  const step = getNumberStep(inputValue)

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        {prefix ? (
          <InputGroupAddon align="inline-start">
            <InputGroupText>{prefix}</InputGroupText>
          </InputGroupAddon>
        ) : null}
        <InputGroupInput
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={inputValue}
          onBlur={() => {
            setIsEditing(false)
          }}
          onChange={
            onChange
              ? (event) => {
                  const nextDraftValue = event.currentTarget.value
                  const nextValue = event.currentTarget.valueAsNumber

                  setIsEditing(true)
                  setDraftValue(nextDraftValue)

                  if (Number.isFinite(nextValue)) {
                    onChange(nextValue)
                  }
                }
              : undefined
          }
          onFocus={() => {
            setIsEditing(true)
            setDraftValue(value ?? defaultValue ?? "")
          }}
        />
        {unit ? (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{unit}</InputGroupText>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </Field>
  )
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 xs:grid-cols-2">{children}</div>
}

export function FieldRowCompact({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 xs:grid-cols-[minmax(0,1fr)_8rem]">
      {children}
    </div>
  )
}

export function FieldRowSm({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

function SliderHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 xs:grid-cols-[minmax(0,1fr)_8rem]">
      {children}
    </div>
  )
}

export function SliderField({
  id,
  label,
  unit,
  value,
  min,
  max,
  step,
  inverted = false,
  onChange,
}: SliderFieldProps) {
  const digits = step < 1 ? 1 : 0
  const sliderValue = inverted ? max + min - value : value

  return (
    <Field>
      <SliderHeader>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <NumberField
          id={id}
          label=""
          unit={unit}
          value={formatNumber(value, digits)}
          onChange={onChange}
        />
      </SliderHeader>
      <Slider
        value={[sliderValue]}
        min={min}
        max={max}
        step={step}
        onValueChange={(nextValue) => {
          const rawValue = Array.isArray(nextValue)
            ? (nextValue[0] ?? min)
            : nextValue

          onChange(inverted ? max + min - rawValue : rawValue)
        }}
      />
    </Field>
  )
}

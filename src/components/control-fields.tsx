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
  onChange: (value: number) => void
}

export function NumberField({
  id,
  label,
  unit,
  value,
  defaultValue,
  onChange,
}: NumberFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState("")
  const inputValue = isEditing ? draftValue : (value ?? defaultValue ?? "")

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={id}
          type="number"
          inputMode="decimal"
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
  onChange,
}: SliderFieldProps) {
  const digits = step < 1 ? 1 : 0

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
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(nextValue) => {
          onChange(Array.isArray(nextValue) ? (nextValue[0] ?? min) : nextValue)
        }}
      />
    </Field>
  )
}

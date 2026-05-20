import { useEffect, useRef, useState } from "react"

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
  label: React.ReactNode
  prefix?: string
  unit?: string
  value?: string
  defaultValue?: string
  onChange?: (value: number) => void
}

type SliderFieldProps = {
  id: string
  label: React.ReactNode
  unit: string
  value: number
  min: number
  max: number
  step: number
  inverted?: boolean
  virtualMax?: number
  onChange: (value: number) => void
}

function getNumberStep(value: string) {
  const numericValue = Math.abs(Number(value))

  if (!Number.isFinite(numericValue) || numericValue < 10) {
    return 0.01
  }

  if (numericValue < 100) {
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
      <FieldLabel className="w-full" htmlFor={id}>
        {label}
      </FieldLabel>
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
  virtualMax,
  onChange,
}: SliderFieldProps) {
  const frameRef = useRef<number | null>(null)
  const [localState, setLocalState] = useState({
    externalValue: value,
    isSliding: false,
    value,
  })
  const digits = step < 1 ? 1 : 0
  let localValue = localState.value

  if (!localState.isSliding && localState.externalValue !== value) {
    localValue = value
    setLocalState({
      externalValue: value,
      isSliding: false,
      value,
    })
  }

  const displayValue = Math.min(max, Math.max(min, localValue))
  const sliderValue = inverted ? max + min - displayValue : displayValue
  const virtualRange = (virtualMax ?? max) - min
  const sliderRange = max - min
  const sliderWidthPercent =
    virtualRange > 0
      ? Math.min(100, Math.max(0, (sliderRange / virtualRange) * 100))
      : 100

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  function commitValue(nextValue: number) {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    onChange(nextValue)
  }

  function queueValue(nextValue: number) {
    setLocalState({
      externalValue: value,
      isSliding: true,
      value: nextValue,
    })

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
    }

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      onChange(nextValue)
    })
  }

  return (
    <Field>
      <SliderHeader>
        <FieldLabel className="w-full" htmlFor={id}>
          {label}
        </FieldLabel>
        <NumberField
          id={id}
          label=""
          unit={unit}
          value={formatNumber(displayValue, digits)}
          onChange={(nextValue) => {
            const clampedValue = Math.min(max, Math.max(min, nextValue))

            setLocalState({
              externalValue: value,
              isSliding: false,
              value: clampedValue,
            })
            commitValue(clampedValue)
          }}
        />
      </SliderHeader>
      <div
        className="flex w-full"
        style={{ justifyContent: inverted ? "end" : "start" }}
      >
        <Slider
          className="shrink-0"
          value={[sliderValue]}
          min={min}
          max={max}
          step={step}
          style={{ width: `${sliderWidthPercent}%` }}
          onValueChange={(nextValue) => {
            const rawValue = Array.isArray(nextValue)
              ? (nextValue[0] ?? min)
              : nextValue
            const nextDisplayValue = inverted ? max + min - rawValue : rawValue

            queueValue(Math.min(max, Math.max(min, nextDisplayValue)))
          }}
          onValueCommitted={(nextValue) => {
            const rawValue = Array.isArray(nextValue)
              ? (nextValue[0] ?? min)
              : nextValue
            const nextDisplayValue = inverted ? max + min - rawValue : rawValue
            const clampedValue = Math.min(max, Math.max(min, nextDisplayValue))

            setLocalState({
              externalValue: value,
              isSliding: false,
              value: clampedValue,
            })
            commitValue(clampedValue)
          }}
        />
      </div>
    </Field>
  )
}

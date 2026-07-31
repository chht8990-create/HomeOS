import {
  useState,
  type ComponentProps,
  type FocusEvent,
} from 'react'
import {
  normalizePositiveIntegerDraft,
  normalizePositiveIntegerInput,
} from '../../services/integerInputEngine'
import Input from './Input'

type PositiveIntegerInputProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'value' | 'onChange' | 'min' | 'max'
> & {
  value: number
  onValueChange: (value: number) => void
  defaultValue: number
  min?: number
  max?: number
}

function PositiveIntegerInput({
  value,
  onValueChange,
  defaultValue,
  min = 1,
  max,
  onFocus,
  onBlur,
  ...inputProps
}: PositiveIntegerInputProps) {
  const [draftValue, setDraftValue] =
    useState<string | null>(null)
  const normalizationOptions = {
    defaultValue,
    min,
    ...(max === undefined ? {} : { max }),
  }

  function handleFocus(
    event: FocusEvent<HTMLInputElement>,
  ) {
    const input = event.currentTarget

    setDraftValue(String(value))
    input.select()
    window.requestAnimationFrame(() => {
      if (document.activeElement === input) {
        input.select()
      }
    })
    onFocus?.(event)
  }

  function handleBlur(
    event: FocusEvent<HTMLInputElement>,
  ) {
    const committedValue =
      normalizePositiveIntegerInput(
        draftValue ?? value,
        normalizationOptions,
      )

    setDraftValue(null)
    onValueChange(committedValue)
    onBlur?.(event)
  }

  return (
    <Input
      {...inputProps}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draftValue ?? String(value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={(event) => {
        const nextDraftValue =
          normalizePositiveIntegerDraft(
            event.currentTarget.value,
            normalizationOptions,
          )

        setDraftValue(nextDraftValue)

        if (nextDraftValue !== '') {
          onValueChange(Number(nextDraftValue))
        }
      }}
    />
  )
}

export default PositiveIntegerInput

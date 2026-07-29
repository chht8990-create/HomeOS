import type { ComponentProps } from 'react'
import { normalizePositiveIntegerInput } from '../../services/integerInputEngine'
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
  ...inputProps
}: PositiveIntegerInputProps) {
  return (
    <Input
      {...inputProps}
      type="number"
      inputMode="numeric"
      step={1}
      min={min}
      max={max}
      value={String(value)}
      onChange={(event) => {
        const normalizedValue =
          normalizePositiveIntegerInput(
            event.currentTarget.value,
            {
              defaultValue,
              min,
              ...(max === undefined ? {} : { max }),
            },
          )

        event.currentTarget.value = String(normalizedValue)
        onValueChange(normalizedValue)
      }}
    />
  )
}

export default PositiveIntegerInput

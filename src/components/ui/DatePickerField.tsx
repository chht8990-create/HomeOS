import {
  useId,
  type InputHTMLAttributes,
} from 'react'
import { CalendarDays } from 'lucide-react'

type DatePickerFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label: string
  description?: string
  error?: string
  containerClassName?: string
  labelHidden?: boolean
}

function DatePickerField({
  label,
  description,
  error,
  containerClassName = '',
  className = '',
  labelHidden = false,
  id,
  ...inputProps
}: DatePickerFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId =
    description || error
      ? `${inputId}-message`
      : undefined
  const containerClasses = [
    'ui-field',
    error ? 'ui-field--error' : '',
    containerClassName,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <label
      className={containerClasses}
      htmlFor={inputId}
    >
      <span
        className={`ui-field__label ${
          labelHidden ? 'ui-visually-hidden' : ''
        }`}
      >
        {label}
      </span>

      <span className="ui-date-control">
        <CalendarDays
          className="ui-date-control__icon"
          size={18}
          strokeWidth={2.1}
          aria-hidden="true"
        />
        <input
          {...inputProps}
          id={inputId}
          type="date"
          className={`ui-input ui-date-input ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
        />
      </span>

      {error || description ? (
        <span
          id={messageId}
          className="ui-field__message"
        >
          {error ?? description}
        </span>
      ) : null}
    </label>
  )
}

export default DatePickerField

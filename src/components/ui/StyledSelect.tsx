import {
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'

export type StyledSelectProps =
  SelectHTMLAttributes<HTMLSelectElement> & {
    label: string
    children: ReactNode
    description?: string
    error?: string
    containerClassName?: string
    labelHidden?: boolean
  }

function StyledSelect({
  label,
  children,
  description,
  error,
  containerClassName = '',
  className = '',
  labelHidden = false,
  id,
  ...selectProps
}: StyledSelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const messageId =
    description || error
      ? `${selectId}-message`
      : undefined
  const classes = ['ui-select', className]
    .filter(Boolean)
    .join(' ')
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
      htmlFor={selectId}
    >
      <span
        className={`ui-field__label ${
          labelHidden ? 'ui-visually-hidden' : ''
        }`}
      >
        {label}
      </span>

      <span className="ui-select-control">
        <select
          {...selectProps}
          id={selectId}
          className={classes}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
        >
          {children}
        </select>
        <ChevronDown
          className="ui-select-control__icon"
          size={18}
          strokeWidth={2.2}
          aria-hidden="true"
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

export default StyledSelect

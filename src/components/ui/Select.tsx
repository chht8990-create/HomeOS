import {
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'

type SelectProps =
  SelectHTMLAttributes<HTMLSelectElement> & {
    label: string
    children: ReactNode
    description?: string
    error?: string
    containerClassName?: string
  }

function Select({
  label,
  children,
  description,
  error,
  containerClassName = '',
  className = '',
  id,
  ...selectProps
}: SelectProps) {
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
      <span className="ui-field__label">{label}</span>

      <select
        {...selectProps}
        id={selectId}
        className={classes}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
      >
        {children}
      </select>

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

export default Select

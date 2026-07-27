import {
  useId,
  type InputHTMLAttributes,
} from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  description?: string
  error?: string
  containerClassName?: string
}

function Input({
  label,
  description,
  error,
  containerClassName = '',
  className = '',
  id,
  ...inputProps
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const messageId =
    description || error ? `${inputId}-message` : undefined
  const classes = ['ui-input', className]
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
      htmlFor={inputId}
    >
      <span className="ui-field__label">{label}</span>

      <input
        {...inputProps}
        id={inputId}
        className={classes}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
      />

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

export default Input

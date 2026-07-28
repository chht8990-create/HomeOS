import {
  useId,
  type TextareaHTMLAttributes,
} from 'react'

type TextareaProps =
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label: string
    description?: string
    error?: string
    containerClassName?: string
  }

function Textarea({
  label,
  description,
  error,
  containerClassName = '',
  className = '',
  id,
  ...textareaProps
}: TextareaProps) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const messageId =
    description || error
      ? `${textareaId}-message`
      : undefined
  const classes = ['ui-textarea', className]
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
      htmlFor={textareaId}
    >
      <span className="ui-field__label">{label}</span>

      <textarea
        {...textareaProps}
        id={textareaId}
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

export default Textarea

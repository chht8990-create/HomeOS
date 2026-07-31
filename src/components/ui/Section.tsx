import {
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useId, type ReactNode } from 'react'

type SectionProps = {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  className?: string
  collapsible?: boolean
  collapsed?: boolean
  onToggle?: () => void
}

function Section({
  title,
  description,
  children,
  action,
  className = '',
  collapsible = false,
  collapsed = false,
  onToggle,
}: SectionProps) {
  const classes = ['ui-section', className]
    .filter(Boolean)
    .join(' ')

  const contentId = useId()
  const heading = (
    <>
      <div>
        <h2 className="ui-section-title">{title}</h2>

        {description ? (
          <p className="ui-section-description">{description}</p>
        ) : null}
      </div>

      {action ? <div className="ui-section-action">{action}</div> : null}
      {collapsible ? (
        <span className="ui-section-toggle-label">
          {collapsed ? '보기' : '접기'}
          {collapsed ? (
            <ChevronDown
              size={18}
              aria-hidden="true"
            />
          ) : (
            <ChevronUp
              size={18}
              aria-hidden="true"
            />
          )}
        </span>
      ) : null}
    </>
  )

  return (
    <section className={classes}>
      {collapsible ? (
        <button
          type="button"
          className="ui-section-header ui-section-header--toggle"
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={onToggle}
        >
          {heading}
        </button>
      ) : (
        <div className="ui-section-header">{heading}</div>
      )}

      <div
        id={contentId}
        className="ui-section-content"
        hidden={collapsible && collapsed}
      >
        {children}
      </div>
    </section>
  )
}

export default Section

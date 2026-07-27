import type { ReactNode } from 'react'

type SectionProps = {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}

function Section({
  title,
  description,
  children,
  action,
  className = '',
}: SectionProps) {
  const classes = ['ui-section', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes}>
      <div className="ui-section-header">
        <div>
          <h2 className="ui-section-title">{title}</h2>

          {description ? (
            <p className="ui-section-description">{description}</p>
          ) : null}
        </div>

        {action ? <div className="ui-section-action">{action}</div> : null}
      </div>

      <div className="ui-section-content">{children}</div>
    </section>
  )
}

export default Section

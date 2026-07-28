import type { ReactNode } from 'react'

type ScreenHeaderProps = {
  title: string
  eyebrow?: string
  description?: string
  action?: ReactNode
}

function ScreenHeader({
  title,
  eyebrow = '오늘식탁',
  description,
  action,
}: ScreenHeaderProps) {
  return (
    <header className="ui-screen-header">
      <div className="ui-screen-header__content">
        <p className="ui-screen-header__eyebrow">
          <img
            className="ui-screen-header__brand-icon"
            src="/brand/today-table-icon-192.png"
            alt=""
          />
          {eyebrow}
        </p>
        <h1 className="ui-screen-header__title">{title}</h1>

        {description ? (
          <p className="ui-screen-header__description">{description}</p>
        ) : null}
      </div>

      {action ? (
        <div className="ui-screen-header__action">{action}</div>
      ) : null}
    </header>
  )
}

export default ScreenHeader

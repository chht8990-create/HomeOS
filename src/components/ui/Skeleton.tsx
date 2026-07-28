import type { HTMLAttributes } from 'react'

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  lines?: number
}

function Skeleton({
  lines = 3,
  className = '',
  ...skeletonProps
}: SkeletonProps) {
  const safeLineCount = Math.max(1, Math.floor(lines))
  const classes = ['ui-skeleton', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      {...skeletonProps}
      className={classes}
      aria-hidden="true"
    >
      {Array.from(
        { length: safeLineCount },
        (_, index) => (
          <span
            key={index}
            className="ui-skeleton__line"
          />
        ),
      )}
    </div>
  )
}

export default Skeleton

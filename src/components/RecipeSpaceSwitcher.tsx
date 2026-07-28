type RecipeSpace = 'planner' | 'recipes'

type RecipeSpaceSwitcherProps = {
  activeSpace: RecipeSpace
  onOpenPlanner: () => void
  onOpenRecipes: () => void
}

function RecipeSpaceSwitcher({
  activeSpace,
  onOpenPlanner,
  onOpenRecipes,
}: RecipeSpaceSwitcherProps) {
  const items: {
    value: RecipeSpace
    label: string
    onSelect: () => void
  }[] = [
    {
      value: 'planner',
      label: '이번 주 식사',
      onSelect: onOpenPlanner,
    },
    {
      value: 'recipes',
      label: '레시피',
      onSelect: onOpenRecipes,
    },
  ]

  return (
    <nav
      className="recipe-space-switcher"
      aria-label="식사와 레시피 전환"
    >
      {items.map((item) => {
        const isActive = activeSpace === item.value

        return (
          <button
            key={item.value}
            type="button"
            className={
              isActive
                ? 'recipe-space-switcher__item recipe-space-switcher__item--active'
                : 'recipe-space-switcher__item'
            }
            aria-current={isActive ? 'page' : undefined}
            onClick={
              isActive ? undefined : item.onSelect
            }
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

export default RecipeSpaceSwitcher

import {
  ChefHat,
  CircleUser,
  Home,
  Refrigerator,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react'

export type PageName =
  | 'today'
  | 'mealPlan'
  | 'shopping'
  | 'inventory'
  | 'recipes'
  | 'settings'
  | 'guide'
  | 'feedback'

type BottomNavigationProps = {
  currentPage: PageName
  onChangePage: (page: PageName) => void
}

const navigationItems: {
  page: PageName
  label: string
  icon: LucideIcon
}[] = [
  { page: 'today', label: '홈', icon: Home },
  {
    page: 'recipes',
    label: '레시피',
    icon: ChefHat,
  },
  {
    page: 'shopping',
    label: '장보기',
    icon: ShoppingCart,
  },
  {
    page: 'inventory',
    label: '냉장고',
    icon: Refrigerator,
  },
  {
    page: 'settings',
    label: '더보기',
    icon: CircleUser,
  },
]

function BottomNavigation({
  currentPage,
  onChangePage,
}: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label="주요 메뉴">
      {navigationItems.map((item) => {
        const isActive = currentPage === item.page
        const NavigationIcon = item.icon

        return (
          <button
            key={item.page}
            type="button"
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={
              isActive
                ? undefined
                : () => onChangePage(item.page)
            }
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="nav-item__surface">
              <NavigationIcon
                className="nav-item__icon"
                size={22}
                strokeWidth={isActive ? 2.4 : 2}
                aria-hidden="true"
              />
              <span className="nav-item__label">
                {item.label}
              </span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNavigation

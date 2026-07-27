export type PageName =
  | 'today'
  | 'mealPlan'
  | 'shopping'
  | 'inventory'
  | 'settings'

type BottomNavigationProps = {
  currentPage: PageName
  onChangePage: (page: PageName) => void
}

const navigationItems: {
  page: PageName
  label: string
}[] = [
  { page: 'today', label: '오늘' },
  { page: 'mealPlan', label: '식단' },
  { page: 'shopping', label: '장보기' },
  { page: 'inventory', label: '재고' },
  { page: 'settings', label: '설정' },
]

function BottomNavigation({
  currentPage,
  onChangePage,
}: BottomNavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label="주요 메뉴">
      {navigationItems.map((item) => {
        const isActive = currentPage === item.page

        return (
          <button
            key={item.page}
            type="button"
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onChangePage(item.page)}
          >
            <span aria-hidden="true">{isActive ? '●' : '○'}</span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNavigation
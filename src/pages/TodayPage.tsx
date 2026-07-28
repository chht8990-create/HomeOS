import MealBlock from '../blocks/MealBlock'
import ShoppingSummaryBlock from '../blocks/ShoppingSummaryBlock'
import InventorySummaryBlock from '../blocks/InventorySummaryBlock'
import TodayPlannerSummaryBlock from '../blocks/TodayPlannerSummaryBlock'
import ScreenHeader from '../components/ui/ScreenHeader'
import type { PageName } from '../components/BottomNavigation'

type TodayPageProps = {
  onChangePage: (page: PageName) => void
}

function getTodayDateKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function TodayPage({ onChangePage }: TodayPageProps) {
  const todayDate = getTodayDateKey()

  return (
    <>
      <ScreenHeader
        title="홈"
        description="오늘 식사와 준비할 일을 확인하세요."
      />

      <main className="app-content">
        <MealBlock
          date={todayDate}
          mealType="breakfast"
          title="아침"
          icon="🍳"
        />

        <MealBlock
          date={todayDate}
          mealType="lunch"
          title="점심"
          icon="🍱"
        />

        <MealBlock
          date={todayDate}
          mealType="dinner"
          title="저녁"
          icon="🍲"
        />

        <MealBlock
          date={todayDate}
          mealType="snack"
          title="간식"
          icon="🍓"
        />

        <TodayPlannerSummaryBlock
          date={todayDate}
          onOpenPlanner={() => onChangePage('mealPlan')}
        />

        <ShoppingSummaryBlock
          onOpenShopping={() => onChangePage('shopping')}
        />

        <InventorySummaryBlock
          onOpenInventory={() => onChangePage('inventory')}
        />
      </main>
    </>
  )
}

export default TodayPage

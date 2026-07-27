import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Section from '../components/ui/Section'
import useMealPlan from '../hooks/useMealPlan'
import { getMealPlansForDate } from '../services/mealPlanEngine'
import type { MealType } from '../types/meal'

type TodayPlannerSummaryBlockProps = {
  date: string
  onOpenPlanner: () => void
}

const mealTypeLabels: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

function TodayPlannerSummaryBlock({
  date,
  onOpenPlanner,
}: TodayPlannerSummaryBlockProps) {
  const { mealPlans } = useMealPlan()
  const todayMealPlans = getMealPlansForDate(
    mealPlans,
    date,
  )

  return (
    <Section
      title="오늘 Planner 일정"
      description="날짜별로 계획한 오늘 메뉴를 확인해요."
    >
      <Card>
        {todayMealPlans.length === 0 ? (
          <EmptyState
            icon="📅"
            title="오늘 계획된 식단이 없어요."
            description="식단 Planner에서 오늘 메뉴를 계획해보세요."
            action={
              <Button
                variant="secondary"
                fullWidth
                onClick={onOpenPlanner}
              >
                식단 Planner 열기
              </Button>
            }
          />
        ) : (
          <div className="meal-plan-preview">
            <div
              className="meal-plan-preview__icon"
              aria-hidden="true"
            >
              📅
            </div>

            <div className="meal-plan-preview__content">
              <p className="meal-plan-preview__label">
                오늘 예정된 식단
              </p>

              <h3 className="meal-plan-preview__title">
                {todayMealPlans.length}개 일정이 있어요
              </h3>

              <p className="meal-plan-preview__description">
                {todayMealPlans
                  .map(
                    (mealPlan) =>
                      `${mealTypeLabels[mealPlan.type]} ${mealPlan.name}`,
                  )
                  .join(' · ')}
              </p>
            </div>

            <Button fullWidth onClick={onOpenPlanner}>
              식단 Planner 열기
            </Button>
          </div>
        )}
      </Card>
    </Section>
  )
}

export default TodayPlannerSummaryBlock

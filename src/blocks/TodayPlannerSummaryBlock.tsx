import { CalendarDays } from 'lucide-react'
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
      title="오늘 식사"
      description="오늘 먹을 메뉴를 확인하세요."
    >
      <Card>
        {todayMealPlans.length === 0 ? (
          <EmptyState
            icon={<CalendarDays />}
            title="오늘 식사 일정을 정해 볼까요?"
            description="먹고 싶은 메뉴부터 추가해 보세요."
            action={
              <Button
                variant="secondary"
                fullWidth
                onClick={onOpenPlanner}
              >
                식사 일정 추가
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
                오늘 식사 일정
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
              이번 주 식사 보기
            </Button>
          </div>
        )}
      </Card>
    </Section>
  )
}

export default TodayPlannerSummaryBlock

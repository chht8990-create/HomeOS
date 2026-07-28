import {
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { CalendarDays } from 'lucide-react'
import RecipeRecommendationBlock from '../blocks/RecipeRecommendationBlock'
import type { PageName } from '../components/BottomNavigation'
import RecipeSpaceSwitcher from '../components/RecipeSpaceSwitcher'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import Toast from '../components/ui/Toast'
import useMealPlan from '../hooks/useMealPlan'
import type { MealType, PlannedMeal } from '../types/meal'

const mealTypeOptions: {
  value: MealType
  label: string
}[] = [
  { value: 'breakfast', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'snack', label: '간식' },
]

const mealTypeLabels: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

function getTodayDateKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

type MealPlanPageProps = {
  initialRecipeName?: string
  onChangePage: (page: PageName) => void
  onOpenRecipeDetail: (recipeId: string) => void
}

type MealPlanFeedback = {
  tone: 'success' | 'danger'
  title: string
  message: string
}

function MealPlanPage({
  initialRecipeName,
  onChangePage,
  onOpenRecipeDetail,
}: MealPlanPageProps) {
  const mealNameInputRef =
    useRef<HTMLInputElement>(null)
  const mealPlansSectionRef =
    useRef<HTMLDivElement>(null)
  const {
    mealPlans,
    saveMealPlan,
    deleteMealPlan,
  } = useMealPlan()
  const [date, setDate] = useState(getTodayDateKey)
  const [mealType, setMealType] =
    useState<MealType>('dinner')
  const [mealName, setMealName] = useState(
    initialRecipeName ?? '',
  )
  const [editingId, setEditingId] =
    useState<string | null>(null)
  const [feedback, setFeedback] =
    useState<MealPlanFeedback | null>(null)

  function resetEditor() {
    setMealName('')
    setEditingId(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!date || !mealName.trim()) {
      return
    }

    const savedMealName = mealName.trim()
    const wasEditing = Boolean(editingId)

    try {
      saveMealPlan(
        {
          date,
          type: mealType,
          name: savedMealName,
        },
        editingId ?? undefined,
      )
      resetEditor()
      setFeedback({
        tone: 'success',
        title: wasEditing
          ? '식사 일정을 수정했어요.'
          : '식사 일정을 저장했어요.',
        message: `${savedMealName} 일정을 아래에서 확인해 보세요.`,
      })

      window.requestAnimationFrame(() => {
        mealPlansSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    } catch {
      setFeedback({
        tone: 'danger',
        title: '식사 일정을 저장하지 못했어요.',
        message:
          '잠시 후 다시 시도해 주세요. 입력한 내용은 그대로 두었어요.',
      })
    }
  }

  function startEditing(mealPlan: PlannedMeal) {
    setDate(mealPlan.date)
    setMealType(mealPlan.type)
    setMealName(mealPlan.name)
    setEditingId(mealPlan.id)
    setFeedback(null)
  }

  function handleDelete(mealPlan: PlannedMeal) {
    const shouldDelete = window.confirm(
      `${mealPlan.name} 일정을 삭제할까요?`,
    )

    if (!shouldDelete) {
      return
    }

    deleteMealPlan(mealPlan.id)

    if (editingId === mealPlan.id) {
      resetEditor()
    }
  }

  function focusMealPlanEditor() {
    mealNameInputRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    mealNameInputRef.current?.focus({
      preventScroll: true,
    })
  }

  function handleSelectRecommendedRecipe(
    recipeName: string,
  ) {
    setMealName(recipeName)
    setFeedback(null)

    window.requestAnimationFrame(() => {
      focusMealPlanEditor()
    })
  }

  return (
    <>
      <ScreenHeader
        title="이번 주 식사"
        description="먹을 메뉴를 날짜별로 계획해 보세요."
      />

      <main className="app-content">
        <RecipeSpaceSwitcher
          activeSpace="planner"
          onOpenPlanner={() => undefined}
          onOpenRecipes={() =>
            onChangePage('recipes')
          }
        />

        <Section
          title={editingId ? '식사 일정 수정' : '식사 일정 추가'}
          description="날짜, 식사 시간, 메뉴를 입력하세요."
        >
          <Card>
            <form
              className="inventory-form"
              onSubmit={handleSubmit}
            >
              <div className="inventory-form__row">
                <label className="inventory-form__field">
                  날짜
                  <input
                    type="date"
                    value={date}
                    onChange={(event) =>
                      setDate(event.target.value)
                    }
                    required
                  />
                </label>

                <label className="inventory-form__field">
                  식사 시간
                  <select
                    value={mealType}
                    onChange={(event) =>
                      setMealType(
                        event.target.value as MealType,
                      )
                    }
                  >
                    {mealTypeOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="inventory-form__field">
                메뉴 이름
                <input
                  ref={mealNameInputRef}
                  type="text"
                  value={mealName}
                  onChange={(event) =>
                    setMealName(event.target.value)
                  }
                  placeholder="예: 김치찌개"
                  required
                />
              </label>

              {editingId ? (
                <div className="meal-editor__actions">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={resetEditor}
                  >
                    취소
                  </Button>

                  <Button
                    type="submit"
                    fullWidth
                    disabled={!date || !mealName.trim()}
                  >
                    수정 내용 저장
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  fullWidth
                  disabled={!date || !mealName.trim()}
                >
                  식사 일정 추가
                </Button>
              )}
            </form>
          </Card>
        </Section>

        <div
          ref={mealPlansSectionRef}
          className="meal-plan-schedule"
        >
          <Section
            title="저장된 식사 일정"
            description={`${mealPlans.length}개의 일정이 있어요.`}
          >
            <Card>
              {mealPlans.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays />}
                  title="아직 저장된 식사 일정이 없어요."
                  description="첫 메뉴부터 계획해 보세요."
                  action={
                    <Button onClick={focusMealPlanEditor}>
                      첫 일정 추가
                    </Button>
                  }
                />
              ) : (
                <ul className="inventory-list">
                  {mealPlans.map((mealPlan) => (
                    <li
                      key={mealPlan.id}
                      className="inventory-item"
                    >
                      <div className="inventory-item__content">
                        <div className="inventory-item__top">
                          <strong>{mealPlan.name}</strong>
                          <span className="inventory-item__location">
                            {
                              mealTypeLabels[
                                mealPlan.type
                              ]
                            }
                          </span>
                        </div>

                        <p>
                          <time dateTime={mealPlan.date}>
                            {mealPlan.date}
                          </time>
                        </p>
                      </div>

                      <div className="inventory-item__actions">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            startEditing(mealPlan)
                          }
                        >
                          수정
                        </Button>

                        <Button
                          variant="danger"
                          onClick={() =>
                            handleDelete(mealPlan)
                          }
                        >
                          삭제
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Section>
        </div>

        <RecipeRecommendationBlock
          onSelectRecipe={
            handleSelectRecommendedRecipe
          }
          onViewRecipe={onOpenRecipeDetail}
        />
      </main>

      {feedback ? (
        <Toast
          tone={feedback.tone}
          title={feedback.title}
          onDismiss={() => setFeedback(null)}
        >
          {feedback.message}
        </Toast>
      ) : null}
    </>
  )
}

export default MealPlanPage

import { useState, type FormEvent } from 'react'
import RecipeRecommendationBlock from '../blocks/RecipeRecommendationBlock'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
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

function MealPlanPage() {
  const {
    mealPlans,
    saveMealPlan,
    deleteMealPlan,
  } = useMealPlan()
  const [date, setDate] = useState(getTodayDateKey)
  const [mealType, setMealType] =
    useState<MealType>('dinner')
  const [mealName, setMealName] = useState('')
  const [editingId, setEditingId] =
    useState<string | null>(null)

  function resetEditor() {
    setMealName('')
    setEditingId(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!date || !mealName.trim()) {
      return
    }

    saveMealPlan(
      {
        date,
        type: mealType,
        name: mealName,
      },
      editingId ?? undefined,
    )
    resetEditor()
  }

  function startEditing(mealPlan: PlannedMeal) {
    setDate(mealPlan.date)
    setMealType(mealPlan.type)
    setMealName(mealPlan.name)
    setEditingId(mealPlan.id)
  }

  function handleDelete(mealPlan: PlannedMeal) {
    const shouldDelete = window.confirm(
      `${mealPlan.name} 식단을 삭제할까요?`,
    )

    if (!shouldDelete) {
      return
    }

    deleteMealPlan(mealPlan.id)

    if (editingId === mealPlan.id) {
      resetEditor()
    }
  }

  return (
    <>
      <ScreenHeader
        title="식단 계획"
        description="날짜와 식사 시간별로 메뉴를 계획해 보세요."
      />

      <main className="app-content">
        <Section
          title={editingId ? '식단 수정' : '식단 추가'}
          description="같은 날짜와 식사 시간에 저장하면 기존 계획을 수정합니다."
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
                  식사
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
                메뉴
                <input
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
                    수정 저장
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  fullWidth
                  disabled={!date || !mealName.trim()}
                >
                  식단 저장
                </Button>
              )}
            </form>
          </Card>
        </Section>

        <RecipeRecommendationBlock
          onSelectRecipe={setMealName}
        />

        <Section
          title="저장된 식단"
          description={`${mealPlans.length}개의 계획이 있습니다.`}
        >
          <Card>
            {mealPlans.length === 0 ? (
              <EmptyState
                icon="🍽️"
                title="아직 계획한 식단이 없어요."
                description="날짜와 메뉴를 선택해 첫 식단을 저장해 보세요."
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
                          {mealTypeLabels[mealPlan.type]}
                        </span>
                      </div>

                      <p>
                        <time dateTime={mealPlan.date}>
                          {mealPlan.date}
                        </time>
                      </p>
                    </div>

                    <div>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          startEditing(mealPlan)
                        }
                      >
                        수정
                      </Button>

                      <Button
                        variant="ghost"
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
      </main>
    </>
  )
}

export default MealPlanPage

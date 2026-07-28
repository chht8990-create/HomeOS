import { Utensils } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Section from '../components/ui/Section'
import useMeal from '../hooks/useMeal'
import type { MealType } from '../types/meal'

type MealBlockProps = {
  date: string
  mealType: MealType
  title: string
  icon: string
}

function MealBlock({
  date,
  mealType,
  title,
  icon,
}: MealBlockProps) {
  const {
    mealStatus,
    mealName,
    savedMealName,
    canSave,
    startEditing,
    updateMealName,
    saveMeal,
    skipMeal,
    cancelEditing,
    clearMeal,
  } = useMeal({
    date,
    mealType,
  })

  function handleDeleteMeal() {
    const shouldDelete = window.confirm(
      `등록한 ${title} 식사 일정을 삭제할까요?`,
    )

    if (shouldDelete) {
      clearMeal()
    }
  }

  return (
    <Section
      title={title}
      description={`${title} 식사를 정하거나 쉬어갈 수 있어요.`}
    >
      <Card>
        {mealStatus === 'empty' ? (
          <EmptyState
            icon={<Utensils />}
            title={`${title}, 무엇을 먹을까요?`}
            description={`먹고 싶은 ${title} 메뉴부터 정해 보세요.`}
            action={
              <div className="meal-empty-actions">
                <Button fullWidth onClick={startEditing}>
                  {title} 정하기
                </Button>

                <Button
                  variant="ghost"
                  fullWidth
                  onClick={skipMeal}
                >
                  오늘은 안 먹어요
                </Button>
              </div>
            }
          />
        ) : null}

        {mealStatus === 'editing' ? (
          <div className="meal-editor">
            <div className="meal-editor__icon" aria-hidden="true">
              ✍️
            </div>

            <div className="meal-editor__content">
              <label
                className="meal-editor__label"
                htmlFor={`${mealType}-name`}
              >
                {title} 메뉴
              </label>

              <input
                id={`${mealType}-name`}
                className="meal-editor__input"
                type="text"
                value={mealName}
                onChange={(event) => updateMealName(event.target.value)}
                placeholder="예: 김치찌개"
                autoFocus
              />

              <p className="meal-editor__help">
                먹고 싶은 메뉴 이름을 입력하세요.
              </p>
            </div>

            <div className="meal-editor__actions">
              <Button
                variant="secondary"
                fullWidth
                onClick={cancelEditing}
              >
                취소
              </Button>

              <Button
                fullWidth
                onClick={saveMeal}
                disabled={!canSave}
              >
                저장
              </Button>
            </div>
          </div>
        ) : null}

        {mealStatus === 'planned' ? (
          <div className="meal-plan-preview">
            <div className="meal-plan-preview__icon" aria-hidden="true">
              {icon}
            </div>

            <div className="meal-plan-preview__content">
              <p className="meal-plan-preview__label">{title}</p>
              <h3 className="meal-plan-preview__title">
                {savedMealName}
              </h3>
              <p className="meal-plan-preview__description">
                식사 일정에 저장했어요.
              </p>
            </div>

            <div className="meal-plan-preview__actions">
              <Button
                variant="secondary"
                fullWidth
                onClick={startEditing}
              >
                수정
              </Button>

              <Button
                variant="ghost"
                fullWidth
                onClick={handleDeleteMeal}
              >
                삭제
              </Button>
            </div>
          </div>
        ) : null}

        {mealStatus === 'skipped' ? (
          <div className="meal-plan-preview">
            <div className="meal-plan-preview__icon" aria-hidden="true">
              ☕
            </div>

            <div className="meal-plan-preview__content">
              <p className="meal-plan-preview__label">{title}</p>
              <h3 className="meal-plan-preview__title">
                오늘은 쉬어가요
              </h3>
              <p className="meal-plan-preview__description">
                먹지 않는 식사로 편안하게 기록했어요.
              </p>
            </div>

            <div className="meal-plan-preview__actions">
              <Button fullWidth onClick={startEditing}>
                메뉴 정하기
              </Button>

              <Button
                variant="ghost"
                fullWidth
                onClick={clearMeal}
              >
                기록 삭제
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </Section>
  )
}

export default MealBlock

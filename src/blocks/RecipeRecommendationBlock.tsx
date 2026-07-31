import { useState } from 'react'
import {
  BookOpen,
  Lightbulb,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Section from '../components/ui/Section'
import useInventory from '../hooks/useInventory'
import useRecipes from '../hooks/useRecipes'
import { recommendRecipes } from '../services/recommendationEngine'

type RecipeRecommendationBlockProps = {
  onSelectRecipe: (recipeName: string) => void
  onViewRecipe: (recipeId: string) => void
  onOpenInventory: () => void
  collapsed?: boolean
  onToggle?: () => void
}

type RecommendationFilter =
  | 'all'
  | 'available'
  | 'needs-shopping'

const recommendationFilters: {
  value: RecommendationFilter
  label: string
}[] = [
  { value: 'all', label: '전체' },
  { value: 'available', label: '바로 만들 수 있어요' },
  { value: 'needs-shopping', label: '재료가 더 필요해요' },
]

function RecipeRecommendationBlock({
  onSelectRecipe,
  onViewRecipe,
  onOpenInventory,
  collapsed = false,
  onToggle,
}: RecipeRecommendationBlockProps) {
  const [selectedFilter, setSelectedFilter] =
    useState<RecommendationFilter>('all')
  const { items } = useInventory()
  const { recipes } = useRecipes()
  const recommendations = recommendRecipes(
    recipes,
    items,
  )
  const filteredRecommendations =
    recommendations.filter(
      (recommendation) =>
        selectedFilter === 'all' ||
        (selectedFilter === 'available'
          ? recommendation.isInventorySufficient
          : !recommendation.isInventorySufficient),
    )

  const handleRandomRecommendation = () => {
    const selectedRecommendation =
      filteredRecommendations[
        Math.floor(
          Math.random() *
            filteredRecommendations.length,
        )
      ]

    if (selectedRecommendation) {
      onSelectRecipe(
        selectedRecommendation.recipe.name,
      )
    }
  }

  return (
    <Section
      title="저장된 레시피에서 찾기"
      description="냉장고 재료와 저장된 레시피를 비교해 만들기 좋은 메뉴를 찾아드려요."
      collapsible={Boolean(onToggle)}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <Card>
        <div className="ai-recommendation-panel">
          <div className="ai-recommendation-panel__header">
            <div>
              <Badge tone="neutral">
                <BookOpen
                  size={14}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
                저장된 레시피 비교
              </Badge>
              <h3>
                {items.length > 0
                  ? '냉장고 재료와 잘 맞는 레시피를 찾았어요.'
                  : '냉장고 재료를 추가하면 비교할 수 있어요.'}
              </h3>
              <p>
                이 기능은 API를 호출하지 않고 오늘식탁에
                저장된 레시피만 비교해요.
              </p>
            </div>
          </div>
        </div>

        <div className="local-recommendation-heading">
          <Badge tone="neutral">API 미사용</Badge>
          <p>
            기본·가져온·저장된 식단 레시피를 냉장고와
            비교한 결과예요.
          </p>
        </div>

        {items.length > 0 ? (
          <div
            className="recommendation-filters"
            role="group"
            aria-label="저장된 레시피 필터"
          >
            {recommendationFilters.map((filter) => (
              <Button
                key={filter.value}
                className="recommendation-filters__button"
                variant={
                  selectedFilter === filter.value
                    ? 'primary'
                    : 'secondary'
                }
                aria-pressed={
                  selectedFilter === filter.value
                }
                onClick={() =>
                  setSelectedFilter(filter.value)
                }
              >
                {filter.label}
              </Button>
            ))}
          </div>
        ) : null}

        {items.length > 0 ? (
          <Button
            className="recommendation-random-button"
            variant="secondary"
            fullWidth
            disabled={
              filteredRecommendations.length === 0
            }
            onClick={handleRandomRecommendation}
          >
            저장된 레시피에서 찾기
          </Button>
        ) : null}

        {items.length === 0 ? (
          <EmptyState
            icon={<Lightbulb />}
            title="냉장고에 등록된 재료가 없어요."
            description="재료를 추가하면 저장된 레시피 중 만들기 좋은 메뉴를 비교해 드려요."
            action={
              <Button
                variant="secondary"
                onClick={onOpenInventory}
              >
                냉장고에 재료 추가
              </Button>
            }
          />
        ) : filteredRecommendations.length === 0 ? (
          <EmptyState
            icon={<Lightbulb />}
            title={
              recommendations.length === 0
                ? '저장된 레시피가 아직 없어요.'
                : '이 조건에 맞는 저장 레시피가 없어요.'
            }
            description={
              recommendations.length === 0
                ? '기본 레시피를 확인하거나 식사 꾸러미를 가져와 주세요.'
                : '전체를 누르면 부족한 재료가 적은 레시피도 볼 수 있어요.'
            }
            action={
              recommendations.length > 0 &&
              selectedFilter !== 'all' ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setSelectedFilter('all')
                  }
                >
                  모든 메뉴 보기
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="inventory-list">
            {filteredRecommendations.map((recommendation) => (
              <li
                key={recommendation.recipe.id}
                className="inventory-item recommendation-item"
              >
                <div className="inventory-item__content">
                  <div className="inventory-item__top">
                    <strong>
                      {recommendation.recipe.name}
                    </strong>

                    <span className="inventory-item__location">
                      {recommendation.isInventorySufficient
                        ? '지금 만들 수 있어요'
                        : `추가 재료 ${recommendation.missingIngredientCount}개`}
                    </span>
                  </div>

                  <p>
                    {recommendation.isInventorySufficient
                      ? '지금 있는 재료로 만들 수 있어요.'
                      : `재료가 조금 더 필요해요. 더 필요한 재료: ${recommendation.missingIngredients
                          .map(
                            (ingredient) =>
                              `${ingredient.name} ${ingredient.quantity}${ingredient.unit}`,
                          )
                          .join(', ')}`}
                  </p>
                </div>

                <div className="recommendation-item__actions">
                  <Button
                    variant="secondary"
                    aria-label={`${recommendation.recipe.name} 레시피 보기`}
                    onClick={() =>
                      onViewRecipe(
                        recommendation.recipe.id,
                      )
                    }
                  >
                    레시피 보기
                  </Button>
                  <Button
                    aria-label={`${recommendation.recipe.name} 선택`}
                    onClick={() =>
                      onSelectRecipe(
                        recommendation.recipe.name,
                      )
                    }
                  >
                    이 메뉴로 정하기
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

    </Section>
  )
}

export default RecipeRecommendationBlock

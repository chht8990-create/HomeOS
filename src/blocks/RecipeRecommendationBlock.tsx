import { useState } from 'react'
import {
  Lightbulb,
  Sparkles,
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
      title="오늘 메뉴 추천"
      description="냉장고 재료와 저장된 레시피를 기기 안에서 비교해요."
    >
      <Card>
        <div className="ai-recommendation-panel">
          <div className="ai-recommendation-panel__header">
            <div>
              <Badge tone="neutral">
                <Sparkles
                  size={14}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
                냉장고 기반 추천
              </Badge>
              <h3>
                {items.length > 0
                  ? '지금 있는 재료로 메뉴를 골라드려요.'
                  : '추천하려면 냉장고 재료가 필요해요.'}
              </h3>
              <p>
                이 추천은 API를 호출하지 않아요. AI 맞춤
                식단은 위의 7일 무료 체험에서 한 번 만들 수
                있어요.
              </p>
            </div>
          </div>
          {items.length === 0 ? (
            <Button
              variant="secondary"
              onClick={onOpenInventory}
            >
              냉장고에 재료 추가
            </Button>
          ) : null}
        </div>

        <div className="local-recommendation-heading">
          <Badge tone="neutral">기본 추천</Badge>
          <p>
            저장된 레시피와 냉장고 재료를 비교한 결과예요.
          </p>
        </div>

        <div
          className="recommendation-filters"
          role="group"
          aria-label="추천 필터"
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

        <Button
          className="recommendation-random-button"
          variant="secondary"
          fullWidth
          disabled={
            filteredRecommendations.length === 0
          }
          onClick={handleRandomRecommendation}
        >
          메뉴 하나 골라줘
        </Button>

        {filteredRecommendations.length === 0 ? (
          <EmptyState
            icon={<Lightbulb />}
            title={
              recommendations.length === 0
                ? '추천할 메뉴가 아직 없어요.'
                : '지금 조건에 맞는 메뉴가 없어요.'
            }
            description={
              recommendations.length === 0
                ? '레시피가 생기면 냉장고 속 재료에 맞춰 골라드릴게요.'
                : '다른 기준을 눌러 오늘의 메뉴를 찾아보세요.'
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
                        ? '바로 만들어요'
                        : `더 필요해요 ${recommendation.missingIngredientCount}개`}
                    </span>
                  </div>

                  <p>
                    {recommendation.isInventorySufficient
                      ? '지금 있는 재료로 만들 수 있어요.'
                      : `더 필요한 재료: ${recommendation.missingIngredients
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

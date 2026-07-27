import { useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Section from '../components/ui/Section'
import useInventory from '../hooks/useInventory'
import useRecipes from '../hooks/useRecipes'
import { recommendRecipes } from '../services/recommendationEngine'

type RecipeRecommendationBlockProps = {
  onSelectRecipe: (recipeName: string) => void
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
  { value: 'available', label: '재고로 바로 가능' },
  { value: 'needs-shopping', label: '재료 구매 필요' },
]

function RecipeRecommendationBlock({
  onSelectRecipe,
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
      title="재고 기반 메뉴 추천"
      description="집에 있는 재료와 부족한 재료를 비교했어요."
    >
      <Card>
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
          하나 골라줘
        </Button>

        {filteredRecommendations.length === 0 ? (
          <EmptyState
            icon="💡"
            title={
              recommendations.length === 0
                ? '추천할 수 있는 메뉴가 없어요.'
                : '조건에 맞는 추천이 없어요.'
            }
            description={
              recommendations.length === 0
                ? 'Recipe가 추가되면 재고를 기준으로 추천해드릴게요.'
                : '다른 필터를 선택해 추천 메뉴를 확인해보세요.'
            }
          />
        ) : (
          <ul className="inventory-list">
            {filteredRecommendations.map((recommendation) => (
              <li
                key={recommendation.recipe.id}
                className="inventory-item"
              >
                <div className="inventory-item__content">
                  <div className="inventory-item__top">
                    <strong>
                      {recommendation.recipe.name}
                    </strong>

                    <span className="inventory-item__location">
                      {recommendation.isInventorySufficient
                        ? '바로 가능'
                        : `부족 ${recommendation.missingIngredientCount}개`}
                    </span>
                  </div>

                  <p>
                    {recommendation.isInventorySufficient
                      ? '현재 재고만으로 만들 수 있어요.'
                      : `부족: ${recommendation.missingIngredients
                          .map(
                            (ingredient) =>
                              `${ingredient.name} ${ingredient.quantity}${ingredient.unit}`,
                          )
                          .join(', ')}`}
                  </p>
                </div>

                <Button
                  variant="secondary"
                  aria-label={`${recommendation.recipe.name} 선택`}
                  onClick={() =>
                    onSelectRecipe(
                      recommendation.recipe.name,
                    )
                  }
                >
                  선택
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Section>
  )
}

export default RecipeRecommendationBlock

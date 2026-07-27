import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Section from '../components/ui/Section'
import { recipes } from '../data/recipes'
import useInventory from '../hooks/useInventory'
import { recommendRecipes } from '../services/recommendationEngine'

type RecipeRecommendationBlockProps = {
  onSelectRecipe: (recipeName: string) => void
}

function RecipeRecommendationBlock({
  onSelectRecipe,
}: RecipeRecommendationBlockProps) {
  const { items } = useInventory()
  const recommendations = recommendRecipes(
    recipes,
    items,
  )

  return (
    <Section
      title="재고 기반 메뉴 추천"
      description="집에 있는 재료와 부족한 재료를 비교했어요."
    >
      <Card>
        {recommendations.length === 0 ? (
          <EmptyState
            icon="💡"
            title="추천할 수 있는 메뉴가 없어요."
            description="Recipe가 추가되면 재고를 기준으로 추천해드릴게요."
          />
        ) : (
          <ul className="inventory-list">
            {recommendations.map((recommendation) => (
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

import { useState } from 'react'
import {
  Clock3,
  Lightbulb,
  ShoppingCart,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import Select from '../components/ui/Select'
import Section from '../components/ui/Section'
import Spinner from '../components/ui/Spinner'
import Toast from '../components/ui/Toast'
import useInventory from '../hooks/useInventory'
import useRecipes from '../hooks/useRecipes'
import useShoppingList from '../hooks/useShoppingList'
import {
  AiRecipeRecommendationError,
  requestAiRecipeRecommendations,
} from '../services/aiRecipeRecommendationClient'
import { recommendRecipes } from '../services/recommendationEngine'
import type { AiRecipeRecommendation } from '../types/aiRecipeRecommendation'
import type { Ingredient } from '../types/ingredient'

type RecipeRecommendationBlockProps = {
  onSelectRecipe: (recipeName: string) => void
  onViewRecipe: (recipeId: string) => void
}

type RecommendationFilter =
  | 'all'
  | 'available'
  | 'needs-shopping'

type AiRequestState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'not-configured'

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
}: RecipeRecommendationBlockProps) {
  const [selectedFilter, setSelectedFilter] =
    useState<RecommendationFilter>('all')
  const { items } = useInventory()
  const { recipes } = useRecipes()
  const { addIngredientItems } = useShoppingList()
  const [aiRequestState, setAiRequestState] =
    useState<AiRequestState>('idle')
  const [aiRecommendations, setAiRecommendations] =
    useState<AiRecipeRecommendation[]>([])
  const [aiMessage, setAiMessage] = useState('')
  const [aiRequestCount, setAiRequestCount] =
    useState(0)
  const [servings, setServings] = useState(2)
  const [
    shoppingFeedback,
    setShoppingFeedback,
  ] = useState<string | null>(null)
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

  async function handleAiRecommendationRequest() {
    if (
      aiRequestState === 'loading' ||
      items.length === 0
    ) {
      return
    }

    setAiRequestState('loading')
    setAiMessage('')
    setShoppingFeedback(null)
    setAiRequestCount((count) => count + 1)

    try {
      const response =
        await requestAiRecipeRecommendations({
          inventoryItems: items.map(
            ({ name, quantity, unit }) => ({
              name,
              quantity,
              unit,
            }),
          ),
          servings,
        })

      setAiRecommendations(
        response.recommendations,
      )
      setAiRequestState('success')
    } catch (error) {
      const recommendationError =
        error instanceof AiRecipeRecommendationError
          ? error
          : null

      if (
        recommendationError?.code ===
        'AI_NOT_CONFIGURED'
      ) {
        setAiRequestState('not-configured')
        setAiMessage(
          'AI 추천 설정이 필요해요. 기존 추천은 계속 사용할 수 있어요.',
        )
        return
      }

      setAiRequestState('error')
      setAiMessage(
        recommendationError?.message ??
          'AI 추천을 불러오지 못했어요. 기존 추천은 계속 사용할 수 있어요.',
      )
    }
  }

  function handleAddMissingIngredients(
    recommendation: AiRecipeRecommendation,
  ) {
    const ingredients: Ingredient[] =
      recommendation.missingIngredients.map(
        (ingredient, index) => ({
          id: `ai-missing-${index}`,
          ...ingredient,
        }),
      )
    const addedItemCount =
      addIngredientItems(ingredients)

    if (addedItemCount > 0) {
      setShoppingFeedback(
        `${recommendation.title}에 필요한 재료 ${addedItemCount}개를 장보기 목록에 추가했어요.`,
      )
    }
  }

  return (
    <Section
      title="오늘 메뉴 추천"
      description="냉장고 재료로 AI 추천을 받거나 저장된 레시피를 확인하세요."
    >
      <Card>
        <div className="ai-recommendation-panel">
          <div className="ai-recommendation-panel__header">
            <div>
              <Badge tone="primary">
                <Sparkles
                  size={14}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
                AI 추천
              </Badge>
              <h3>냉장고 재료로 AI 메뉴 추천받기</h3>
              <p>
                재료 이름, 수량, 단위만 전송하며 추천 결과는
                저장하지 않아요.
              </p>
            </div>

            <span className="ai-recommendation-panel__limit">
              최대 3개 추천
            </span>
          </div>

          <div className="ai-recommendation-controls">
            <Select
              label="기준 인원"
              value={servings}
              onChange={(event) =>
                setServings(Number(event.target.value))
              }
              disabled={aiRequestState === 'loading'}
            >
              <option value={2}>2인분</option>
              <option value={4}>4인분</option>
              <option value={6}>6인분</option>
            </Select>

            <Button
              fullWidth
              disabled={
                items.length === 0 ||
                aiRequestState === 'loading'
              }
              onClick={handleAiRecommendationRequest}
            >
              {aiRequestState === 'loading'
                ? '추천 메뉴 준비 중'
                : 'AI 메뉴 추천받기'}
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="ai-recommendation-message">
              냉장고에 재료를 하나 이상 넣으면 AI 추천을
              받을 수 있어요.
            </p>
          ) : null}

          {aiRequestCount > 0 ? (
            <p className="ai-recommendation-usage">
              이 화면에서 요청 {aiRequestCount}회 · 같은
              재료의 짧은 반복 요청은 다시 호출하지 않아요.
            </p>
          ) : null}

          {aiRequestState === 'loading' ? (
            <div className="ai-recommendation-loading">
              <Spinner label="재료를 확인하고 있어요" />
              <p>
                추천 메뉴를 준비하고 있어요.
              </p>
            </div>
          ) : null}

          {aiRequestState === 'not-configured' ? (
            <div
              className="ai-recommendation-message ai-recommendation-message--notice"
              role="status"
            >
              <strong>현재 AI 추천을 사용할 수 없어요.</strong>
              <span>{aiMessage}</span>
            </div>
          ) : null}

          {aiRequestState === 'error' ? (
            <div
              className="ai-recommendation-message ai-recommendation-message--error"
              role="alert"
            >
              <strong>AI 추천을 가져오지 못했어요.</strong>
              <span>{aiMessage}</span>
            </div>
          ) : null}

          {aiRequestState === 'success' ? (
            <ul className="ai-recommendation-list">
              {aiRecommendations.map(
                (recommendation, index) => (
                  <li
                    key={`${recommendation.title}-${index}`}
                    className="ai-recommendation-card"
                  >
                    <div className="ai-recommendation-card__title">
                      <div>
                        <Badge tone="primary">
                          AI 생성
                        </Badge>
                        <h4>{recommendation.title}</h4>
                      </div>

                      <div className="ai-recommendation-card__meta">
                        <span>
                          <Clock3
                            size={16}
                            aria-hidden="true"
                          />
                          약{' '}
                          {
                            recommendation.estimatedMinutes
                          }
                          분
                        </span>
                        <span>
                          <UsersRound
                            size={16}
                            aria-hidden="true"
                          />
                          {recommendation.servings}인분
                        </span>
                      </div>
                    </div>

                    <p>{recommendation.summary}</p>

                    <div className="ai-recommendation-ingredients">
                      <strong>필요한 재료</strong>
                      <ul>
                        {recommendation.ingredients.map(
                          (ingredient, ingredientIndex) => (
                            <li
                              key={`${ingredient.name}-${ingredient.unit}-${ingredientIndex}`}
                            >
                              <span>
                                {ingredient.name}{' '}
                                {ingredient.quantity}
                                {ingredient.unit}
                              </span>
                              <Badge
                                tone={
                                  ingredient.available
                                    ? 'success'
                                    : 'warning'
                                }
                              >
                                {ingredient.available
                                  ? '보유'
                                  : '부족'}
                              </Badge>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>

                    <div className="ai-recommendation-missing">
                      <strong>부족한 재료</strong>
                      <p>
                        {recommendation.missingIngredients
                          .length > 0
                          ? recommendation.missingIngredients
                              .map(
                                (ingredient) =>
                                  `${ingredient.name} ${ingredient.quantity}${ingredient.unit}`,
                              )
                              .join(', ')
                          : '지금 있는 재료로 만들 수 있어요.'}
                      </p>
                    </div>

                    <details className="ai-recommendation-steps">
                      <summary>조리 순서 보기</summary>
                      <ol>
                        {recommendation.steps.map(
                          (step, stepIndex) => (
                            <li
                              key={`${recommendation.title}-step-${stepIndex}`}
                            >
                              {step}
                            </li>
                          ),
                        )}
                      </ol>
                    </details>

                    <div className="ai-recommendation-card__actions">
                      <Button
                        onClick={() =>
                          onSelectRecipe(
                            recommendation.title,
                          )
                        }
                      >
                        이번 주 식사에 담기
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={
                          recommendation
                            .missingIngredients.length ===
                          0
                        }
                        onClick={() =>
                          handleAddMissingIngredients(
                            recommendation,
                          )
                        }
                      >
                        <ShoppingCart
                          size={17}
                          aria-hidden="true"
                        />
                        부족한 재료 장보기에 추가
                      </Button>
                    </div>

                    <small className="ai-recommendation-disclaimer">
                      AI 조리 정보는 부정확할 수 있어요.
                      재료 상태와 익힘 정도를 직접 확인해 주세요.
                    </small>
                  </li>
                ),
              )}
            </ul>
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

      {shoppingFeedback ? (
        <Toast
          tone="success"
          title="장보기 목록에 추가했어요."
          onDismiss={() =>
            setShoppingFeedback(null)
          }
        >
          {shoppingFeedback}
        </Toast>
      ) : null}
    </Section>
  )
}

export default RecipeRecommendationBlock

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  BookOpen,
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
import Section from '../components/ui/Section'
import Spinner from '../components/ui/Spinner'
import StyledSelect from '../components/ui/StyledSelect'
import useInventory, {
  readInventoryItems,
} from '../hooks/useInventory'
import useRecipes from '../hooks/useRecipes'
import useShoppingList from '../hooks/useShoppingList'
import {
  AiRecipeRecommendationError,
  requestAiRecipeRecommendations,
} from '../services/aiRecipeRecommendationClient'
import {
  createAiRecommendationFingerprint,
  findMatchingRecipeForAiRecommendation,
  recalculateAiRecommendationForInventory,
} from '../services/aiRecipePersistenceEngine'
import { recommendRecipes } from '../services/recommendationEngine'
import { isWaterIngredientName } from '../services/shoppingIngredientPolicy'
import type { AiRecipeRecommendation } from '../types/aiRecipeRecommendation'
import type { Ingredient } from '../types/ingredient'

export type RecipeSelection = {
  name: string
  recipeId?: string
  servings?: number
}

type RecipeRecommendationBlockProps = {
  onSelectRecipe: (selection: RecipeSelection) => void
  onViewRecipe: (recipeId: string) => void
  onOpenInventory: () => void
  onOpenShopping: () => void
  autoStartAi?: boolean
  onAiStarted?: () => void
  collapsed?: boolean
  onToggle?: () => void
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
  onOpenInventory,
  onOpenShopping,
  autoStartAi = false,
  onAiStarted,
  collapsed = false,
  onToggle,
}: RecipeRecommendationBlockProps) {
  const [selectedFilter, setSelectedFilter] =
    useState<RecommendationFilter>('all')
  const { items } = useInventory()
  const { recipes, saveAiRecommendationAsRecipe } =
    useRecipes()
  const { addMealItems } = useShoppingList()
  const [aiRequestState, setAiRequestState] =
    useState<AiRequestState>('idle')
  const [aiRecommendations, setAiRecommendations] =
    useState<AiRecipeRecommendation[]>([])
  const [aiMessage, setAiMessage] = useState('')
  const [servings, setServings] = useState(2)
  const [shoppingFeedback, setShoppingFeedback] =
    useState('')
  const [expandedAiRecipes, setExpandedAiRecipes] =
    useState<Set<string>>(() => new Set())
  const requestInFlightRef = useRef(false)
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
      onSelectRecipe({
        name: selectedRecommendation.recipe.name,
        recipeId: selectedRecommendation.recipe.id,
        servings:
          selectedRecommendation.recipe.servings,
      })
    }
  }

  const handleAiRecommendationRequest = useCallback(
    async () => {
      if (requestInFlightRef.current || items.length === 0) {
        return
      }

      requestInFlightRef.current = true
      onAiStarted?.()
      setAiRequestState('loading')
      setAiMessage('')
      setShoppingFeedback('')

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

        setAiRecommendations(response.recommendations)
        setAiRequestState('success')
      } catch (error) {
        const recommendationError =
          error instanceof AiRecipeRecommendationError
            ? error
            : null

        setAiRequestState(
          recommendationError?.code === 'AI_NOT_CONFIGURED'
            ? 'not-configured'
            : 'error',
        )
        setAiMessage(
          recommendationError?.message ??
            'AI 추천을 불러오지 못했어요. 저장된 레시피는 계속 확인할 수 있어요.',
        )
      } finally {
        requestInFlightRef.current = false
      }
    },
    [items, onAiStarted, servings],
  )

  useEffect(() => {
    if (!autoStartAi) {
      return
    }

    const timeout = window.setTimeout(() => {
      void handleAiRecommendationRequest()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [autoStartAi, handleAiRecommendationRequest])

  function handleAddMissingIngredients(
    recommendation: AiRecipeRecommendation,
  ) {
    const currentRecommendation =
      recalculateAiRecommendationForInventory(
        recommendation,
        readInventoryItems().map(
          ({ name, quantity, unit }) => ({
            name,
            quantity,
            unit,
          }),
        ),
      )

    if (!currentRecommendation) {
      setShoppingFeedback(
        '장보기 재료를 다시 계산해 주세요.',
      )
      return
    }

    setAiRecommendations((current) =>
      current.map((item) =>
        item === recommendation
          ? currentRecommendation
          : item,
      ),
    )
    const ingredients: Ingredient[] =
      currentRecommendation.missingIngredients.map(
        (ingredient, index) => ({
          id: `ai-recommendation-${index}-${ingredient.name}`,
          ...ingredient,
        }),
      )
    const recommendationSourceId =
      `ai-recommendation:${createAiRecommendationFingerprint(currentRecommendation)}`
    const addedItemCount = addMealItems(
      recommendationSourceId,
      ingredients,
      undefined,
      {
        sourceKind: 'recipe',
        sourceRecipeName: currentRecommendation.title,
        batchId: recommendationSourceId,
      },
    )

    if (addedItemCount > 0) {
      const addedIngredientNames = ingredients
        .map((ingredient) => ingredient.name)
        .join(', ')
      setShoppingFeedback(
        `${recommendation.title}에 필요한 ${addedIngredientNames}을 장보기 목록에 추가했어요.`,
      )
    }
  }

  function handleSelectAiRecommendation(
    recommendation: AiRecipeRecommendation,
  ) {
    const { recipe } =
      saveAiRecommendationAsRecipe(recommendation)

    onSelectRecipe({
      name: recipe.name,
      recipeId: recipe.id,
      servings: recipe.servings,
    })
  }

  function toggleAiRecipe(recipeKey: string) {
    setExpandedAiRecipes((current) => {
      const next = new Set(current)

      if (next.has(recipeKey)) {
        next.delete(recipeKey)
      } else {
        next.add(recipeKey)
      }

      return next
    })
  }

  return (
    <Section
      title="오늘 메뉴 추천"
      description="AI 추천을 받거나 냉장고와 잘 맞는 저장 레시피를 찾아보세요."
      collapsible={Boolean(onToggle)}
      collapsed={collapsed}
      onToggle={onToggle}
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
              <h3>냉장고 재료로 오늘 메뉴 추천받기</h3>
              <p>
                냉장고의 재료 이름·수량·단위를 바탕으로 최대
                3개 메뉴를 추천해요.
              </p>
            </div>
            <span className="ai-recommendation-panel__limit">
              최대 3개
            </span>
          </div>

          {items.length > 0 ? (
            <div className="ai-recommendation-controls">
              <StyledSelect
                label="기준 인원"
                value={servings}
                disabled={aiRequestState === 'loading'}
                onChange={(event) =>
                  setServings(Number(event.target.value))
                }
              >
                <option value={2}>2인분</option>
                <option value={4}>4인분</option>
                <option value={6}>6인분</option>
              </StyledSelect>
              <Button
                fullWidth
                disabled={aiRequestState === 'loading'}
                onClick={() =>
                  void handleAiRecommendationRequest()
                }
              >
                <Sparkles size={18} aria-hidden="true" />
                {aiRequestState === 'loading'
                  ? '추천 준비 중'
                  : 'AI 추천받기'}
              </Button>
            </div>
          ) : (
            <div className="ai-recommendation-message ai-recommendation-message--notice">
              <strong>냉장고에 등록된 재료가 없어요.</strong>
              <span>
                재료를 등록하면 AI가 더 정확하게 추천합니다.
              </span>
              <Button
                variant="secondary"
                onClick={onOpenInventory}
              >
                냉장고에 재료 등록
              </Button>
            </div>
          )}

          {aiRequestState === 'loading' ? (
            <div
              className="ai-recommendation-loading"
              role="status"
            >
              <Spinner label="AI 추천 메뉴 준비 중" />
              <p>냉장고 재료를 확인하고 있어요.</p>
            </div>
          ) : null}

          {aiRequestState === 'not-configured' ||
          aiRequestState === 'error' ? (
            <div
              className={`ai-recommendation-message ${
                aiRequestState === 'not-configured'
                  ? 'ai-recommendation-message--notice'
                  : 'ai-recommendation-message--error'
              }`}
              role="alert"
            >
              <strong>AI 추천을 준비하지 못했어요.</strong>
              <span>{aiMessage}</span>
              <Button
                variant="secondary"
                onClick={() =>
                  void handleAiRecommendationRequest()
                }
              >
                다시 시도
              </Button>
            </div>
          ) : null}

          {aiRequestState === 'success' ? (
            <ul className="ai-recommendation-list">
              {aiRecommendations.map(
                (recommendation, index) => {
                  const recipeKey = `${recommendation.title}-${index}`
                  const expanded =
                    expandedAiRecipes.has(recipeKey)
                  const storedRecipe =
                    findMatchingRecipeForAiRecommendation(
                      recommendation,
                      recipes,
                    )

                  return (
                    <li
                      key={recipeKey}
                      className="ai-recommendation-card"
                    >
                      <div className="ai-recommendation-card__title">
                        <div>
                          <Badge
                            tone={
                              recommendation.missingIngredients
                                .length === 0
                                ? 'success'
                                : 'warning'
                            }
                          >
                            {recommendation.missingIngredients
                              .length === 0
                              ? '지금 만들 수 있어요'
                              : `추가 재료 ${recommendation.missingIngredients.length}개`}
                          </Badge>
                          <h4>{recommendation.title}</h4>
                        </div>
                        <div className="ai-recommendation-card__meta">
                          <span>
                            <Clock3 size={16} aria-hidden="true" />
                            약 {recommendation.estimatedMinutes}분
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

                      {expanded ? (
                        <>
                          <div className="ai-recommendation-ingredients">
                            <strong>필요한 재료</strong>
                            <ul>
                              {recommendation.ingredients.map(
                                (ingredient, ingredientIndex) => {
                                  const isWater =
                                    isWaterIngredientName(
                                      ingredient.name,
                                    )

                                  return (
                                    <li
                                      key={`${recipeKey}-${ingredient.name}-${ingredientIndex}`}
                                    >
                                      <span>
                                        {ingredient.name}{' '}
                                        {ingredient.quantity}
                                        {ingredient.unit}
                                      </span>
                                      <Badge
                                        tone={
                                          isWater
                                            ? 'neutral'
                                            : ingredient.available
                                              ? 'success'
                                              : 'warning'
                                        }
                                      >
                                        {isWater
                                          ? '장보기 제외'
                                          : ingredient.available
                                            ? '보유'
                                            : '부족'}
                                      </Badge>
                                    </li>
                                  )
                                },
                              )}
                            </ul>
                          </div>
                          <div className="ai-recommendation-steps">
                            <strong>간단 조리 순서</strong>
                            <ol>
                              {recommendation.steps.map(
                                (step) => (
                                  <li key={`${recipeKey}-step-${step.order}`}>
                                    <strong>
                                      {step.order}. {step.title}
                                    </strong>
                                    <span>{step.instruction}</span>
                                    <small>
                                      {step.durationMinutes}분 ·{' '}
                                      {step.heatLevel} ·{' '}
                                      {step.completionCue}
                                    </small>
                                  </li>
                                ),
                              )}
                            </ol>
                          </div>
                        </>
                      ) : null}

                      <div className="ai-recommendation-card__actions">
                        <Button
                          variant="secondary"
                          aria-expanded={
                            storedRecipe ? undefined : expanded
                          }
                          onClick={() => {
                            if (storedRecipe) {
                              onViewRecipe(storedRecipe.id)
                              return
                            }

                            toggleAiRecipe(recipeKey)
                          }}
                        >
                          {storedRecipe
                            ? '레시피 보기'
                            : expanded
                              ? '레시피 접기'
                              : '레시피 보기'}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={
                            recommendation.missingIngredients
                              .length === 0
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
                          장보기에 추가
                        </Button>
                        <Button
                          onClick={() =>
                            handleSelectAiRecommendation(
                              recommendation,
                            )
                          }
                        >
                          식단에 담기
                        </Button>
                      </div>

                      <small className="ai-recommendation-disclaimer">
                        AI 조리 정보는 부정확할 수 있어요. 재료
                        상태와 익힘 정도를 직접 확인해 주세요.
                      </small>
                    </li>
                  )
                },
              )}
            </ul>
          ) : null}

          {shoppingFeedback ? (
            <div
              className="ai-recommendation-message ai-recommendation-message--notice"
              role="status"
            >
              <strong>{shoppingFeedback}</strong>
              <Button
                variant="secondary"
                onClick={onOpenShopping}
              >
                장보기 목록 보기
              </Button>
            </div>
          ) : null}
        </div>

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
                      onSelectRecipe({
                        name: recommendation.recipe.name,
                        recipeId: recommendation.recipe.id,
                        servings:
                          recommendation.recipe.servings,
                      })
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

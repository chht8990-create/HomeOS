import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import type { PageName } from '../components/BottomNavigation'
import RecipeSpaceSwitcher from '../components/RecipeSpaceSwitcher'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { getRecipeImage } from '../data/recipeImages'
import useInventory from '../hooks/useInventory'
import useRecipes from '../hooks/useRecipes'
import {
  calculateRecipeReadinessPercent,
  recommendRecipes,
} from '../services/recommendationEngine'
import type { Recipe } from '../types/recipe'
import './RecipePage.css'

type RecipePageProps = {
  initialRecipeId?: string | null
  onChangePage: (page: PageName) => void
  onPlanRecipe: (recipeName: string) => void
}

type RecipePresentation = {
  kicker: string
  description: string
  duration: string
  difficulty: string
  tone: string
}

const recipePresentations: Record<
  string,
  RecipePresentation
> = {
  'kimchi-stew': {
    kicker: '따뜻한 한 그릇',
    description:
      '보글보글 끓여 함께 먹기 좋은 든든한 집밥이에요.',
    duration: '35분',
    difficulty: '쉬움',
    tone: 'kimchi',
  },
  curry: {
    kicker: '오늘의 편안한 메뉴',
    description:
      '향긋한 카레와 포근한 채소가 어우러진 친숙한 한 접시예요.',
    duration: '40분',
    difficulty: '쉬움',
    tone: 'curry',
  },
  'spicy-pork': {
    kicker: '밥이 술술',
    description:
      '매콤달콤한 양념과 부드러운 돼지고기를 센 불에 볶아내요.',
    duration: '30분',
    difficulty: '보통',
    tone: 'pork',
  },
  'soybean-paste-stew': {
    kicker: '구수한 집밥',
    description:
      '된장의 깊은 맛에 두부와 채소를 넉넉히 담은 찌개예요.',
    duration: '30분',
    difficulty: '쉬움',
    tone: 'soybean',
  },
  'egg-fried-rice': {
    kicker: '빠르고 맛있게',
    description:
      '고슬고슬한 밥과 계란으로 금세 완성하는 든든한 한 끼예요.',
    duration: '15분',
    difficulty: '매우 쉬움',
    tone: 'egg',
  },
}

const fallbackTones = [
  'kimchi',
  'curry',
  'pork',
  'soybean',
  'egg',
]

function getPresentation(
  recipe: Recipe,
  index: number,
): RecipePresentation {
  return (
    recipePresentations[recipe.id] ?? {
      kicker: '새로 추가한 레시피',
      description:
        '가져온 재료로 천천히 완성해 보는 새로운 메뉴예요.',
      duration: '30분',
      difficulty: '보통',
      tone:
        fallbackTones[index % fallbackTones.length],
    }
  )
}

function getMissingIngredientMessage(
  missingIngredientNames: string[],
) {
  if (missingIngredientNames.length === 0) {
    return '지금 냉장고 재료로 바로 만들 수 있어요.'
  }

  const [firstIngredient] = missingIngredientNames

  if (missingIngredientNames.length === 1) {
    return `${firstIngredient}만 준비하면 만들 수 있어요.`
  }

  return `${firstIngredient} 외 ${missingIngredientNames.length - 1}가지를 준비하면 만들 수 있어요.`
}

function isMissingIngredient(
  ingredient: Recipe['ingredients'][number],
  missingIngredients: Recipe['ingredients'],
) {
  return missingIngredients.some(
    (missingIngredient) =>
      missingIngredient.name === ingredient.name &&
      missingIngredient.unit === ingredient.unit,
  )
}

type RecipePhotoProps = {
  recipeId: string
  recipeName: string
  tone: string
  size?: 'card' | 'hero'
}

function RecipePhoto({
  recipeId,
  recipeName,
  tone,
  size = 'card',
}: RecipePhotoProps) {
  const imageSource = getRecipeImage(recipeId)

  return (
    <div
      className={`recipe-photo recipe-photo--${tone} recipe-photo--${size} ${
        imageSource ? 'recipe-photo--image' : ''
      }`}
    >
      {imageSource ? (
        <img
          src={imageSource}
          alt={`${recipeName} 음식 사진`}
        />
      ) : (
        <>
          <span
            className="recipe-photo__light"
            aria-hidden="true"
          />
          <span
            className="recipe-photo__plate"
            aria-hidden="true"
          />
          <span
            className="recipe-photo__garnish"
            aria-hidden="true"
          />
          <span className="recipe-photo__label">
            새로 추가한 메뉴
          </span>
        </>
      )}
    </div>
  )
}

function RecipePage({
  initialRecipeId,
  onChangePage,
  onPlanRecipe,
}: RecipePageProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const { recipes } = useRecipes()
  const { items: inventoryItems } = useInventory()
  const recommendations = recommendRecipes(
    recipes,
    inventoryItems,
  )
  const recommendationByRecipeId = new Map(
    recommendations.map((recommendation) => [
      recommendation.recipe.id,
      recommendation,
    ]),
  )
  const [selectedRecipeId, setSelectedRecipeId] =
    useState<string | null>(initialRecipeId ?? null)
  const selectedRecipe = recipes.find(
    (recipe) => recipe.id === selectedRecipeId,
  )

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    })

    const focusFrame = window.requestAnimationFrame(
      () => {
        pageRef.current?.focus({
          preventScroll: true,
        })
      },
    )

    return () => {
      window.cancelAnimationFrame(focusFrame)
    }
  }, [selectedRecipeId])

  if (selectedRecipe) {
    const selectedIndex = recipes.indexOf(selectedRecipe)
    const presentation = getPresentation(
      selectedRecipe,
      selectedIndex,
    )
    const selectedRecommendation =
      recommendationByRecipeId.get(selectedRecipe.id)
    const selectedMissingIngredients =
      selectedRecommendation?.missingIngredients ??
      selectedRecipe.ingredients
    const selectedReadiness =
      calculateRecipeReadinessPercent(
        selectedRecipe.ingredients.length,
        selectedMissingIngredients.length,
      )
    const selectedMissingMessage =
      getMissingIngredientMessage(
        selectedMissingIngredients.map(
          (ingredient) => ingredient.name,
        ),
      )

    return (
      <div
        ref={pageRef}
        className="recipe-page recipe-page--detail"
        role="region"
        aria-label={`${selectedRecipe.name} 레시피 상세`}
        tabIndex={-1}
      >
        <header className="recipe-detail-header">
          <button
            type="button"
            className="recipe-back-button"
            onClick={() => setSelectedRecipeId(null)}
            aria-label="레시피 목록으로 돌아가기"
          >
            <ArrowLeft
              size={20}
              strokeWidth={2.2}
              aria-hidden="true"
            />
            목록
          </button>

          <span className="recipe-detail-header__brand">
            오늘식탁 레시피
          </span>
        </header>

        <main className="recipe-detail">
          <section className="recipe-detail-hero">
            <RecipePhoto
              recipeId={selectedRecipe.id}
              recipeName={selectedRecipe.name}
              tone={presentation.tone}
              size="hero"
            />

            <div className="recipe-detail-hero__content">
              <p className="recipe-kicker">
                {presentation.kicker}
              </p>
              <h1>{selectedRecipe.name}</h1>
              <p>{presentation.description}</p>

              <Button
                className="recipe-detail-hero__plan-action"
                fullWidth
                onClick={() =>
                  onPlanRecipe(selectedRecipe.name)
                }
              >
                이번 주 식사에 담기
              </Button>

              <div className="recipe-readiness">
                <div>
                  <span>재료 준비율</span>
                  <strong className="ui-number">
                    {selectedReadiness}%
                  </strong>
                </div>
                <progress
                  value={selectedReadiness}
                  max={100}
                  aria-label={`${selectedRecipe.name} 조리 가능 ${selectedReadiness}%`}
                />
                <p>{selectedMissingMessage}</p>
              </div>

              <div className="recipe-meta">
                <span>
                  <small>조리 시간</small>
                  <strong>{presentation.duration}</strong>
                </span>
                <span>
                  <small>난이도</small>
                  <strong>{presentation.difficulty}</strong>
                </span>
                <span>
                  <small>재료</small>
                  <strong>
                    {selectedRecipe.ingredients.length}개
                  </strong>
                </span>
              </div>
            </div>
          </section>

          <div className="recipe-detail-grid">
            <section
              className="recipe-detail-section"
              aria-labelledby="recipe-ingredients-title"
            >
              <div className="recipe-detail-section__heading">
                <div>
                  <p className="recipe-kicker">
                    냉장고 재료 기준
                  </p>
                  <h2 id="recipe-ingredients-title">
                    필요한 재료
                  </h2>
                </div>
                <Badge
                  tone={
                    selectedMissingIngredients.length > 0
                      ? 'warning'
                      : 'success'
                  }
                >
                  {selectedMissingIngredients.length > 0
                    ? `부족 ${selectedMissingIngredients.length}가지`
                    : '모두 있음'}
                </Badge>
              </div>

              <ul className="recipe-ingredient-list">
                {selectedRecipe.ingredients.map((ingredient) => {
                  const isMissing = isMissingIngredient(
                    ingredient,
                    selectedMissingIngredients,
                  )

                  return (
                    <li
                      key={ingredient.id}
                      className={
                        isMissing
                          ? 'recipe-ingredient-list__item recipe-ingredient-list__item--missing'
                          : 'recipe-ingredient-list__item recipe-ingredient-list__item--owned'
                      }
                    >
                      <span
                        className="recipe-ingredient-list__status-icon"
                        aria-hidden="true"
                      >
                        {isMissing ? (
                          <AlertCircle
                            size={20}
                            strokeWidth={2.2}
                          />
                        ) : (
                          <CheckCircle2
                            size={20}
                            strokeWidth={2.2}
                          />
                        )}
                      </span>
                      <span className="recipe-ingredient-list__name">
                        <strong>{ingredient.name}</strong>
                        <Badge
                          tone={
                            isMissing
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {isMissing ? '부족' : '보유'}
                        </Badge>
                      </span>
                      <span className="ui-number">
                        {ingredient.quantity}
                        {ingredient.unit}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section
              className="recipe-detail-section recipe-detail-section--guide"
              aria-labelledby="recipe-steps-title"
            >
              <div className="recipe-detail-section__heading">
                <div>
                  <p className="recipe-kicker">
                    조리 전 확인
                  </p>
                  <h2 id="recipe-steps-title">
                    기본 조리 안내
                  </h2>
                </div>
              </div>

              <p className="recipe-guide-note">
                메뉴별 상세 조리법이 아닌 기본 안내예요.
                실제 순서와 시간은 재료 상태에 따라 달라질 수
                있어요.
              </p>

              <ol className="recipe-step-list">
                <li>
                  <span>01</span>
                  <div>
                    <strong>재료를 준비해요</strong>
                    <p>
                      모든 재료를 먹기 좋은 크기로 손질해
                      한곳에 모아두세요.
                    </p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>차근차근 익혀요</strong>
                    <p>
                      단단한 재료부터 넣고 향이 충분히
                      어우러지도록 익혀 주세요.
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>따뜻하게 완성해요</strong>
                    <p>
                      마지막으로 간을 맞추고 가장 맛있는
                      온도에 바로 담아내요.
                    </p>
                  </div>
                </li>
              </ol>
            </section>
          </div>

          <div className="recipe-detail-actions">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setSelectedRecipeId(null)}
            >
              다른 레시피 보기
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const featuredRecipe = recipes[0]
  const remainingRecipes = recipes.slice(1)
  const featuredRecommendation = featuredRecipe
    ? recommendationByRecipeId.get(featuredRecipe.id)
    : undefined
  const featuredReadiness = featuredRecipe
    ? calculateRecipeReadinessPercent(
        featuredRecipe.ingredients.length,
        featuredRecommendation?.missingIngredientCount ??
          featuredRecipe.ingredients.length,
      )
    : 0

  return (
    <div
      ref={pageRef}
      className="recipe-page"
      role="region"
      aria-label="레시피 목록"
      tabIndex={-1}
    >
      <header className="recipe-page-header">
        <div>
          <p className="recipe-page-header__brand">
            오늘식탁 레시피
          </p>
          <h1>오늘은 어떤 메뉴를 만들까요?</h1>
          <p>
            냉장고 재료와 잘 맞는 메뉴를 둘러보세요.
          </p>
        </div>

        <span className="recipe-page-header__count ui-number">
          {recipes.length}
        </span>
      </header>

      <main className="recipe-catalog">
        <RecipeSpaceSwitcher
          activeSpace="recipes"
          onOpenPlanner={() =>
            onChangePage('mealPlan')
          }
          onOpenRecipes={() => undefined}
        />

        {featuredRecipe ? (
          <section
            className="recipe-featured-section"
            aria-labelledby="recipe-featured-title"
          >
            <div className="recipe-section-heading">
              <div>
                <p className="recipe-kicker">
                  추천 메뉴
                </p>
                <h2 id="recipe-featured-title">
                  오늘의 추천 레시피
                </h2>
              </div>
              <Badge
                tone={
                  featuredReadiness === 100
                    ? 'success'
                    : 'warning'
                }
              >
                재료 준비 {featuredReadiness}%
              </Badge>
            </div>

            <button
              type="button"
              className="recipe-featured-card"
              onClick={() =>
                setSelectedRecipeId(featuredRecipe.id)
              }
              aria-label={`${featuredRecipe.name} 레시피 보기`}
            >
              <RecipePhoto
                recipeId={featuredRecipe.id}
                recipeName={featuredRecipe.name}
                tone={
                  getPresentation(featuredRecipe, 0).tone
                }
                size="hero"
              />

              <span className="recipe-featured-card__gradient" />
              <span className="recipe-featured-card__content">
                <span className="recipe-featured-card__eyebrow">
                  {getPresentation(featuredRecipe, 0).kicker}
                </span>
                <strong>{featuredRecipe.name}</strong>
                <span>
                  {getPresentation(featuredRecipe, 0).duration}
                  {' · '}
                  재료 준비율 {featuredReadiness}%
                </span>
              </span>
              <span
                className="recipe-featured-card__arrow"
                aria-hidden="true"
              >
                <ArrowRight
                  size={22}
                  strokeWidth={2.2}
                />
              </span>
            </button>
          </section>
        ) : null}

        <section
          className="recipe-collection"
          aria-labelledby="recipe-collection-title"
        >
          <div className="recipe-section-heading">
            <div>
              <p className="recipe-kicker">오늘식탁 레시피</p>
              <h2 id="recipe-collection-title">
                전체 레시피
              </h2>
            </div>
            <span className="recipe-section-heading__hint">
              {recipes.length}개 메뉴
            </span>
          </div>

          {remainingRecipes.length > 0 ? (
            <div className="recipe-card-grid">
              {remainingRecipes.map((recipe, index) => {
                const recipeIndex = index + 1
                const presentation = getPresentation(
                  recipe,
                  recipeIndex,
                )
                const recommendation =
                  recommendationByRecipeId.get(recipe.id)
                const readiness =
                  calculateRecipeReadinessPercent(
                    recipe.ingredients.length,
                    recommendation?.missingIngredientCount ??
                      recipe.ingredients.length,
                  )
                const missingMessage =
                  getMissingIngredientMessage(
                    recommendation?.missingIngredients.map(
                      (ingredient) => ingredient.name,
                    ) ??
                      recipe.ingredients.map(
                        (ingredient) => ingredient.name,
                      ),
                  )

                return (
                  <article
                    key={recipe.id}
                    className="recipe-card"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRecipeId(recipe.id)
                      }
                      aria-label={`${recipe.name} 레시피 보기`}
                    >
                      <RecipePhoto
                        recipeId={recipe.id}
                        recipeName={recipe.name}
                        tone={presentation.tone}
                      />

                      <span className="recipe-card__body">
                        <span className="recipe-card__meta">
                          <span>{presentation.duration}</span>
                          <span>{presentation.difficulty}</span>
                          <span>준비 {readiness}%</span>
                        </span>
                        <strong>{recipe.name}</strong>
                        <span className="recipe-card__description">
                          {presentation.description}
                        </span>
                        <span className="recipe-card__readiness">
                          {missingMessage}
                        </span>
                      </span>
                    </button>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="recipe-catalog-empty">
              <strong>더 많은 레시피를 준비하고 있어요.</strong>
              <p>
                식사 꾸러미에서 레시피를 추가할 수 있어요.
              </p>
              <Button
                variant="secondary"
                onClick={() =>
                  onChangePage('settings')
                }
              >
                식사 꾸러미 가져오기
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default RecipePage

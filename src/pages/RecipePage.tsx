import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
} from 'lucide-react'
import type { PageName } from '../components/BottomNavigation'
import RecipeSpaceSwitcher from '../components/RecipeSpaceSwitcher'
import Badge from '../components/ui/Badge'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import DatePickerField from '../components/ui/DatePickerField'
import IconButton from '../components/ui/IconButton'
import PositiveIntegerInput from '../components/ui/PositiveIntegerInput'
import StyledSelect from '../components/ui/StyledSelect'
import Toast from '../components/ui/Toast'
import { getRecipeImage } from '../data/recipeImages'
import useHistoryModal from '../hooks/useHistoryModal'
import useInventory from '../hooks/useInventory'
import useMealPlan from '../hooks/useMealPlan'
import useMeasurementPreferences from '../hooks/useMeasurementPreferences'
import useRecipes from '../hooks/useRecipes'
import {
  calculateRecipeReadinessPercent,
  recommendRecipes,
} from '../services/recommendationEngine'
import { readNavigationState } from '../services/appNavigationEngine'
import {
  formatRecipeAmount,
  scaleRecipeAmount,
} from '../services/recipeNormalizationEngine'
import {
  createMeasurementSuggestions,
  type MeasurementIngredient,
} from '../services/measurementEngine'
import type {
  Recipe,
  RecipeIngredient,
  RecipeIngredientGroups,
} from '../types/recipe'
import type { MealType } from '../types/meal'
import './RecipePage.css'

type RecipePageProps = {
  selectedRecipeId?: string | null
  onChangePage: (page: PageName) => void
  onOpenRecipeDetail: (recipeId: string) => void
  onCloseRecipeDetail: () => void
}

type RecipePresentation = {
  kicker: string
  description: string
  duration: string
  difficulty: string
  tone: string
}

type RecipeIngredientStatus =
  | 'missing'
  | 'owned'
  | 'optional'

type RecipePlanFeedback = {
  recipeId: string
  title: string
  message: string
}

const mealTypeOptions: Array<{
  value: MealType
  label: string
}> = [
  { value: 'breakfast', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'snack', label: '간식' },
]

function getTodayDateKey() {
  const today = new Date()

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatRecipePlanFeedback(
  dateKey: string,
  mealType: MealType,
) {
  const [, month, day] = dateKey.split('-').map(Number)
  const mealTypeLabel =
    mealTypeOptions.find(
      (option) => option.value === mealType,
    )?.label ?? '식사'

  return `${month}월 ${day}일 ${mealTypeLabel}에 추가했어요`
}

export function RecipeIngredientStatusBadge({
  status,
}: {
  status: RecipeIngredientStatus
}) {
  const label =
    status === 'missing'
      ? '부족'
      : status === 'owned'
        ? '보유'
        : '선택'
  const tone =
    status === 'missing'
      ? 'warning'
      : status === 'owned'
        ? 'success'
        : 'neutral'

  return (
    <Badge
      className="recipe-ingredient-list__status"
      tone={tone}
      aria-label={`재료 상태: ${label}`}
    >
      {label}
    </Badge>
  )
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
  const totalMinutes =
    recipe.totalTimeMinutes ??
    (typeof recipe.prepMinutes === 'number' &&
    typeof recipe.cookMinutes === 'number'
      ? recipe.prepMinutes + recipe.cookMinutes
      : null)
  const presentation = recipePresentations[recipe.id]

  return {
    kicker: presentation?.kicker ?? '오늘의 집밥',
    description:
      recipe.description ??
      presentation?.description ??
      '준비한 재료의 맛을 살려 차근차근 완성하는 메뉴예요.',
    duration:
      totalMinutes === null
        ? '시간 정보 없음'
        : `${totalMinutes}분`,
    difficulty:
      recipe.difficulty ??
      presentation?.difficulty ??
      (totalMinutes !== null && totalMinutes <= 25
        ? '쉬움'
        : '보통'),
    tone:
      presentation?.tone ??
      fallbackTones[index % fallbackTones.length],
  }
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

const ingredientGroupLabels: Array<{
  key: keyof RecipeIngredientGroups
  label: string
}> = [
  { key: 'mainIngredients', label: '주재료' },
  { key: 'seasoningIngredients', label: '양념' },
  { key: 'brothIngredients', label: '육수·물' },
  { key: 'garnishIngredients', label: '고명' },
  { key: 'optionalIngredients', label: '선택 재료' },
]

function toLegacyIngredient(
  ingredient: RecipeIngredient,
): Recipe['ingredients'][number] {
  return {
    id: ingredient.id,
    name: ingredient.name,
    quantity: ingredient.amount,
    unit: ingredient.unit,
  }
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
          loading={size === 'hero' ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={
            size === 'hero' ? 'high' : 'auto'
          }
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
            오늘의 집밥
          </span>
        </>
      )}
    </div>
  )
}

function RecipePage({
  selectedRecipeId,
  onChangePage,
  onOpenRecipeDetail,
  onCloseRecipeDetail,
}: RecipePageProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const { recipes } = useRecipes()
  const { items: inventoryItems } = useInventory()
  const { saveMealPlan } = useMealPlan()
  const { selectedTools } =
    useMeasurementPreferences()
  const recipePlanModal = useHistoryModal<string>(
    'recipe-meal-plan',
  )
  const measurementModal =
    useHistoryModal<MeasurementIngredient>(
      'recipe-measurement-helper',
    )
  const recommendations = useMemo(
    () => recommendRecipes(recipes, inventoryItems),
    [inventoryItems, recipes],
  )
  const recommendationByRecipeId = useMemo(
    () =>
      new Map(
        recommendations.map((recommendation) => [
          recommendation.recipe.id,
          recommendation,
        ]),
      ),
    [recommendations],
  )
  const [servingsByRecipe, setServingsByRecipe] =
    useState<Record<string, number>>({})
  const [planDate, setPlanDate] =
    useState(getTodayDateKey)
  const [planMealType, setPlanMealType] =
    useState<MealType>('dinner')
  const [planServings, setPlanServings] =
    useState(4)
  const [planError, setPlanError] = useState('')
  const [planFeedback, setPlanFeedback] =
    useState<RecipePlanFeedback | null>(null)
  const selectedRecipe = recipes.find(
    (recipe) => recipe.id === selectedRecipeId,
  )
  const recipeToPlan = recipes.find(
    (recipe) => recipe.id === recipePlanModal.value,
  )
  const measurementSuggestions =
    measurementModal.value
      ? createMeasurementSuggestions(
          measurementModal.value,
          selectedTools,
        )
      : []

  useEffect(() => {
    function clearTransientFeedback(
      event: PopStateEvent,
    ) {
      const nextNavigation = readNavigationState(
        event.state,
        window.location.search,
      )

      if (
        nextNavigation.page !== 'recipes' ||
        nextNavigation.recipeId !==
          selectedRecipeId
      ) {
        setPlanFeedback(null)
      }
    }

    window.addEventListener(
      'popstate',
      clearTransientFeedback,
    )

    return () => {
      window.removeEventListener(
        'popstate',
        clearTransientFeedback,
      )
    }
  }, [selectedRecipeId])

  function handleSaveRecipePlan() {
    if (
      !recipeToPlan ||
      !planDate ||
      planServings < 1
    ) {
      setPlanError(
        '날짜와 식사 시간, 인분을 확인해 주세요.',
      )
      return
    }

    try {
      saveMealPlan({
        date: planDate,
        type: planMealType,
        name: recipeToPlan.name,
        recipeId: recipeToPlan.id,
        servings: planServings,
        source: 'manual',
      })
      setPlanError('')
      setPlanFeedback({
        recipeId: recipeToPlan.id,
        title: formatRecipePlanFeedback(
          planDate,
          planMealType,
        ),
        message: `${recipeToPlan.name} 일정을 저장했어요.`,
      })
      recipePlanModal.closeModal()
    } catch {
      setPlanError(
        '식사 일정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
      )
    }
  }
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
    const baseServings = selectedRecipe.servings ?? 4
    const targetServings =
      servingsByRecipe[selectedRecipe.id] ??
      baseServings
    const ingredientGroups =
      selectedRecipe.ingredientGroups
    const activeRecipeId = selectedRecipe.id

    function updateServings(nextServings: number) {
      setServingsByRecipe((currentServings) => ({
        ...currentServings,
        [activeRecipeId]: Math.min(
          12,
          Math.max(1, nextServings),
        ),
      }))
    }

    function handleOpenPlanDialog() {
      setPlanDate(getTodayDateKey())
      setPlanMealType('dinner')
      setPlanServings(targetServings)
      setPlanError('')
      setPlanFeedback(null)
      recipePlanModal.openModal(activeRecipeId)
    }

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
            onClick={onCloseRecipeDetail}
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
              <p>
                {selectedRecipe.description ??
                  presentation.description}
              </p>

              <Button
                className="recipe-detail-hero__plan-action"
                fullWidth
                onClick={handleOpenPlanDialog}
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
                  <small>준비 · 조리</small>
                  <strong>
                    {selectedRecipe.prepMinutes ??
                      0}
                    분 ·{' '}
                    {selectedRecipe.cookMinutes ??
                      Number.parseInt(
                        presentation.duration,
                        10,
                      )}
                    분
                  </strong>
                </span>
                <span>
                  <small>난이도</small>
                  <strong>
                    {selectedRecipe.difficulty ??
                      presentation.difficulty}
                  </strong>
                </span>
                <span>
                  <small>예상 열량</small>
                  <strong>
                    {selectedRecipe.calories
                      ? `${selectedRecipe.calories} kcal`
                      : '정보 없음'}
                  </strong>
                </span>
              </div>

              <div
                className="recipe-serving-control"
                aria-label="인분 조절"
              >
                <span>
                  <small>재료 계량</small>
                  <strong className="ui-number">
                    {targetServings}인분
                  </strong>
                </span>
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      updateServings(
                        targetServings - 1,
                      )
                    }
                    disabled={targetServings <= 1}
                    aria-label="인분 줄이기"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateServings(
                        targetServings + 1,
                      )
                    }
                    disabled={targetServings >= 12}
                    aria-label="인분 늘리기"
                  >
                    +
                  </button>
                </div>
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

              {ingredientGroups ? (
                <div className="recipe-ingredient-groups">
                  {ingredientGroupLabels.map(
                    ({ key, label }) => {
                      const ingredients =
                        ingredientGroups[key]

                      if (ingredients.length === 0) {
                        return null
                      }

                      const isOptionalGroup =
                        key === 'optionalIngredients'

                      return (
                        <section
                          key={key}
                          className="recipe-ingredient-group"
                          aria-label={label}
                        >
                          <h3>{label}</h3>
                          <ul className="recipe-ingredient-list">
                            {ingredients.map(
                              (ingredient) => {
                                const legacyIngredient =
                                  toLegacyIngredient(
                                    ingredient,
                                  )
                                const isMissing =
                                  !isOptionalGroup &&
                                  isMissingIngredient(
                                    legacyIngredient,
                                    selectedMissingIngredients,
                                  )
                                const scaledAmount =
                                  scaleRecipeAmount(
                                    ingredient.amount,
                                    baseServings,
                                    targetServings,
                                  )

                                return (
                                  <li
                                    key={ingredient.id}
                                    className={
                                      isOptionalGroup
                                        ? 'recipe-ingredient-list__item recipe-ingredient-list__item--optional'
                                        : isMissing
                                          ? 'recipe-ingredient-list__item recipe-ingredient-list__item--missing'
                                          : 'recipe-ingredient-list__item recipe-ingredient-list__item--owned'
                                    }
                                  >
                                    <span className="recipe-ingredient-list__name">
                                      <strong>
                                        {ingredient.name}
                                      </strong>
                                      <RecipeIngredientStatusBadge
                                        status={
                                          isOptionalGroup
                                            ? 'optional'
                                            : isMissing
                                              ? 'missing'
                                              : 'owned'
                                        }
                                      />
                                      {ingredient.note ? (
                                        <small>
                                          {ingredient.note}
                                        </small>
                                      ) : null}
                                    </span>
                                    <span className="recipe-ingredient-list__measurement">
                                      <span className="ui-number">
                                        {formatRecipeAmount(
                                          scaledAmount,
                                          ingredient.unit,
                                        )}
                                        {ingredient.unit}
                                      </span>
                                      <IconButton
                                        variant="ghost"
                                        className="recipe-measurement-button"
                                        aria-label={`${ingredient.name} 계량 방법 보기`}
                                        onClick={() =>
                                          measurementModal.openModal(
                                            {
                                              name: ingredient.name,
                                              amount:
                                                scaledAmount,
                                              unit: ingredient.unit,
                                            },
                                          )
                                        }
                                      >
                                        <Info
                                          size={18}
                                          aria-hidden="true"
                                        />
                                        <span>계량</span>
                                      </IconButton>
                                    </span>
                                  </li>
                                )
                              },
                            )}
                          </ul>
                        </section>
                      )
                    },
                  )}
                </div>
              ) : (
                <ul className="recipe-ingredient-list">
                  {selectedRecipe.ingredients.map(
                    (ingredient) => {
                      const isMissing =
                        isMissingIngredient(
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
                          <span className="recipe-ingredient-list__name">
                            <strong>
                              {ingredient.name}
                            </strong>
                            <RecipeIngredientStatusBadge
                              status={
                                isMissing
                                  ? 'missing'
                                  : 'owned'
                              }
                            />
                          </span>
                          <span className="recipe-ingredient-list__measurement">
                            <span className="ui-number">
                              {formatRecipeAmount(
                                scaleRecipeAmount(
                                  ingredient.quantity,
                                  baseServings,
                                  targetServings,
                                ),
                                ingredient.unit,
                              )}
                              {ingredient.unit}
                            </span>
                            <IconButton
                              variant="ghost"
                              className="recipe-measurement-button"
                              aria-label={`${ingredient.name} 계량 방법 보기`}
                              onClick={() =>
                                measurementModal.openModal(
                                  {
                                    name: ingredient.name,
                                    amount:
                                      scaleRecipeAmount(
                                        ingredient.quantity,
                                        baseServings,
                                        targetServings,
                                      ),
                                    unit: ingredient.unit,
                                  },
                                )
                              }
                            >
                              <Info
                                size={18}
                                aria-hidden="true"
                              />
                              <span>계량</span>
                            </IconButton>
                          </span>
                        </li>
                      )
                    },
                  )}
                </ul>
              )}

              {selectedRecipe.substitutions &&
              selectedRecipe.substitutions.length > 0 ? (
                <div className="recipe-detail-extra">
                  <strong>대체할 수 있어요</strong>
                  <ul>
                    {selectedRecipe.substitutions.map(
                      (substitution) => (
                        <li
                          key={
                            substitution.ingredientName
                          }
                        >
                          {substitution.ingredientName}:{' '}
                          {substitution.alternatives.join(
                            ', ',
                          )}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ) : null}
            </section>

            <section
              className="recipe-detail-section recipe-detail-section--guide"
              aria-labelledby="recipe-steps-title"
            >
              <div className="recipe-detail-section__heading">
                <div>
                  <p className="recipe-kicker">
                    메뉴별 상세 안내
                  </p>
                  <h2 id="recipe-steps-title">
                    {selectedRecipe.steps?.length
                      ? '조리 순서'
                      : '조리 순서가 없어요'}
                  </h2>
                </div>
              </div>

              <p className="recipe-guide-note">
                {selectedRecipe.steps?.length
                  ? '단계별 불 세기와 완성 상태를 함께 확인해 주세요. 재료 상태에 따라 시간은 조금 달라질 수 있어요.'
                  : '가져온 레시피에 상세 조리 순서가 없어 실제 조리법으로 표시하지 않아요.'}
              </p>

              {selectedRecipe.steps?.length ? (
                <ol className="recipe-step-list">
                  {selectedRecipe.steps.map((step) => (
                    <li key={step.order}>
                      <span>
                        {String(step.order).padStart(
                          2,
                          '0',
                        )}
                      </span>
                      <div>
                        <strong className="recipe-step-list__title">
                          {step.title ??
                            `${step.order}단계`}
                        </strong>
                        <span className="recipe-step-list__meta">
                          {step.durationMinutes ??
                            step.minutes}
                          분
                          {' · '}
                          {step.heatLevel ??
                            step.heat ??
                            '불 사용 안 함'}
                        </span>
                        <p>{step.instruction}</p>
                        {step.completionCue ??
                        step.doneness ? (
                          <small>
                            완성 기준:{' '}
                            {step.completionCue ??
                              step.doneness}
                          </small>
                        ) : null}
                        {step.reason ? (
                          <small className="recipe-step-list__reason">
                            이렇게 하는 이유: {step.reason}
                          </small>
                        ) : null}
                        {step.warning ? (
                          <small className="recipe-step-list__warning">
                            주의: {step.warning}
                          </small>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
          </div>

          {selectedRecipe.seasoningAdjustment
              ?.length ||
            selectedRecipe.commonMistakes?.length ||
            selectedRecipe.storage ||
            selectedRecipe.reheating ? (
            <section
              className="recipe-detail-section recipe-detail-section--tips"
              aria-labelledby="recipe-tips-title"
            >
              <div className="recipe-detail-section__heading">
                <div>
                  <p className="recipe-kicker">
                    끝까지 맛있게
                  </p>
                  <h2 id="recipe-tips-title">
                    간 조절·보관 팁
                  </h2>
                </div>
              </div>

              <div className="recipe-tips-grid">
                {selectedRecipe.seasoningAdjustment
                  ?.length ? (
                  <div>
                    <h3>간 조절</h3>
                    <ul>
                      {selectedRecipe.seasoningAdjustment.map(
                        (tip) => (
                          <li key={tip}>{tip}</li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : null}
                {selectedRecipe.commonMistakes
                  ?.length ? (
                  <div>
                    <h3>자주 하는 실수</h3>
                    <ul>
                      {selectedRecipe.commonMistakes.map(
                        (tip) => (
                          <li key={tip}>{tip}</li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : null}
                {selectedRecipe.storage ? (
                  <div>
                    <h3>보관</h3>
                    <p>{selectedRecipe.storage}</p>
                  </div>
                ) : null}
                {selectedRecipe.reheating ? (
                  <div>
                    <h3>다시 데우기</h3>
                    <p>{selectedRecipe.reheating}</p>
                  </div>
                ) : null}
                {selectedRecipe.leftoverIdeas
                  ?.length ? (
                  <div>
                    <h3>남은 음식 활용</h3>
                    <ul>
                      {selectedRecipe.leftoverIdeas.map(
                        (tip) => (
                          <li key={tip}>{tip}</li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : null}
                {selectedRecipe.servingSuggestions
                  ?.length ? (
                  <div>
                    <h3>곁들이기</h3>
                    <ul>
                      {selectedRecipe.servingSuggestions.map(
                        (tip) => (
                          <li key={tip}>{tip}</li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <div className="recipe-detail-actions">
            <Button
              variant="secondary"
              fullWidth
              onClick={onCloseRecipeDetail}
            >
              다른 레시피 보기
            </Button>
          </div>
        </main>

        <BottomSheet
          open={
            recipePlanModal.isOpen &&
            Boolean(recipeToPlan)
          }
          title="이번 주 식사에 담기"
          description={
            recipeToPlan
              ? `${recipeToPlan.name} 메뉴를 언제 먹을지 선택해 주세요.`
              : undefined
          }
          onClose={recipePlanModal.closeModal}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={recipePlanModal.closeModal}
              >
                취소
              </Button>
              <Button
                disabled={
                  !planDate || planServings < 1
                }
                onClick={handleSaveRecipePlan}
              >
                식사 일정 추가
              </Button>
            </>
          }
        >
          <div className="recipe-plan-form">
            <DatePickerField
              label="날짜"
              value={planDate}
              onChange={(event) =>
                setPlanDate(event.target.value)
              }
              required
            />
            <StyledSelect
              label="식사 시간"
              value={planMealType}
              onChange={(event) =>
                setPlanMealType(
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
            </StyledSelect>
            <PositiveIntegerInput
              label="인분"
              min={1}
              max={12}
              defaultValue={4}
              value={planServings}
              onValueChange={setPlanServings}
            />
            {planError ? (
              <p
                className="recipe-plan-form__error"
                role="alert"
              >
                {planError}
              </p>
            ) : null}
          </div>
        </BottomSheet>

        <BottomSheet
          open={measurementModal.isOpen}
          title={
            measurementModal.value
              ? `${measurementModal.value.name} 계량 도우미`
              : '계량 도우미'
          }
          description={
            measurementModal.value
              ? `${formatRecipeAmount(
                  measurementModal.value.amount,
                  measurementModal.value.unit,
                )}${measurementModal.value.unit}를 집에 있는 도구로 재는 방법이에요.`
              : undefined
          }
          onClose={measurementModal.closeModal}
          footer={
            <Button
              fullWidth
              onClick={measurementModal.closeModal}
            >
              확인
            </Button>
          }
        >
          <div className="recipe-measurement-helper">
            <section>
              <h3>추천 계량</h3>
              {measurementSuggestions.length > 0 ? (
                <ul className="recipe-measurement-helper__suggestions">
                  {measurementSuggestions.map(
                    (suggestion) => (
                      <li key={suggestion.tool}>
                        <Check
                          size={18}
                          strokeWidth={2.4}
                          aria-hidden="true"
                        />
                        <span>
                          <strong>
                            {suggestion.toolLabel}
                          </strong>
                          <small>
                            {suggestion.measurement}
                          </small>
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="recipe-measurement-helper__empty">
                  선택한 도구로 안전하게 환산하기
                  어려운 재료예요. 레시피에 표시된
                  수량을 기준으로 계량해 주세요.
                </p>
              )}
            </section>

            <section className="recipe-measurement-helper__reference">
              <h3>기본 계량 단위</h3>
              <dl>
                <div>
                  <dt>큰술</dt>
                  <dd>15ml</dd>
                </div>
                <div>
                  <dt>작은술</dt>
                  <dd>5ml</dd>
                </div>
                <div>
                  <dt>종이컵</dt>
                  <dd>200ml</dd>
                </div>
                <div>
                  <dt>밥숟가락</dt>
                  <dd>약 10~15ml</dd>
                </div>
              </dl>
            </section>
          </div>
        </BottomSheet>

        {planFeedback?.recipeId ===
        selectedRecipe.id ? (
          <Toast
            className="recipe-plan-feedback"
            tone="success"
            title={planFeedback.title}
            onDismiss={() => setPlanFeedback(null)}
          >
            <p>{planFeedback.message}</p>
            <Button
              variant="secondary"
              onClick={() => {
                setPlanFeedback(null)
                onChangePage('mealPlan')
              }}
            >
              식단에서 보기
            </Button>
          </Toast>
        ) : null}
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
  const featuredNeededIngredientCount =
    featuredRecipe?.ingredients.length ?? 0
  const featuredMissingIngredientCount =
    featuredRecommendation?.missingIngredientCount ??
    featuredNeededIngredientCount
  const featuredAvailableIngredientCount = Math.max(
    0,
    featuredNeededIngredientCount -
      featuredMissingIngredientCount,
  )

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
                onOpenRecipeDetail(featuredRecipe.id)
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
                  조리{' '}
                  {getPresentation(featuredRecipe, 0).duration}
                  {' · '}난이도{' '}
                  {
                    getPresentation(featuredRecipe, 0)
                      .difficulty
                  }
                  <br />
                  준비 가능{' '}
                  {featuredAvailableIngredientCount}/
                  {featuredNeededIngredientCount}가지 ·
                  준비율 {featuredReadiness}%
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
                const neededIngredientCount =
                  recipe.ingredients.length
                const missingIngredientCount =
                  recommendation?.missingIngredientCount ??
                  neededIngredientCount
                const availableIngredientCount = Math.max(
                  0,
                  neededIngredientCount -
                    missingIngredientCount,
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
                        onOpenRecipeDetail(recipe.id)
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
                          <span>
                            조리 {presentation.duration}
                          </span>
                          <span>
                            난이도 {presentation.difficulty}
                          </span>
                          <span>
                            준비 가능{' '}
                            {availableIngredientCount}/
                            {neededIngredientCount}가지
                          </span>
                          <span>
                            준비율 {readiness}%
                          </span>
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

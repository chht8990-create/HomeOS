import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Trash2,
} from 'lucide-react'
import RecipeRecommendationBlock from '../blocks/RecipeRecommendationBlock'
import type { PageName } from '../components/BottomNavigation'
import RecipeSpaceSwitcher from '../components/RecipeSpaceSwitcher'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import DatePickerField from '../components/ui/DatePickerField'
import Dialog from '../components/ui/Dialog'
import EmptyState from '../components/ui/EmptyState'
import PositiveIntegerInput from '../components/ui/PositiveIntegerInput'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import Spinner from '../components/ui/Spinner'
import StyledSelect from '../components/ui/StyledSelect'
import Toast from '../components/ui/Toast'
import useAiMealPlanTrial from '../hooks/useAiMealPlanTrial'
import useHistoryModal from '../hooks/useHistoryModal'
import useInventory from '../hooks/useInventory'
import useMealPlan from '../hooks/useMealPlan'
import useRecipes from '../hooks/useRecipes'
import useShoppingList from '../hooks/useShoppingList'
import { AiMealPlanTrialError } from '../services/aiMealPlanTrialClient'
import {
  addDaysToDateKey,
  createDefaultMonthlyMealPlans,
  getMealPlansInRange,
  mealPlanRangeDays,
  type MealPlanViewRange,
} from '../services/defaultMealPlanEngine'
import {
  getAiMealPlanTrialFailureState,
} from '../services/aiMealPlanTrialEngine'
import {
  createMealPlanRangeShoppingSourceId,
  createMealPlanShoppingIngredients,
} from '../services/mealPlanShoppingEngine'
import type {
  MealType,
  PlannedMeal,
} from '../types/meal'
import type {
  AiMealPlanDraftDay,
  SpicePreference,
  StoredAiMealPlanTrial,
} from '../types/aiMealPlanTrial'

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

const rangeOptions: Array<{
  value: MealPlanViewRange
  label: string
}> = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '일주일' },
  { value: 'fortnight', label: '보름' },
  { value: 'month', label: '한 달' },
]

function getTodayDateKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(
    today.getMonth() + 1,
  ).padStart(2, '0')
  const day = String(today.getDate()).padStart(
    2,
    '0',
  )

  return `${year}-${month}-${day}`
}

type MealPlanPageProps = {
  initialRecipeName?: string
  openAiTrial?: boolean
  onChangePage: (page: PageName) => void
  onOpenRecipeDetail: (recipeId: string) => void
  onInitialRecipeConsumed?: () => void
}

type MealPlanFeedback = {
  tone: 'success' | 'danger'
  title: string
  message: string
}

type AiFailureFeedback = ReturnType<
  typeof getAiMealPlanTrialFailureState
>

const aiLoadingStages = [
  '가족 조건 분석 중',
  '식단 구성 중',
  '레시피 준비 중',
  '장보기 계산 중',
]

const weekdayLabels = [
  '일',
  '월',
  '화',
  '수',
  '목',
  '금',
  '토',
]

function formatMealPlanDate(dateKey: string) {
  const [year, month, day] = dateKey
    .split('-')
    .map(Number)
  const date = new Date(year, month - 1, day)
  const weekday = weekdayLabels[date.getDay()]

  return `${dateKey} (${weekday})`
}

function MealPlanPage({
  initialRecipeName,
  openAiTrial = false,
  onChangePage,
  onOpenRecipeDetail,
  onInitialRecipeConsumed,
}: MealPlanPageProps) {
  const mealNameInputRef =
    useRef<HTMLInputElement>(null)
  const mealPlansSectionRef =
    useRef<HTMLDivElement>(null)
  const aiTrialSectionRef =
    useRef<HTMLDivElement>(null)
  const aiAbortControllerRef =
    useRef<AbortController | null>(null)
  const {
    mealPlans,
    saveMealPlan,
    deleteMealPlan,
    replaceAllMealPlans,
    replaceMealPlanSlots,
  } = useMealPlan()
  const { recipes } = useRecipes()
  const { items: inventoryItems } = useInventory()
  const { replaceMealPlanRangeItems } =
    useShoppingList()
  const {
    storedTrial,
    isGenerating,
    generatingRecipeIds,
    generateTrial,
    ensureRecipeDetail,
  } = useAiMealPlanTrial()
  const [date, setDate] = useState(getTodayDateKey)
  const [mealType, setMealType] =
    useState<MealType>('dinner')
  const [mealName, setMealName] = useState(
    initialRecipeName ?? '',
  )
  const [servings, setServings] = useState(4)
  const [editingId, setEditingId] =
    useState<string | null>(null)
  const [feedback, setFeedback] =
    useState<MealPlanFeedback | null>(null)
  const [rangeStartDate, setRangeStartDate] =
    useState(getTodayDateKey)
  const [viewRange, setViewRange] =
    useState<MealPlanViewRange>('week')
  const [shoppingRange, setShoppingRange] =
    useState<MealPlanViewRange>('week')
  const [householdSize, setHouseholdSize] =
    useState(4)
  const [includesChildren, setIncludesChildren] =
    useState(false)
  const [childAgeGroup, setChildAgeGroup] =
    useState('')
  const [spicePreference, setSpicePreference] =
    useState<SpicePreference>('mild')
  const [preferredFoods, setPreferredFoods] =
    useState('')
  const [excludedFoods, setExcludedFoods] =
    useState('')
  const [allergies, setAllergies] = useState('')
  const [
    weekdayMaxMinutes,
    setWeekdayMaxMinutes,
  ] = useState(40)
  const [
    aiLoadingStageIndex,
    setAiLoadingStageIndex,
  ] = useState(0)
  const [aiDetailErrors, setAiDetailErrors] =
    useState<Record<string, string>>({})
  const aiFailureModal =
    useHistoryModal<AiFailureFeedback>(
      'ai-meal-plan-failure',
    )

  useEffect(() => {
    if (!initialRecipeName) {
      return
    }

    onInitialRecipeConsumed?.()
  }, [
    initialRecipeName,
    onInitialRecipeConsumed,
  ])

  const visibleMealPlans = getMealPlansInRange(
    mealPlans,
    rangeStartDate,
    viewRange,
  )

  useEffect(() => {
    if (!openAiTrial || storedTrial) {
      return
    }

    window.requestAnimationFrame(() => {
      aiTrialSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [openAiTrial, storedTrial])

  useEffect(() => {
    if (!isGenerating) {
      return
    }

    const intervalId = window.setInterval(() => {
      setAiLoadingStageIndex(
        (currentIndex) =>
          (currentIndex + 1) %
          aiLoadingStages.length,
      )
    }, 2400)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isGenerating])

  function resetEditor() {
    setMealName('')
    setServings(4)
    setEditingId(null)
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      !date ||
      !mealName.trim() ||
      servings < 1
    ) {
      return
    }

    const savedMealName = mealName.trim()
    const matchedRecipe = recipes.find(
      (recipe) =>
        recipe.name.trim().toLowerCase() ===
        savedMealName.toLowerCase(),
    )
    const wasEditing = Boolean(editingId)

    try {
      saveMealPlan(
        {
          date,
          type: mealType,
          name: savedMealName,
          ...(matchedRecipe
            ? { recipeId: matchedRecipe.id }
            : {}),
          servings,
          source: 'manual',
        },
        editingId ?? undefined,
      )
      resetEditor()
      setFeedback({
        tone: 'success',
        title: wasEditing
          ? '식사 일정을 수정했어요.'
          : '식사 일정을 저장했어요.',
        message: `${savedMealName} 일정을 아래에서 확인해 보세요.`,
      })

      window.requestAnimationFrame(() => {
        mealPlansSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    } catch {
      setFeedback({
        tone: 'danger',
        title: '식사 일정을 저장하지 못했어요.',
        message:
          '잠시 후 다시 시도해 주세요. 입력한 내용은 그대로 두었어요.',
      })
    }
  }

  function startEditing(mealPlan: PlannedMeal) {
    setDate(mealPlan.date)
    setMealType(mealPlan.type)
    setMealName(mealPlan.name)
    setServings(mealPlan.servings ?? 4)
    setEditingId(mealPlan.id)
    setFeedback(null)
    window.requestAnimationFrame(() => {
      mealNameInputRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  }

  function handleDelete(mealPlan: PlannedMeal) {
    if (
      !window.confirm(
        `${mealPlan.name} 일정을 삭제할까요?`,
      )
    ) {
      return
    }

    deleteMealPlan(mealPlan.id)

    if (editingId === mealPlan.id) {
      resetEditor()
    }
  }

  function focusMealPlanEditor() {
    mealNameInputRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
    mealNameInputRef.current?.focus({
      preventScroll: true,
    })
  }

  function handleSelectRecommendedRecipe(
    recipeName: string,
  ) {
    const recipe = recipes.find(
      (candidate) =>
        candidate.name === recipeName,
    )

    setMealName(recipeName)
    setServings(recipe?.servings ?? 4)
    setFeedback(null)

    window.requestAnimationFrame(() => {
      focusMealPlanEditor()
    })
  }

  function handleApplyDefaultPlan() {
    const question =
      mealPlans.length > 0
        ? '현재 저장된 식단을 지우고 오늘부터 기본 한 달 식단을 다시 적용할까요?'
        : '오늘부터 기본 한 달 식단을 적용할까요?'

    if (!window.confirm(question)) {
      return
    }

    try {
      const defaultMealPlans =
        createDefaultMonthlyMealPlans(
          getTodayDateKey(),
          recipes,
        )

      replaceAllMealPlans(defaultMealPlans)
      setRangeStartDate(getTodayDateKey())
      setViewRange('week')
      setFeedback({
        tone: 'success',
        title: '기본 한 달 식단을 적용했어요.',
        message:
          '30일 저녁 메뉴와 상세 레시피를 바로 확인할 수 있어요.',
      })
    } catch {
      setFeedback({
        tone: 'danger',
        title: '기본 식단을 적용하지 못했어요.',
        message:
          '필요한 상세 레시피를 확인한 뒤 다시 시도해 주세요.',
      })
    }
  }

  function handleClearAllPlans() {
    if (
      mealPlans.length === 0 ||
      !window.confirm(
        '저장된 식사 일정을 모두 지울까요? 이 작업은 되돌릴 수 없어요.',
      )
    ) {
      return
    }

    replaceAllMealPlans([])
    resetEditor()
    setFeedback({
      tone: 'success',
      title: '식사 일정을 모두 지웠어요.',
      message:
        '원할 때 기본 식단을 다시 적용할 수 있어요.',
    })
  }

  function handleCreateShoppingList() {
    const result =
      createMealPlanShoppingIngredients(
        mealPlans,
        recipes,
        inventoryItems,
        rangeStartDate,
        shoppingRange,
      )

    if (result.selectedMealPlans.length === 0) {
      setFeedback({
        tone: 'danger',
        title: '장보기로 만들 식단이 없어요.',
        message:
          '선택한 기간에 레시피가 연결된 식단을 먼저 추가해 주세요.',
      })
      return
    }

    const itemCount = replaceMealPlanRangeItems(
      createMealPlanRangeShoppingSourceId(
        rangeStartDate,
        shoppingRange,
      ),
      result.ingredients,
    )

    setFeedback({
      tone: 'success',
      title: '장보기 목록을 만들었어요.',
      message:
        itemCount > 0
          ? `냉장고 재료와 기본 조미료를 제외한 ${itemCount}개 품목을 담았어요.`
          : '냉장고 재료만으로 만들 수 있어 추가할 품목이 없어요.',
    })
  }

  function handleGenerateAiTrial(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    void runAiTrialGeneration()
  }

  function syncAiTrialShopping(
    trial: StoredAiMealPlanTrial,
  ) {
    return replaceMealPlanRangeItems(
      createMealPlanRangeShoppingSourceId(
        trial.response.plans[0].date,
        'week',
      ),
      trial.response.weeklyShoppingIngredients,
    )
  }

  async function prepareAiRecipeDetail(
    day: AiMealPlanDraftDay,
    openAfterReady = false,
    signal?: AbortSignal,
  ) {
    setAiDetailErrors((current) => {
      const next = { ...current }
      delete next[day.recipeId]
      return next
    })

    try {
      const trial = await ensureRecipeDetail(
        day,
        signal,
      )

      syncAiTrialShopping(trial)
      if (openAfterReady) {
        onOpenRecipeDetail(day.recipeId)
      }

      return trial
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '상세 레시피를 만들지 못했어요.'

      setAiDetailErrors((current) => ({
        ...current,
        [day.recipeId]: message,
      }))
      throw error
    }
  }

  function handleOpenAiRecipe(
    day: AiMealPlanDraftDay,
  ) {
    const hasRecipe =
      storedTrial?.response.recipes.some(
        (recipe) => recipe.id === day.recipeId,
      )

    if (hasRecipe) {
      onOpenRecipeDetail(day.recipeId)
      return
    }

    void prepareAiRecipeDetail(day, true).catch(
      () => undefined,
    )
  }

  function dismissAiDetailError(recipeId: string) {
    setAiDetailErrors((current) => {
      const next = { ...current }
      delete next[recipeId]
      return next
    })
  }

  async function runAiTrialGeneration() {
    if (storedTrial || isGenerating) {
      return
    }

    setAiLoadingStageIndex(0)
    setFeedback(null)
    const abortController = new AbortController()
    aiAbortControllerRef.current = abortController

    try {
      const trial = await generateTrial(
        {
          startDate: getTodayDateKey(),
          householdSize,
          includesChildren,
          ...(includesChildren &&
          childAgeGroup.trim()
            ? {
                childAgeGroup:
                  childAgeGroup.trim(),
              }
            : {}),
          spicePreference,
          ...(preferredFoods.trim()
            ? {
                preferredFoods:
                  preferredFoods.trim(),
              }
            : {}),
          ...(excludedFoods.trim()
            ? {
                excludedFoods:
                  excludedFoods.trim(),
              }
            : {}),
          ...(allergies.trim()
            ? { allergies: allergies.trim() }
            : {}),
          weekdayMaxMinutes,
          inventoryItems: inventoryItems.map(
            ({ name, quantity, unit }) => ({
              name,
              quantity,
              unit,
            }),
          ),
        },
        abortController.signal,
      )

      replaceMealPlanSlots(trial.response.plans)
      setRangeStartDate(
        trial.response.plans[0].date,
      )
      setViewRange('week')
      setFeedback({
        tone: 'success',
        title: '맞춤 식단을 완성했어요.',
        message:
          '메뉴를 열면 상세 레시피도 준비해드려요.',
      })

      const firstDay = trial.response.days[0]

      try {
        const completedTrial =
          await prepareAiRecipeDetail(
            firstDay,
            false,
            abortController.signal,
          )

        setFeedback({
          tone: 'success',
          title: '맞춤 7일 식단을 저장했어요.',
          message:
            completedTrial.response
              .recipeSources[firstDay.recipeId] ===
            'golden'
              ? '첫날 메뉴는 검수된 레시피를 바로 연결했어요. 다른 메뉴는 열 때 준비해드려요.'
              : '첫날 상세 레시피까지 저장했어요. 다른 메뉴는 열 때 준비해드려요.',
        })
      } catch {
        setFeedback({
          tone: 'danger',
          title:
            '7일 식단 초안은 안전하게 저장했어요.',
          message:
            '첫날 상세 레시피를 다시 준비하면 무료 체험이 완료돼요.',
        })
      }
    } catch (error) {
      const trialError =
        error instanceof AiMealPlanTrialError
          ? error
          : null

      if (
        trialError?.code === 'AI_TRIAL_CANCELLED'
      ) {
        setFeedback({
          tone: 'success',
          title: '맞춤 식단 만들기를 취소했어요.',
          message:
            '무료 체험은 사용 처리되지 않았어요.',
        })
      } else {
        aiFailureModal.openModal(
          getAiMealPlanTrialFailureState(
            trialError?.code,
          ),
        )
      }
    } finally {
      aiAbortControllerRef.current = null
    }
  }

  function handleRetryAiTrial() {
    aiFailureModal.closeModal()
    window.setTimeout(() => {
      void runAiTrialGeneration()
    }, 0)
  }

  return (
    <>
      <ScreenHeader
        title="이번 주 식사"
        description="기본 식단을 보거나 우리 가족 일정에 맞게 바꿔보세요."
      />

      <main className="app-content">
        <RecipeSpaceSwitcher
          activeSpace="planner"
          onOpenPlanner={() => undefined}
          onOpenRecipes={() =>
            onChangePage('recipes')
          }
        />

        <Section
          title={
            editingId
              ? '식사 일정 수정'
              : '식사 일정 추가'
          }
          description="날짜, 메뉴, 인분을 선택하세요."
        >
          <Card>
            <form
              className="inventory-form"
              onSubmit={handleSubmit}
            >
              <div className="inventory-form__row">
                <DatePickerField
                  label="날짜"
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  required
                />

                <StyledSelect
                  label="식사 시간"
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
                </StyledSelect>
              </div>

              <label className="inventory-form__field">
                메뉴 이름
                <input
                  ref={mealNameInputRef}
                  type="text"
                  list="meal-plan-recipes"
                  value={mealName}
                  onChange={(event) =>
                    setMealName(event.target.value)
                  }
                  placeholder="예: 김치찌개"
                  required
                />
                <datalist id="meal-plan-recipes">
                  {recipes.map((recipe) => (
                    <option
                      key={recipe.id}
                      value={recipe.name}
                    />
                  ))}
                </datalist>
              </label>

              <PositiveIntegerInput
                label="인분"
                min={1}
                max={12}
                defaultValue={4}
                value={servings}
                onValueChange={setServings}
                required
              />

              <div className="meal-editor__actions">
                {editingId ? (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={resetEditor}
                  >
                    취소
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  fullWidth
                  disabled={
                    !date ||
                    !mealName.trim() ||
                    servings < 1
                  }
                >
                  {editingId
                    ? '수정 내용 저장'
                    : '식사 일정 추가'}
                </Button>
              </div>
            </form>
          </Card>
        </Section>

        <div
          ref={mealPlansSectionRef}
          className="meal-plan-schedule"
        >
          <Section
            title="저장된 식사 일정"
            description={`${rangeStartDate}부터 ${mealPlanRangeDays[viewRange]}일을 보고 있어요.`}
          >
            <Card>
              <div className="meal-plan-toolbar">
                <div
                  className="meal-plan-range-tabs"
                  aria-label="식단 보기 범위"
                >
                  {rangeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={
                        viewRange === option.value
                          ? 'primary'
                          : 'ghost'
                      }
                      aria-pressed={
                        viewRange === option.value
                      }
                      onClick={() =>
                        setViewRange(option.value)
                      }
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>

                <div className="meal-plan-date-navigation">
                  <Button
                    variant="secondary"
                    aria-label="이전 기간"
                    onClick={() =>
                      setRangeStartDate(
                        addDaysToDateKey(
                          rangeStartDate,
                          -mealPlanRangeDays[
                            viewRange
                          ],
                        ),
                      )
                    }
                  >
                    <ChevronLeft
                      size={18}
                      aria-hidden="true"
                    />
                  </Button>
                  <DatePickerField
                    label="보기 시작 날짜"
                    labelHidden
                    value={rangeStartDate}
                    onChange={(event) =>
                      setRangeStartDate(
                        event.target.value,
                      )
                    }
                  />
                  <Button
                    variant="secondary"
                    aria-label="다음 기간"
                    onClick={() =>
                      setRangeStartDate(
                        addDaysToDateKey(
                          rangeStartDate,
                          mealPlanRangeDays[
                            viewRange
                          ],
                        ),
                      )
                    }
                  >
                    <ChevronRight
                      size={18}
                      aria-hidden="true"
                    />
                  </Button>
                </div>
              </div>

              {visibleMealPlans.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays />}
                  title="이 기간에 식사 일정이 없어요."
                  description="메뉴를 추가하거나 기본 식단을 적용해 보세요."
                  action={
                    <Button
                      onClick={focusMealPlanEditor}
                    >
                      첫 일정 추가
                    </Button>
                  }
                />
              ) : (
                <ul className="inventory-list">
                  {visibleMealPlans.map(
                    (mealPlan) => (
                      <li
                        key={mealPlan.id}
                        className="inventory-item"
                      >
                        <div className="inventory-item__content">
                          <div className="inventory-item__top">
                            <strong>
                              {mealPlan.name}
                            </strong>
                            <span className="inventory-item__location">
                              {
                                mealTypeLabels[
                                  mealPlan.type
                                ]
                              }
                            </span>
                          </div>
                          <p>
                            <time
                              dateTime={mealPlan.date}
                            >
                              {mealPlan.date}
                            </time>
                            {' · '}
                            {mealPlan.servings ?? 4}
                            인분
                          </p>
                          {mealPlan.source ? (
                            <Badge tone="neutral">
                              {mealPlan.source ===
                              'ai-trial'
                                ? 'AI 맞춤 식단'
                                : mealPlan.source ===
                                    'default'
                                  ? '기본 식단'
                                  : '직접 추가'}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="inventory-item__actions">
                          {mealPlan.recipeId ? (
                            <Button
                              variant="ghost"
                              disabled={generatingRecipeIds.includes(
                                mealPlan.recipeId,
                              )}
                              onClick={() => {
                                const aiDay =
                                  storedTrial?.response.days.find(
                                    (day) =>
                                      day.recipeId ===
                                      mealPlan.recipeId,
                                  )

                                if (aiDay) {
                                  handleOpenAiRecipe(
                                    aiDay,
                                  )
                                } else {
                                  onOpenRecipeDetail(
                                    mealPlan.recipeId!,
                                  )
                                }
                              }}
                            >
                              {generatingRecipeIds.includes(
                                mealPlan.recipeId,
                              )
                                ? '준비 중'
                                : '레시피'}
                            </Button>
                          ) : null}
                          <Button
                            variant="secondary"
                            onClick={() =>
                              startEditing(mealPlan)
                            }
                          >
                            수정
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() =>
                              handleDelete(mealPlan)
                            }
                          >
                            삭제
                          </Button>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              )}

              <div className="meal-plan-maintenance-actions">
                <Button
                  variant="secondary"
                  onClick={handleApplyDefaultPlan}
                >
                  <RotateCcw
                    size={17}
                    aria-hidden="true"
                  />
                  기본 식단 다시 적용
                </Button>
                <Button
                  variant="danger"
                  disabled={mealPlans.length === 0}
                  onClick={handleClearAllPlans}
                >
                  <Trash2
                    size={17}
                    aria-hidden="true"
                  />
                  전체 초기화
                </Button>
              </div>
            </Card>
          </Section>
        </div>

        <Section
          title="식단으로 장보기"
          description="선택한 기간의 재료를 합치고 냉장고에 있는 양을 제외해요."
        >
          <Card>
            <div className="meal-plan-shopping">
              <StyledSelect
                label="장보기 범위"
                value={shoppingRange}
                onChange={(event) =>
                  setShoppingRange(
                    event.target
                      .value as MealPlanViewRange,
                  )
                }
              >
                {rangeOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </StyledSelect>
              <Button
                fullWidth
                onClick={handleCreateShoppingList}
              >
                <ShoppingCart
                  size={18}
                  aria-hidden="true"
                />
                장보기 목록 만들기
              </Button>
              <p>
                물, 소금, 식용유, 후추, 설탕은 기본
                조미료로 보고 제외해요.
              </p>
            </div>
          </Card>
        </Section>

        <div
          ref={aiTrialSectionRef}
          className="ai-trial-section"
        >
          <Section
            title="AI 맞춤 7일 식단 무료 체험"
            description="우리 가족 조건에 맞춘 식단을 이 기기에 한 번 저장해요."
          >
            <Card>
              {storedTrial ? (
                <div className="ai-trial-complete">
                  <Badge
                    tone={
                      storedTrial.status ===
                      'completed'
                        ? 'success'
                        : 'warning'
                    }
                  >
                    {storedTrial.status ===
                    'completed'
                      ? '체험 사용 완료'
                      : '초안 저장됨 · 체험 미사용'}
                  </Badge>
                  <h3>
                    {storedTrial.status ===
                    'completed'
                      ? '맞춤 7일 식단을 저장해 두었어요.'
                      : '맞춤 식단 초안을 저장했어요.'}
                  </h3>
                  <p>
                    메뉴를 처음 열면 상세 레시피를
                    준비하고, 완료된 메뉴는 다시 호출하지
                    않아요.
                  </p>
                  <div className="ai-trial-shopping-summary">
                    <strong>
                      현재 계산된 장보기
                    </strong>
                    <p>
                      {storedTrial.response
                        .weeklyShoppingIngredients.length >
                      0
                        ? storedTrial.response.weeklyShoppingIngredients
                            .map(
                              (ingredient) =>
                                `${ingredient.name} ${ingredient.quantity}${ingredient.unit}`,
                            )
                            .join(', ')
                        : '상세 레시피가 준비되면 정확한 수량을 계산해요.'}
                    </p>
                    {storedTrial.response.days.some(
                      (day) =>
                        !storedTrial.response.recipes.some(
                          (recipe) =>
                            recipe.id ===
                            day.recipeId,
                        ) &&
                        day.missingIngredientNames
                          .length > 0,
                    ) ? (
                      <p>
                        수량 계산 중:{' '}
                        {[
                          ...new Set(
                            storedTrial.response.days.flatMap(
                              (day) =>
                                storedTrial.response.recipes.some(
                                  (recipe) =>
                                    recipe.id ===
                                    day.recipeId,
                                )
                                  ? []
                                  : day.missingIngredientNames,
                            ),
                          ),
                        ].join(', ')}
                      </p>
                    ) : null}
                  </div>
                  <ul>
                    {storedTrial.response.days.map(
                      (day) => {
                        const isReady =
                          storedTrial.response.recipes.some(
                            (recipe) =>
                              recipe.id ===
                              day.recipeId,
                          )
                        const isPreparing =
                          generatingRecipeIds.includes(
                            day.recipeId,
                          )

                        return (
                        <li
                          key={day.recipeId}
                          className="ai-trial-recipe-card"
                        >
                          <div className="ai-trial-recipe-card__heading">
                            <strong>{day.name}</strong>
                            <span className="ai-trial-recipe-card__meta">
                              <time
                                dateTime={day.date}
                              >
                                {formatMealPlanDate(
                                  day.date,
                                )}
                              </time>
                              <span>
                                {day.prepMinutes +
                                  day.cookMinutes}
                                분 · {day.servings}
                                인분
                              </span>
                            </span>
                          </div>
                          <Button
                            variant={
                              isReady
                                ? 'ghost'
                                : 'secondary'
                            }
                            disabled={isPreparing}
                            onClick={() =>
                              handleOpenAiRecipe(day)
                            }
                          >
                            {isPreparing
                              ? (
                                  <Spinner label="레시피 준비 중" />
                                )
                              : isReady
                                ? '레시피 보기'
                                : '상세 레시피 준비'}
                          </Button>
                          {aiDetailErrors[
                            day.recipeId
                          ] ? (
                            <div
                              role="alert"
                              className="ai-trial-inline-warning"
                            >
                              <strong>
                                레시피 준비가 조금 늦어지고
                                있어요.
                              </strong>
                              <p>
                                잠시 후 다시 시도하면 이어서
                                준비할 수 있습니다.
                              </p>
                              <div>
                                <Button
                                  variant="secondary"
                                  disabled={isPreparing}
                                  onClick={() =>
                                    handleOpenAiRecipe(day)
                                  }
                                >
                                  다시 시도
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() =>
                                    dismissAiDetailError(
                                      day.recipeId,
                                    )
                                  }
                                >
                                  닫기
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </li>
                        )
                      },
                    )}
                  </ul>
                </div>
              ) : (
                <form
                  className="inventory-form ai-trial-form"
                  onSubmit={handleGenerateAiTrial}
                >
                  <div className="inventory-form__row">
                    <PositiveIntegerInput
                      label="식사 인원"
                      min={1}
                      max={12}
                      defaultValue={4}
                      value={householdSize}
                      onValueChange={setHouseholdSize}
                      disabled={isGenerating}
                    />
                    <StyledSelect
                      label="평일 최대 조리시간"
                      value={weekdayMaxMinutes}
                      onChange={(event) =>
                        setWeekdayMaxMinutes(
                          Number(event.target.value),
                        )
                      }
                      disabled={isGenerating}
                    >
                      <option value={20}>20분</option>
                      <option value={30}>30분</option>
                      <option value={40}>40분</option>
                      <option value={60}>60분</option>
                    </StyledSelect>
                  </div>

                  <label className="ai-trial-checkbox">
                    <input
                      type="checkbox"
                      checked={includesChildren}
                      onChange={(event) =>
                        setIncludesChildren(
                          event.target.checked,
                        )
                      }
                      disabled={isGenerating}
                    />
                    아이와 함께 먹어요
                  </label>

                  {includesChildren ? (
                    <label className="inventory-form__field">
                      아이 연령대
                      <input
                        type="text"
                        value={childAgeGroup}
                        onChange={(event) =>
                          setChildAgeGroup(
                            event.target.value,
                          )
                        }
                        placeholder="예: 유아, 초등학생"
                        disabled={isGenerating}
                      />
                    </label>
                  ) : null}

                  <StyledSelect
                    label="맵기 선호"
                    value={spicePreference}
                    onChange={(event) =>
                      setSpicePreference(
                        event.target
                          .value as SpicePreference,
                      )
                    }
                    disabled={isGenerating}
                  >
                    <option value="mild">
                      순한 맛
                    </option>
                    <option value="medium">
                      보통 맛
                    </option>
                    <option value="spicy">
                      매운 맛
                    </option>
                  </StyledSelect>

                  <label className="inventory-form__field">
                    선호 음식
                    <input
                      type="text"
                      value={preferredFoods}
                      onChange={(event) =>
                        setPreferredFoods(
                          event.target.value,
                        )
                      }
                      placeholder="예: 국물 요리, 생선"
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="inventory-form__field">
                    제외 음식
                    <input
                      type="text"
                      value={excludedFoods}
                      onChange={(event) =>
                        setExcludedFoods(
                          event.target.value,
                        )
                      }
                      placeholder="쉼표로 구분해 주세요"
                      disabled={isGenerating}
                    />
                  </label>
                  <label className="inventory-form__field">
                    알레르기
                    <input
                      type="text"
                      value={allergies}
                      onChange={(event) =>
                        setAllergies(
                          event.target.value,
                        )
                      }
                      placeholder="예: 땅콩, 새우"
                      disabled={isGenerating}
                    />
                  </label>

                  {isGenerating ? (
                    <div
                      className="ai-trial-loading"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      <Spinner label="AI 식단 생성 중" />
                      <div>
                        <strong>
                          AI가 7일 식단 초안을 만들고
                          있어요
                        </strong>
                        <p>
                          상세 레시피는 메뉴를 열 때
                          한 개씩 준비해요.
                        </p>
                        <span>
                          {
                            aiLoadingStages[
                              aiLoadingStageIndex
                            ]
                          }
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div className="meal-editor__actions">
                    {isGenerating ? (
                      <Button
                        variant="secondary"
                        fullWidth
                        onClick={() =>
                          aiAbortControllerRef.current?.abort()
                        }
                      >
                        생성 취소
                      </Button>
                    ) : null}
                    <Button
                      type="submit"
                      fullWidth
                      disabled={
                        isGenerating ||
                        householdSize < 1
                      }
                    >
                      <Sparkles
                        size={18}
                        aria-hidden="true"
                      />
                      {isGenerating
                        ? 'AI가 식단 초안을 만들고 있어요'
                        : 'AI 맞춤 7일 식단 만들기'}
                    </Button>
                  </div>

                  <p className="ai-trial-form__notice">
                    성공적으로 생성하고 이 기기에 저장한
                    경우에만 무료 체험을 사용해요. 앱 데이터
                    삭제나 초기화 후에는 체험이 다시 가능할
                    수 있어요.
                  </p>
                </form>
              )}
            </Card>
          </Section>
        </div>

        <RecipeRecommendationBlock
          onSelectRecipe={
            handleSelectRecommendedRecipe
          }
          onViewRecipe={onOpenRecipeDetail}
          onOpenInventory={() =>
            onChangePage('inventory')
          }
        />
      </main>

      <Dialog
        className="ai-trial-failure-dialog"
        open={aiFailureModal.isOpen}
        title="레시피 준비가 조금 늦어지고 있어요."
        description="잠시 후 다시 시도하면 이어서 준비할 수 있습니다."
        onClose={aiFailureModal.closeModal}
        footer={
          <>
            <Button
              disabled={isGenerating}
              onClick={handleRetryAiTrial}
            >
              다시 시도
            </Button>
            <Button
              variant="ghost"
              onClick={aiFailureModal.closeModal}
            >
              닫기
            </Button>
          </>
        }
      >
        <p className="ai-trial-failure-note">
          실패한 결과는 저장하지 않았고 무료 체험도
          사용 처리하지 않았어요.
        </p>
      </Dialog>

      {feedback ? (
        <Toast
          tone={feedback.tone}
          title={feedback.title}
          onDismiss={() => setFeedback(null)}
        >
          {feedback.message}
        </Toast>
      ) : null}
    </>
  )
}

export default MealPlanPage

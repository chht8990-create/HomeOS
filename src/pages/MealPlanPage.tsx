import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Trash2,
  Utensils,
} from 'lucide-react'
import RecipeRecommendationBlock, {
  type RecipeSelection,
} from '../blocks/RecipeRecommendationBlock'
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
import { resolveRecipeImage } from '../data/recipeImages'
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
  getRecentMealPlanMenuNames,
  getAiMealPlanTrialFailureState,
} from '../services/aiMealPlanTrialEngine'
import {
  createAiMealPlanPipelineError,
  createAiMealPlanPipelineTraceId,
  isAiMealPlanPipelineError,
  logAiMealPlanPipelineTrace,
  type AiMealPlanPipelineErrorCode,
  type AiMealPlanPipelineStage,
} from '../services/aiMealPlanPipelineEngine'
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
  openAiRecommendation?: boolean
  onChangePage: (page: PageName) => void
  onOpenRecipeDetail: (recipeId: string) => void
  onInitialRecipeConsumed?: () => void
  onAiRecommendationStarted?: () => void
}

type MealPlanFeedback = {
  tone: 'success' | 'danger'
  title: string
  message: string
}

const pipelineFallbackErrorCodes: Record<
  AiMealPlanPipelineStage,
  AiMealPlanPipelineErrorCode
> = {
  DRAFT_GENERATION: 'NETWORK_ERROR',
  DRAFT_VALIDATION: 'OPENAI_RESPONSE_INVALID',
  MENU_NORMALIZATION: 'MENU_NAME_INVALID',
  MENU_DIVERSITY_VALIDATION:
    'MENU_DIVERSITY_INVALID',
  RECIPE_DETAIL_GENERATION:
    'RECIPE_DETAIL_FAILED',
  INGREDIENT_NORMALIZATION:
    'INGREDIENT_NORMALIZATION_FAILED',
  IMAGE_RESOLUTION: 'IMAGE_KEY_FAILED',
  PLANNER_SAVE: 'PLANNER_SAVE_FAILED',
  SHOPPING_PREPARE: 'SHOPPING_PREPARE_FAILED',
  TRIAL_COMPLETE: 'TRIAL_COMPLETE_FAILED',
  ROLLBACK: 'STORAGE_SAVE_FAILED',
}

type AiFailureFeedback = ReturnType<
  typeof getAiMealPlanTrialFailureState
>

const PLANNER_SECTION_STATE_KEY =
  'today-table.planner.sections.v1'

type PlannerSectionState = {
  schedule: boolean
  recommendations: boolean
  shopping: boolean
  aiTrial: boolean
}

const defaultPlannerSectionState: PlannerSectionState = {
  schedule: false,
  recommendations: true,
  shopping: true,
  aiTrial: true,
}

function readPlannerSectionState() {
  if (typeof window === 'undefined') {
    return defaultPlannerSectionState
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(
        PLANNER_SECTION_STATE_KEY,
      ) ?? '{}',
    ) as Partial<PlannerSectionState>

    return {
      schedule:
        typeof stored.schedule === 'boolean'
          ? stored.schedule
          : defaultPlannerSectionState.schedule,
      recommendations:
        typeof stored.recommendations === 'boolean'
          ? stored.recommendations
          : defaultPlannerSectionState.recommendations,
      shopping:
        typeof stored.shopping === 'boolean'
          ? stored.shopping
          : defaultPlannerSectionState.shopping,
      aiTrial:
        typeof stored.aiTrial === 'boolean'
          ? stored.aiTrial
          : defaultPlannerSectionState.aiTrial,
    }
  } catch {
    return defaultPlannerSectionState
  }
}

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
  openAiRecommendation = false,
  onChangePage,
  onOpenRecipeDetail,
  onInitialRecipeConsumed,
  onAiRecommendationStarted,
}: MealPlanPageProps) {
  const mealNameInputRef =
    useRef<HTMLInputElement>(null)
  const mealPlansSectionRef =
    useRef<HTMLDivElement>(null)
  const aiTrialSectionRef =
    useRef<HTMLDivElement>(null)
  const recommendationSectionRef =
    useRef<HTMLDivElement>(null)
  const aiAbortControllerRef =
    useRef<AbortController | null>(null)
  const savedMealFeedbackTimeoutRef =
    useRef<number | null>(null)
  const {
    mealPlans,
    saveMealPlan,
    deleteMealPlan,
    replaceAllMealPlans,
    replaceMealPlanSlots,
  } = useMealPlan()
  const { recipes } = useRecipes()
  const { items: inventoryItems } = useInventory()
  const {
    items: shoppingItems,
    replaceMealPlanRangeItems,
    replaceAllItems: replaceAllShoppingItems,
  } = useShoppingList()
  const {
    storedTrial,
    isGenerating,
    generatingRecipeIds,
    recipeDetailGenerationStates,
    generateTrial,
    ensureRecipeDetail,
    clearRecipeDetailGenerationError,
    completeTrial,
    discardIncompleteTrial,
  } = useAiMealPlanTrial()
  const [date, setDate] = useState(getTodayDateKey)
  const [mealType, setMealType] =
    useState<MealType>('dinner')
  const [mealName, setMealName] = useState(
    initialRecipeName ?? '',
  )
  const [selectedRecipeId, setSelectedRecipeId] =
    useState<string | null>(() =>
      initialRecipeName
        ? recipes.find(
            (recipe) =>
              recipe.name.trim().toLowerCase() ===
              initialRecipeName.trim().toLowerCase(),
          )?.id ?? null
        : null,
    )
  const [servings, setServings] = useState(4)
  const [editingId, setEditingId] =
    useState<string | null>(null)
  const [feedback, setFeedback] =
    useState<MealPlanFeedback | null>(null)
  const [savedMealFeedback, setSavedMealFeedback] =
    useState<string | null>(null)
  const [highlightedMealPlanId, setHighlightedMealPlanId] =
    useState<string | null>(null)
  const [sectionState, setSectionState] =
    useState<PlannerSectionState>(
      readPlannerSectionState,
    )
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
  const aiFailureModal =
    useHistoryModal<AiFailureFeedback>(
      'ai-meal-plan-failure',
    )

  useEffect(() => {
    window.localStorage.setItem(
      PLANNER_SECTION_STATE_KEY,
      JSON.stringify(sectionState),
    )
  }, [sectionState])

  useEffect(() => {
    if (!openAiRecommendation) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      setSectionState((current) => ({
        ...current,
        recommendations: false,
      }))

      window.requestAnimationFrame(() => {
        recommendationSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [openAiRecommendation])

  function toggleSection(
    section: keyof PlannerSectionState,
  ) {
    setSectionState((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

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

  useEffect(
    () => () => {
      if (
        savedMealFeedbackTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          savedMealFeedbackTimeoutRef.current,
        )
      }
    },
    [],
  )

  function clearSavedMealConfirmation() {
    if (
      savedMealFeedbackTimeoutRef.current !== null
    ) {
      window.clearTimeout(
        savedMealFeedbackTimeoutRef.current,
      )
      savedMealFeedbackTimeoutRef.current = null
    }

    setSavedMealFeedback(null)
    setHighlightedMealPlanId(null)
  }

  function showSavedMealConfirmation(
    message: string,
    mealPlanId: string,
  ) {
    clearSavedMealConfirmation()
    setSavedMealFeedback(message)
    setHighlightedMealPlanId(mealPlanId)
    savedMealFeedbackTimeoutRef.current =
      window.setTimeout(() => {
        setSavedMealFeedback(null)
        setHighlightedMealPlanId(null)
        savedMealFeedbackTimeoutRef.current = null
      }, 2800)
  }

  function resetEditor() {
    setMealName('')
    setSelectedRecipeId(null)
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
    const matchedRecipe =
      (selectedRecipeId
        ? recipes.find(
            (recipe) =>
              recipe.id === selectedRecipeId,
          )
        : undefined) ??
      recipes.find(
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
      const savedMealPlanId = `${date}-${mealType}`
      setFeedback(null)
      showSavedMealConfirmation(
        `${savedMealName} · ${formatMealPlanDate(date)} ${mealTypeLabels[mealType]}에 ${wasEditing ? '수정했어요.' : '추가했어요.'}`,
        savedMealPlanId,
      )
      setSectionState((current) => ({
        ...current,
        schedule: false,
      }))

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const savedCard =
            mealPlansSectionRef.current?.querySelector(
              `[data-meal-plan-id="${savedMealPlanId}"]`,
            )

          savedCard?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          })
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
    clearSavedMealConfirmation()
    setDate(mealPlan.date)
    setMealType(mealPlan.type)
    setMealName(mealPlan.name)
    setSelectedRecipeId(mealPlan.recipeId ?? null)
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
    selection: RecipeSelection,
  ) {
    const recipe = selection.recipeId
      ? recipes.find(
          (candidate) =>
            candidate.id === selection.recipeId,
        )
      : recipes.find(
          (candidate) =>
            candidate.name === selection.name,
        )

    clearSavedMealConfirmation()
    setMealName(selection.name)
    setSelectedRecipeId(
      selection.recipeId ?? recipe?.id ?? null,
    )
    setServings(
      selection.servings ?? recipe?.servings ?? 4,
    )
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

    let itemCount: number

    try {
      itemCount = replaceMealPlanRangeItems(
        createMealPlanRangeShoppingSourceId(
          rangeStartDate,
          shoppingRange,
        ),
        result.ingredients,
        {
          sourceKind: 'meal_plan',
          sourceRecipeId:
            result.selectedMealPlans.length === 1
              ? result.selectedMealPlans[0]
                  .recipeId
              : undefined,
          sourceRecipeName: [
            ...new Set(
              result.selectedMealPlans.map(
                (mealPlan) => mealPlan.name,
              ),
            ),
          ].join(', '),
          sourceMealDate: rangeStartDate,
          sourceMealTime: '저녁',
        },
      )
    } catch {
      setFeedback({
        tone: 'danger',
        title: '장보기 목록을 저장하지 못했어요.',
        message:
          '저장 공간을 확인한 뒤 다시 시도해 주세요.',
      })
      return
    }

    if (itemCount === 0) {
      setFeedback({
        tone: 'danger',
        title: '추가할 장보기 재료가 없어요.',
        message:
          '냉장고 재료와 물을 제외하면 준비할 재료가 없어요.',
      })
      return
    }

    setFeedback({
      tone: 'success',
      title: '장보기 목록을 만들었어요.',
      message: `냉장고 재료와 물을 제외한 ${itemCount}가지 재료를 저장했어요.`,
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
      {
        sourceKind: 'meal_plan',
        sourceRecipeName: [
          ...new Set(
            trial.response.plans.map(
              (mealPlan) => mealPlan.name,
            ),
          ),
        ].join(', '),
        sourceMealDate:
          trial.response.plans[0].date,
        sourceMealTime: '저녁',
      },
    )
  }

  async function prepareAiRecipeDetail(
    day: AiMealPlanDraftDay,
    openAfterReady = false,
    signal?: AbortSignal,
  ) {
    clearRecipeDetailGenerationError(day.recipeId)
    const trial = await ensureRecipeDetail(
      day,
      signal,
    )

    syncAiTrialShopping(trial)
    if (openAfterReady) {
      onOpenRecipeDetail(day.recipeId)
    }

    return trial
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
    clearRecipeDetailGenerationError(recipeId)
  }

  async function runAiTrialGeneration() {
    if (storedTrial || isGenerating) {
      return
    }

    const traceId =
      createAiMealPlanPipelineTraceId()
    let activeStage: AiMealPlanPipelineStage =
      'DRAFT_GENERATION'
    let stageStartedAt = performance.now()
    let menuCount = 0
    let savedCount = 0
    const beginStage = (
      stage: AiMealPlanPipelineStage,
    ) => {
      activeStage = stage
      stageStartedAt = performance.now()
    }
    const finishStage = () => {
      logAiMealPlanPipelineTrace({
        traceId,
        stage: activeStage,
        status: 'success',
        durationMs: Math.round(
          performance.now() - stageStartedAt,
        ),
        menuCount,
        savedCount,
      })
    }

    setAiLoadingStageIndex(0)
    setFeedback(null)
    const abortController = new AbortController()
    aiAbortControllerRef.current = abortController
    const previousMealPlans = structuredClone(mealPlans)
    const previousShoppingItems =
      structuredClone(shoppingItems)
    let plannerApplied = false
    let shoppingApplied = false

    try {
      const todayDateKey = getTodayDateKey()
      const trial = await generateTrial(
        {
          traceId,
          startDate: todayDateKey,
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
          recentMenuNames:
            getRecentMealPlanMenuNames(
              mealPlans,
              todayDateKey,
            ),
        },
        abortController.signal,
      )

      menuCount = trial.response.days.length
      finishStage()

      beginStage('DRAFT_VALIDATION')
      if (
        trial.response.days.length !== 7 ||
        trial.response.plans.length !== 7
      ) {
        throw createAiMealPlanPipelineError(
          undefined,
          activeStage,
          'OPENAI_RESPONSE_INVALID',
          'AI 식단 초안의 날짜 수가 올바르지 않습니다.',
        )
      }
      finishStage()

      beginStage('MENU_NORMALIZATION')
      if (
        trial.response.days.some(
          (day, index) =>
            !day.name.trim() ||
            trial.response.plans[index]?.name !==
              day.name,
        )
      ) {
        throw createAiMealPlanPipelineError(
          undefined,
          activeStage,
          'MENU_NAME_INVALID',
          'AI 식단의 메뉴명을 확인하지 못했습니다.',
        )
      }
      finishStage()

      beginStage('MENU_DIVERSITY_VALIDATION')
      if (
        new Set(
          trial.response.days.map((day) =>
            day.name.trim().toLowerCase(),
          ),
        ).size !== trial.response.days.length
      ) {
        throw createAiMealPlanPipelineError(
          undefined,
          activeStage,
          'MENU_DIVERSITY_INVALID',
          'AI 식단에 중복 메뉴가 포함되어 있습니다.',
        )
      }
      finishStage()

      beginStage('RECIPE_DETAIL_GENERATION')
      let detailedTrial = trial

      for (const day of trial.response.days) {
        detailedTrial = await ensureRecipeDetail(
          day,
          abortController.signal,
          false,
        )
        savedCount =
          detailedTrial.response.recipes.length
      }

      if (
        savedCount !==
        detailedTrial.response.days.length
      ) {
        throw createAiMealPlanPipelineError(
          undefined,
          activeStage,
          'RECIPE_DETAIL_FAILED',
          '상세 레시피를 모두 준비하지 못했습니다.',
        )
      }
      finishStage()

      beginStage('INGREDIENT_NORMALIZATION')
      if (
        detailedTrial.response.recipes.some(
          (recipe) =>
            recipe.ingredients.length === 0 ||
            recipe.ingredients.some(
              (ingredient) =>
                !ingredient.name.trim() ||
                !ingredient.unit.trim() ||
                !Number.isFinite(
                  ingredient.quantity,
                ) ||
                ingredient.quantity <= 0,
            ),
        )
      ) {
        throw createAiMealPlanPipelineError(
          undefined,
          activeStage,
          'INGREDIENT_NORMALIZATION_FAILED',
          '레시피 재료 단위를 정리하지 못했습니다.',
        )
      }
      finishStage()

      beginStage('IMAGE_RESOLUTION')
      detailedTrial.response.days.forEach((day) => {
        resolveRecipeImage(
          day.recipeId,
          day.name,
        )
      })
      finishStage()

      beginStage('PLANNER_SAVE')
      replaceMealPlanSlots(
        detailedTrial.response.plans,
      )
      plannerApplied = true
      finishStage()

      beginStage('SHOPPING_PREPARE')
      syncAiTrialShopping(detailedTrial)
      shoppingApplied = true
      finishStage()

      beginStage('TRIAL_COMPLETE')
      const completedTrial = completeTrial()

      if (
        completedTrial.status !== 'completed' ||
        completedTrial.response.recipes.length !==
          completedTrial.response.days.length
      ) {
        throw createAiMealPlanPipelineError(
          undefined,
          activeStage,
          'TRIAL_COMPLETE_FAILED',
          '무료 체험 완료 상태를 저장하지 못했습니다.',
        )
      }
      finishStage()

      setRangeStartDate(
        completedTrial.response.plans[0].date,
      )
      setViewRange('week')
      setFeedback({
        tone: 'success',
        title: '맞춤 7일 식단을 저장했어요.',
        message:
          completedTrial.response
            .recipes.length === 7
            ? '첫날 메뉴는 검수된 레시피를 바로 연결했어요. 다른 메뉴는 열 때 준비해드려요.'
            : '첫날 상세 레시피까지 저장했어요. 다른 메뉴는 열 때 준비해드려요.',
      })
    } catch (error) {
      const pipelineError =
        createAiMealPlanPipelineError(
          error,
          activeStage,
          pipelineFallbackErrorCodes[
            activeStage
          ],
          'AI 맞춤 식단을 완성하지 못했습니다.',
        )

      logAiMealPlanPipelineTrace({
        traceId,
        stage: pipelineError.stage,
        status: 'failure',
        errorCode: pipelineError.code,
        durationMs: Math.round(
          performance.now() - stageStartedAt,
        ),
        menuCount,
        savedCount,
      })

      if (plannerApplied) {
        replaceAllMealPlans(previousMealPlans)
      }
      if (plannerApplied || shoppingApplied) {
        replaceAllShoppingItems(
          previousShoppingItems,
        )
      }
      discardIncompleteTrial()

      beginStage('ROLLBACK')
      logAiMealPlanPipelineTrace({
        traceId,
        stage: 'ROLLBACK',
        status: 'success',
        durationMs: Math.round(
          performance.now() - stageStartedAt,
        ),
        menuCount,
        savedCount: 0,
      })

      const trialError =
        error instanceof AiMealPlanTrialError
          ? error
          : null

      if (
        trialError?.code ===
          'AI_TRIAL_CANCELLED' ||
        (isAiMealPlanPipelineError(error) &&
          error.causeCode ===
            'AI_TRIAL_CANCELLED')
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
            pipelineError.code,
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
                  onChange={(event) => {
                    clearSavedMealConfirmation()
                    setDate(event.target.value)
                  }}
                  required
                />

                <StyledSelect
                  label="식사 시간"
                  value={mealType}
                  onChange={(event) => {
                    clearSavedMealConfirmation()
                    setMealType(
                      event.target.value as MealType,
                    )
                  }}
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
                  onChange={(event) => {
                    clearSavedMealConfirmation()
                    const nextMealName = event.target.value
                    setMealName(event.target.value)
                    setSelectedRecipeId(
                      recipes.find(
                        (recipe) =>
                          recipe.name
                            .trim()
                            .toLowerCase() ===
                          nextMealName.trim().toLowerCase(),
                      )?.id ?? null,
                    )
                  }}
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
                onValueChange={(value) => {
                  clearSavedMealConfirmation()
                  setServings(value)
                }}
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
            collapsible
            collapsed={sectionState.schedule}
            onToggle={() =>
              toggleSection('schedule')
            }
          >
            <Card>
              {savedMealFeedback ? (
                <p
                  className="meal-plan-save-feedback"
                  role="status"
                >
                  {savedMealFeedback}
                </p>
              ) : null}
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
                        data-meal-plan-id={mealPlan.id}
                        className={`inventory-item${
                          highlightedMealPlanId ===
                          mealPlan.id
                            ? ' inventory-item--highlighted'
                            : ''
                        }`}
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

        <div ref={recommendationSectionRef}>
          <RecipeRecommendationBlock
            onSelectRecipe={
              handleSelectRecommendedRecipe
            }
            onViewRecipe={onOpenRecipeDetail}
            onOpenInventory={() =>
              onChangePage('inventory')
            }
            onOpenShopping={() =>
              onChangePage('shopping')
            }
            autoStartAi={openAiRecommendation}
            onAiStarted={onAiRecommendationStarted}
            collapsed={sectionState.recommendations}
            onToggle={() =>
              toggleSection('recommendations')
            }
          />
        </div>

        <Section
          title="식단으로 장보기"
          description="선택한 기간의 재료를 합치고 냉장고에 있는 양을 제외해요."
          collapsible
          collapsed={sectionState.shopping}
          onToggle={() =>
            toggleSection('shopping')
          }
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
                물은 장보기 목록에서 제외해요.
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
            collapsible
            collapsed={sectionState.aiTrial}
            onToggle={() =>
              toggleSection('aiTrial')
            }
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
                        const imageResolution =
                          resolveRecipeImage(
                            day.recipeId,
                            day.name,
                          )

                        return (
                        <li
                          key={day.recipeId}
                          className="ai-trial-recipe-card"
                          data-image-key={
                            imageResolution?.imageKey
                          }
                          data-image-match={
                            imageResolution?.match ??
                            'placeholder'
                          }
                        >
                          {imageResolution ? (
                            <img
                              className="ai-trial-recipe-card__image"
                              src={imageResolution.src}
                              alt={`${day.name} 음식 사진`}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div
                              className="ai-trial-recipe-card__image ai-trial-recipe-card__image--placeholder"
                              role="img"
                              aria-label={`${day.name} 대표 사진 없음`}
                            >
                              <Utensils
                                size={26}
                                aria-hidden="true"
                              />
                              <small>
                                대표 사진이 아직 없어요.
                              </small>
                              <small>
                                레시피는 정상적으로 이용할 수 있습니다.
                              </small>
                            </div>
                          )}
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
                          {recipeDetailGenerationStates[
                            day.recipeId
                          ]?.status === 'error' ? (
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
                    <span
                      className="ai-trial-checkbox__visual"
                      aria-hidden="true"
                    >
                      <Check size={15} strokeWidth={3} />
                    </span>
                    <span className="ai-trial-checkbox__label">
                      아이와 함께 먹어요
                    </span>
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

      </main>

      <Dialog
        className="ai-trial-failure-dialog"
        open={aiFailureModal.isOpen}
        title={
          aiFailureModal.value?.title ??
          '식단을 완성하지 못했어요.'
        }
        description={
          aiFailureModal.value?.message ??
          '잠시 후 다시 시도해 주세요.'
        }
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
        {null}
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

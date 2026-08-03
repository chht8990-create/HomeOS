import {
  useEffect,
  useRef,
  useState,
} from 'react'
import './App.css'
import BrandSplash from './components/BrandSplash'
import FirstRunTutorial from './components/FirstRunTutorial'
import MealPlanWelcomeDialog from './components/MealPlanWelcomeDialog'
import Toast from './components/ui/Toast'
import BottomNavigation, {
  type PageName,
} from './components/BottomNavigation'
import useShoppingList from './hooks/useShoppingList'
import useMealPlan from './hooks/useMealPlan'
import useRecipes from './hooks/useRecipes'
import useTutorialSettings from './hooks/useTutorialSettings'
import {
  hasActiveHistoryModal,
  HISTORY_MODAL_CHANGE_EVENT,
} from './hooks/useHistoryModal'
import FeedbackPage from './pages/FeedbackPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import GuidePage from './pages/GuidePage'
import InventoryPage from './pages/InventoryPage'
import HomePage from './pages/HomePage'
import MealPlanPage from './pages/MealPlanPage'
import PrivacyPage from './pages/PrivacyPage'
import RecipePage from './pages/RecipePage'
import SettingsPage from './pages/SettingsPage'
import ShoppingPage from './pages/ShoppingPage'
import TermsPage from './pages/TermsPage'
import type { Ingredient } from './types/ingredient'
import { createDefaultMonthlyMealPlans } from './services/defaultMealPlanEngine'
import {
  createNavigationState,
  createNavigationUrl,
  createPwaExitGuardState,
  isPwaExitGuardState,
  isSameNavigationTarget,
  isTopLevelNavigationState,
  planTopLevelNavigation,
  readNavigationState,
  shouldUsePwaBackExit,
  type AppNavigationState,
} from './services/appNavigationEngine'

const MEAL_PLAN_WELCOME_STORAGE_KEY =
  'today-table.mealPlanWelcome.v1'
const PWA_BACK_EXIT_TIMEOUT_MS = 2_000

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

function shouldShowMealPlanWelcome() {
  if (
    window.localStorage.getItem(
      MEAL_PLAN_WELCOME_STORAGE_KEY,
    )
  ) {
    return false
  }

  try {
    const storedMealPlans = JSON.parse(
      window.localStorage.getItem(
        'homeos.mealPlan.items',
      ) ?? '[]',
    )

    return (
      Array.isArray(storedMealPlans) &&
      storedMealPlans.length === 0
    )
  } catch {
    return true
  }
}

type RecipeMatchedEventDetail = {
  sourceId: string
  previousSourceId?: string
  ingredients: Ingredient[]
  sourceRecipeId?: string
  sourceRecipeName?: string
  sourceMealDate?: string
  sourceMealTime?: string
}

type MealClearedEventDetail = {
  sourceId: string
  previousSourceId?: string
}

function App() {
  const [navigation, setNavigation] =
    useState<AppNavigationState>(() => {
      const initialNavigation =
        readNavigationState(
          window.history.state,
          window.location.search,
          window.location.pathname,
        )

      return createNavigationState({
        ...initialNavigation,
        overlay: null,
      })
    })
  const navigationRef = useRef(navigation)
  const currentPage = navigation.page
  const recipeEntryId = navigation.recipeId
  const plannerRecipeName =
    navigation.plannerRecipeName
  const openAiTrial = navigation.openAiTrial
  const showInventoryRecommendations =
    navigation.showInventoryRecommendations
  const {
    doNotShowAgain,
    completeTutorial,
  } = useTutorialSettings()
  const [
    isFirstRunTutorialOpen,
    setIsFirstRunTutorialOpen,
  ] = useState(
    !doNotShowAgain &&
      currentPage !== 'privacy' &&
      currentPage !== 'terms',
  )
  const firstRunTutorialOpenRef = useRef(
    isFirstRunTutorialOpen,
  )
  const initiallyShowTutorialRef = useRef(
    isFirstRunTutorialOpen,
  )
  const tutorialReplayRef = useRef(false)
  const [
    isMealPlanWelcomeOpen,
    setIsMealPlanWelcomeOpen,
  ] = useState(
    () =>
      doNotShowAgain &&
      currentPage !== 'privacy' &&
      currentPage !== 'terms' &&
      shouldShowMealPlanWelcome(),
  )
  const mealPlanWelcomeOpenRef = useRef(
    isMealPlanWelcomeOpen,
  )
  const initiallyShowWelcomeRef = useRef(
    isMealPlanWelcomeOpen,
  )
  const historyInitializedRef = useRef(false)
  const isTopLevelHistoryTravelingRef =
    useRef(false)
  const isStandalonePwaRef = useRef(
    shouldUsePwaBackExit(
      window.matchMedia(
        '(display-mode: standalone)',
      ).matches,
      (navigator as Navigator & {
        standalone?: boolean
      }).standalone === true,
    ),
  )
  const backExitPendingRef = useRef(false)
  const backExitTimeoutRef =
    useRef<number | null>(null)
  const exitGuardActiveRef = useRef(
    isPwaExitGuardState(window.history.state),
  )
  const [isBackExitToastVisible, setIsBackExitToastVisible] =
    useState(false)
  const [openAiRecommendation, setOpenAiRecommendation] =
    useState(false)
  const pageContainerRef =
    useRef<HTMLDivElement>(null)
  const previousLocationRef = useRef(
    `${currentPage}:${recipeEntryId ?? ''}`,
  )

  const {
    addMealItems,
    removeMealItems,
  } = useShoppingList()
  const {
    mealPlans,
    replaceAllMealPlans,
  } = useMealPlan()
  const { recipes } = useRecipes()

  function resetBackExitPending() {
    backExitPendingRef.current = false
    setIsBackExitToastVisible(false)

    if (backExitTimeoutRef.current !== null) {
      window.clearTimeout(
        backExitTimeoutRef.current,
      )
      backExitTimeoutRef.current = null
    }
  }

  function ensurePwaExitGuard(
    nextNavigation: AppNavigationState,
  ) {
    if (
      !isStandalonePwaRef.current ||
      !isTopLevelNavigationState(
        nextNavigation,
      ) ||
      isPwaExitGuardState(
        window.history.state,
      )
    ) {
      exitGuardActiveRef.current =
        isPwaExitGuardState(
          window.history.state,
        )
      return
    }

    window.history.pushState(
      createPwaExitGuardState(
        nextNavigation,
      ),
      '',
      createNavigationUrl(
        nextNavigation,
        window.location.href,
      ),
    )
    exitGuardActiveRef.current = true
  }

  useEffect(() => {
    if (!historyInitializedRef.current) {
      const baseNavigation =
        createNavigationState({
          ...navigationRef.current,
          overlay: null,
        })

      window.history.replaceState(
        baseNavigation,
        '',
        createNavigationUrl(
          baseNavigation,
          window.location.href,
        ),
      )
      navigationRef.current = baseNavigation

      if (initiallyShowTutorialRef.current) {
        const tutorialNavigation =
          createNavigationState({
            ...baseNavigation,
            index: baseNavigation.index + 1,
            overlay: 'firstRunTutorial',
          })

        window.history.pushState(
          tutorialNavigation,
          '',
          createNavigationUrl(
            tutorialNavigation,
            window.location.href,
          ),
        )
        navigationRef.current =
          tutorialNavigation
      } else if (
        initiallyShowWelcomeRef.current
      ) {
        const welcomeNavigation =
          createNavigationState({
            ...baseNavigation,
            index: baseNavigation.index + 1,
            overlay: 'mealPlanWelcome',
          })

        window.history.pushState(
          welcomeNavigation,
          '',
          createNavigationUrl(
            welcomeNavigation,
            window.location.href,
          ),
        )
        navigationRef.current = welcomeNavigation
      }

      historyInitializedRef.current = true
      ensurePwaExitGuard(
        navigationRef.current,
      )
    }

    function handlePopState(event: PopStateEvent) {
      const nextNavigation = readNavigationState(
        event.state,
        window.location.search,
        window.location.pathname,
      )
      const currentNavigation =
        navigationRef.current

      if (
        isStandalonePwaRef.current &&
        isTopLevelNavigationState(
          currentNavigation,
        ) &&
        exitGuardActiveRef.current &&
        !isPwaExitGuardState(event.state) &&
        !hasActiveHistoryModal()
      ) {
        if (backExitPendingRef.current) {
          resetBackExitPending()
          exitGuardActiveRef.current = false
          window.setTimeout(() => {
            window.history.back()
          }, 0)
          return
        }

        backExitPendingRef.current = true
        setIsBackExitToastVisible(true)
        ensurePwaExitGuard(currentNavigation)
        backExitTimeoutRef.current =
          window.setTimeout(() => {
            backExitPendingRef.current = false
            backExitTimeoutRef.current = null
            setIsBackExitToastVisible(false)
          }, PWA_BACK_EXIT_TIMEOUT_MS)
        return
      }

      const nextWelcomeOpen =
        nextNavigation.overlay ===
        'mealPlanWelcome'
      const nextTutorialOpen =
        nextNavigation.overlay ===
        'firstRunTutorial'

      if (
        mealPlanWelcomeOpenRef.current &&
        !nextWelcomeOpen
      ) {
        window.localStorage.setItem(
          MEAL_PLAN_WELCOME_STORAGE_KEY,
          'seen',
        )
      }

      navigationRef.current = nextNavigation
      exitGuardActiveRef.current =
        isPwaExitGuardState(event.state)
      resetBackExitPending()
      firstRunTutorialOpenRef.current =
        nextTutorialOpen
      mealPlanWelcomeOpenRef.current =
        nextWelcomeOpen
      setNavigation(nextNavigation)
      setIsFirstRunTutorialOpen(
        nextTutorialOpen,
      )
      setIsMealPlanWelcomeOpen(nextWelcomeOpen)
      window.requestAnimationFrame(() => {
        ensurePwaExitGuard(nextNavigation)
      })
    }

    window.addEventListener(
      'popstate',
      handlePopState,
    )

    return () => {
      window.removeEventListener(
        'popstate',
        handlePopState,
      )
    }
  }, [])

  useEffect(() => {
    function clearBackExitPending() {
      backExitPendingRef.current = false
      setIsBackExitToastVisible(false)

      if (backExitTimeoutRef.current !== null) {
        window.clearTimeout(
          backExitTimeoutRef.current,
        )
        backExitTimeoutRef.current = null
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        return
      }

      clearBackExitPending()
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )
    window.addEventListener(
      HISTORY_MODAL_CHANGE_EVENT,
      clearBackExitPending,
    )

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
      window.removeEventListener(
        HISTORY_MODAL_CHANGE_EVENT,
        clearBackExitPending,
      )

      if (backExitTimeoutRef.current !== null) {
        window.clearTimeout(
          backExitTimeoutRef.current,
        )
      }
    }
  }, [])

  useEffect(() => {
    const nextLocation =
      `${currentPage}:${recipeEntryId ?? ''}`

    if (
      previousLocationRef.current === nextLocation
    ) {
      return
    }

    previousLocationRef.current = nextLocation
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    })

    const focusFrame = window.requestAnimationFrame(
      () => {
        pageContainerRef.current?.focus({
          preventScroll: true,
        })
      },
    )

    return () => {
      window.cancelAnimationFrame(focusFrame)
    }
  }, [currentPage, recipeEntryId])

  useEffect(() => {
    function handleRecipeMatched(event: Event) {
      const customEvent =
        event as CustomEvent<RecipeMatchedEventDetail>

      addMealItems(
        customEvent.detail.sourceId,
        customEvent.detail.ingredients,
        customEvent.detail.previousSourceId,
        {
          sourceKind: 'recipe',
          sourceRecipeId:
            customEvent.detail.sourceRecipeId,
          sourceRecipeName:
            customEvent.detail.sourceRecipeName,
          sourceMealDate:
            customEvent.detail.sourceMealDate,
          sourceMealTime:
            customEvent.detail.sourceMealTime,
        },
      )
    }

    function handleMealCleared(event: Event) {
      const customEvent =
        event as CustomEvent<MealClearedEventDetail>

      removeMealItems(
        customEvent.detail.sourceId,
        customEvent.detail.previousSourceId,
      )
    }

    window.addEventListener(
      'homeos:meal-recipe-matched',
      handleRecipeMatched,
    )

    window.addEventListener(
      'homeos:meal-cleared',
      handleMealCleared,
    )

    return () => {
      window.removeEventListener(
        'homeos:meal-recipe-matched',
        handleRecipeMatched,
      )

      window.removeEventListener(
        'homeos:meal-cleared',
        handleMealCleared,
      )
    }
  }, [addMealItems, removeMealItems])

  function commitNavigation(
    overrides: Partial<AppNavigationState>,
    mode: 'push' | 'replace' = 'push',
  ) {
    const currentNavigation =
      navigationRef.current
    const nextNavigation = createNavigationState({
      ...currentNavigation,
      ...overrides,
      index:
        mode === 'push'
          ? currentNavigation.index + 1
          : currentNavigation.index,
    })

    if (
      isSameNavigationTarget(
        currentNavigation,
        nextNavigation,
      )
    ) {
      return
    }

    const nextUrl = createNavigationUrl(
      nextNavigation,
      window.location.href,
    )
    const nextHistoryState =
      mode === 'replace' &&
      isPwaExitGuardState(
        window.history.state,
      ) &&
      isTopLevelNavigationState(
        nextNavigation,
      )
        ? createPwaExitGuardState(
            nextNavigation,
          )
        : nextNavigation

    if (mode === 'replace') {
      window.history.replaceState(
        nextHistoryState,
        '',
        nextUrl,
      )
    } else {
      window.history.pushState(
        nextHistoryState,
        '',
        nextUrl,
      )
    }

    navigationRef.current = nextNavigation
    exitGuardActiveRef.current =
      isPwaExitGuardState(nextHistoryState)
    resetBackExitPending()
    firstRunTutorialOpenRef.current =
      nextNavigation.overlay ===
      'firstRunTutorial'
    mealPlanWelcomeOpenRef.current =
      nextNavigation.overlay ===
      'mealPlanWelcome'
    setNavigation(nextNavigation)
    setIsFirstRunTutorialOpen(
      firstRunTutorialOpenRef.current,
    )
    setIsMealPlanWelcomeOpen(
      mealPlanWelcomeOpenRef.current,
    )
  }

  function navigateToPage(page: PageName) {
    setOpenAiRecommendation(false)
    commitNavigation({
      page,
      recipeId: null,
      plannerRecipeName: null,
      openAiTrial: false,
      showInventoryRecommendations: false,
      overlay: null,
    })
  }

  function navigateToTopLevelPage(page: PageName) {
    setOpenAiRecommendation(false)
    if (isTopLevelHistoryTravelingRef.current) {
      return
    }

    const currentNavigation =
      navigationRef.current
    const navigationPlan =
      planTopLevelNavigation(
        currentNavigation,
        page,
      )
    const pageOverrides: Partial<AppNavigationState> = {
      page,
      recipeId: null,
      plannerRecipeName: null,
      openAiTrial: false,
      showInventoryRecommendations: false,
      overlay: null,
    }

    if (navigationPlan.kind === 'none') {
      return
    }

    if (navigationPlan.kind === 'push') {
      commitNavigation(pageOverrides, 'push')
      return
    }

    if (navigationPlan.kind === 'replace') {
      commitNavigation(pageOverrides, 'replace')
      return
    }

    isTopLevelHistoryTravelingRef.current = true

    window.addEventListener(
      'popstate',
      () => {
        isTopLevelHistoryTravelingRef.current =
          false

        if (
          navigationPlan.kind ===
          'back-and-replace'
        ) {
          commitNavigation(
            pageOverrides,
            'replace',
          )
        }
      },
      { once: true },
    )
    window.history.go(navigationPlan.delta)
  }

  function openRecipeDetail(recipeId: string) {
    commitNavigation({
      page: 'recipes',
      recipeId,
      plannerRecipeName: null,
      openAiTrial: false,
      showInventoryRecommendations:
        navigationRef.current
          .showInventoryRecommendations,
      overlay: null,
    })
  }

  function closeRecipeDetail() {
    if (navigationRef.current.index > 0) {
      window.history.back()
      return
    }

    commitNavigation(
      {
        page: 'recipes',
        recipeId: null,
        plannerRecipeName: null,
        openAiTrial: false,
        showInventoryRecommendations:
          navigationRef.current
            .showInventoryRecommendations,
        overlay: null,
      },
      'replace',
    )
  }

  function openPlannerWithRecipe(recipeName: string) {
    commitNavigation({
      page: 'mealPlan',
      recipeId: null,
      plannerRecipeName: recipeName,
        openAiTrial: false,
        showInventoryRecommendations: false,
        overlay: null,
    })
  }

  function consumePlannerRecipeContext() {
    if (
      navigationRef.current.page !==
        'mealPlan' ||
      navigationRef.current.plannerRecipeName ===
        null
    ) {
      return
    }

    commitNavigation(
      { plannerRecipeName: null },
      'replace',
    )
  }

  function closeFirstRunTutorial() {
    tutorialReplayRef.current = false
    firstRunTutorialOpenRef.current = false
    setIsFirstRunTutorialOpen(false)

    if (
      navigationRef.current.overlay ===
        'firstRunTutorial' &&
      navigationRef.current.index > 0
    ) {
      window.history.back()
      return
    }

    commitNavigation(
      { overlay: null },
      'replace',
    )
  }

  function handleTutorialComplete(
    shouldNotShowAgain: boolean,
  ) {
    const isReplay = tutorialReplayRef.current

    completeTutorial(
      isReplay
        ? doNotShowAgain
        : shouldNotShowAgain,
    )
    firstRunTutorialOpenRef.current = false
    setIsFirstRunTutorialOpen(false)

    if (tutorialReplayRef.current) {
      tutorialReplayRef.current = false
      closeFirstRunTutorial()
      return
    }

    if (shouldShowMealPlanWelcome()) {
      commitNavigation(
        { overlay: 'mealPlanWelcome' },
        'replace',
      )
      return
    }

    closeFirstRunTutorial()
  }

  function openGuideFromTutorial(
    shouldNotShowAgain: boolean,
  ) {
    completeTutorial(
      tutorialReplayRef.current
        ? doNotShowAgain
        : shouldNotShowAgain,
    )
    tutorialReplayRef.current = false
    firstRunTutorialOpenRef.current = false
    setIsFirstRunTutorialOpen(false)
    commitNavigation(
      {
        page: 'guide',
        recipeId: null,
        plannerRecipeName: null,
      openAiTrial: false,
      showInventoryRecommendations: false,
      overlay: null,
      },
      'replace',
    )
  }

  function openInventoryRecommendations() {
    commitNavigation({
      page: 'recipes',
      recipeId: null,
      plannerRecipeName: null,
      openAiTrial: false,
      showInventoryRecommendations: true,
      overlay: null,
    })
  }

  function startAiRecommendation() {
    setOpenAiRecommendation(true)
    commitNavigation({
      page: 'mealPlan',
      recipeId: null,
      plannerRecipeName: null,
      openAiTrial: false,
      showInventoryRecommendations: false,
      overlay: null,
    })
  }

  function replayTutorial() {
    tutorialReplayRef.current = true
    commitNavigation({
      overlay: 'firstRunTutorial',
    })
  }

  function closeGuide() {
    if (navigationRef.current.index > 0) {
      window.history.back()
      return
    }

    commitNavigation(
      {
        page: 'settings',
        recipeId: null,
        plannerRecipeName: null,
        openAiTrial: false,
        showInventoryRecommendations: false,
        overlay: null,
      },
      'replace',
    )
  }

  function closeFeedback() {
    if (navigationRef.current.index > 0) {
      window.history.back()
      return
    }

    commitNavigation(
      {
        page: 'settings',
        recipeId: null,
        plannerRecipeName: null,
        openAiTrial: false,
        showInventoryRecommendations: false,
        overlay: null,
      },
      'replace',
    )
  }

  function closeLegalPage() {
    if (navigationRef.current.index > 0) {
      window.history.back()
      return
    }

    commitNavigation(
      {
        page: 'settings',
        recipeId: null,
        plannerRecipeName: null,
        openAiTrial: false,
        showInventoryRecommendations: false,
        overlay: null,
      },
      'replace',
    )
  }

  function markMealPlanWelcomeSeen() {
    window.localStorage.setItem(
      MEAL_PLAN_WELCOME_STORAGE_KEY,
      'seen',
    )
    mealPlanWelcomeOpenRef.current = false
    setIsMealPlanWelcomeOpen(false)
  }

  function closeMealPlanWelcome() {
    markMealPlanWelcomeSeen()

    if (
      navigationRef.current.overlay ===
        'mealPlanWelcome' &&
      navigationRef.current.index > 0
    ) {
      window.history.back()
      return
    }

    commitNavigation(
      { overlay: null },
      'replace',
    )
  }

  function startDefaultMealPlan() {
    if (mealPlans.length === 0) {
      replaceAllMealPlans(
        createDefaultMonthlyMealPlans(
          getTodayDateKey(),
          recipes,
        ),
      )
    }

    const navigationMode =
      navigationRef.current.overlay ===
      'mealPlanWelcome'
        ? 'replace'
        : 'push'

    markMealPlanWelcomeSeen()
    commitNavigation(
      {
        page: 'mealPlan',
        recipeId: null,
        plannerRecipeName: null,
        openAiTrial: false,
        showInventoryRecommendations: false,
        overlay: null,
      },
      navigationMode,
    )
  }

  function startAiMealPlanTrial() {
    const navigationMode =
      navigationRef.current.overlay ===
      'mealPlanWelcome'
        ? 'replace'
        : 'push'

    markMealPlanWelcomeSeen()
    commitNavigation(
      {
        page: 'mealPlan',
        recipeId: null,
        plannerRecipeName: null,
        openAiTrial: true,
        showInventoryRecommendations: false,
        overlay: null,
      },
      navigationMode,
    )
  }

  function renderPage() {
    switch (currentPage) {
      case 'mealPlan':
        return (
          <MealPlanPage
            initialRecipeName={
              plannerRecipeName ?? undefined
            }
            onChangePage={navigateToPage}
            onOpenRecipeDetail={openRecipeDetail}
            onInitialRecipeConsumed={
              consumePlannerRecipeContext
            }
            openAiTrial={openAiTrial}
            openAiRecommendation={openAiRecommendation}
            onAiRecommendationStarted={() =>
              setOpenAiRecommendation(false)
            }
          />
        )

      case 'shopping':
        return (
          <ShoppingPage
            onChangePage={navigateToPage}
          />
        )

      case 'inventory':
        return (
          <InventoryPage
            onOpenRecommendations={
              openInventoryRecommendations
            }
          />
        )

      case 'recipes':
        return (
          <RecipePage
            selectedRecipeId={recipeEntryId}
            onChangePage={navigateToPage}
            onOpenRecipeDetail={openRecipeDetail}
            onCloseRecipeDetail={closeRecipeDetail}
            showInventoryRecommendations={
              showInventoryRecommendations
            }
          />
        )

      case 'settings':
        return (
          <SettingsPage
            onOpenGuide={() =>
              navigateToPage('guide')
            }
            onOpenFeedback={() =>
              navigateToPage('feedback')
            }
            onOpenPrivacy={() =>
              navigateToPage('privacy')
            }
            onOpenTerms={() =>
              navigateToPage('terms')
            }
            onReplayTutorial={replayTutorial}
          />
        )

      case 'guide':
        return (
          <GuidePage
            onBack={closeGuide}
            onOpenFeedback={() =>
              navigateToPage('feedback')
            }
          />
        )

      case 'feedback':
        return (
          <FeedbackPage onBack={closeFeedback} />
        )

      case 'privacy':
        return (
          <PrivacyPage onBack={closeLegalPage} />
        )

      case 'terms':
        return <TermsPage onBack={closeLegalPage} />

      case 'admin':
        return (
          <AdminDashboardPage
            onBack={() => navigateToPage('settings')}
          />
        )

      case 'today':
      default:
        return (
          <HomePage
            onChangePage={navigateToPage}
            onOpenRecipeDetail={openRecipeDetail}
            onPlanRecipe={openPlannerWithRecipe}
            onStartAiRecommendation={
              startAiRecommendation
            }
          />
        )
    }
  }

  const pageLabels: Record<PageName, string> = {
    today: '홈',
    mealPlan: '이번 주 식사',
    shopping: '장보기 목록',
    inventory: '냉장고',
    recipes: '레시피',
    settings: '더보기',
    guide: '오늘식탁 사용 가이드',
    feedback: '의견 보내기',
    privacy: '개인정보처리방침',
    terms: '이용약관',
    admin: '운영 대시보드',
  }
  const isUtilityPage =
    currentPage === 'shopping' ||
    currentPage === 'inventory' ||
    currentPage === 'settings' ||
    currentPage === 'guide' ||
    currentPage === 'feedback' ||
    currentPage === 'privacy' ||
    currentPage === 'terms' ||
    currentPage === 'admin'
  const appClassName = [
    'app',
    currentPage === 'today' ? 'app--home' : '',
    currentPage === 'recipes' ? 'app--recipe' : '',
    isUtilityPage ? 'app--utility' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={appClassName}>
      <BrandSplash />

      <div
        ref={pageContainerRef}
        className="app-page"
        role="region"
        aria-label={`${pageLabels[currentPage]} 페이지`}
        tabIndex={-1}
      >
        {renderPage()}
      </div>

      <BottomNavigation
        currentPage={
          currentPage === 'mealPlan'
            ? 'recipes'
            : currentPage === 'guide'
              ? 'settings'
              : currentPage === 'feedback'
                ? 'settings'
                : currentPage === 'privacy'
                  ? 'settings'
                  : currentPage === 'terms'
                    ? 'settings'
                : currentPage === 'admin'
                  ? 'settings'
            : currentPage
        }
        onChangePage={navigateToTopLevelPage}
      />

      {isBackExitToastVisible ? (
        <Toast className="pwa-back-exit-toast">
          한 번 더 누르면 오늘식탁을 종료해요.
        </Toast>
      ) : null}

      <MealPlanWelcomeDialog
        open={isMealPlanWelcomeOpen}
        onClose={closeMealPlanWelcome}
        onStartDefaultPlan={startDefaultMealPlan}
        onStartAiTrial={startAiMealPlanTrial}
      />

      <FirstRunTutorial
        open={isFirstRunTutorialOpen}
        onClose={closeFirstRunTutorial}
        onComplete={handleTutorialComplete}
        onOpenGuide={openGuideFromTutorial}
      />
    </div>
  )
}

export default App

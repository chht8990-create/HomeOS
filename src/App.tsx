import {
  useEffect,
  useRef,
  useState,
} from 'react'
import './App.css'
import BrandSplash from './components/BrandSplash'
import FirstRunTutorial from './components/FirstRunTutorial'
import MealPlanWelcomeDialog from './components/MealPlanWelcomeDialog'
import BottomNavigation, {
  type PageName,
} from './components/BottomNavigation'
import useShoppingList from './hooks/useShoppingList'
import useMealPlan from './hooks/useMealPlan'
import useRecipes from './hooks/useRecipes'
import useTutorialSettings from './hooks/useTutorialSettings'
import GuidePage from './pages/GuidePage'
import InventoryPage from './pages/InventoryPage'
import HomePage from './pages/HomePage'
import MealPlanPage from './pages/MealPlanPage'
import RecipePage from './pages/RecipePage'
import SettingsPage from './pages/SettingsPage'
import ShoppingPage from './pages/ShoppingPage'
import type { Ingredient } from './types/ingredient'
import { createDefaultMonthlyMealPlans } from './services/defaultMealPlanEngine'
import {
  createNavigationState,
  createNavigationUrl,
  isSameNavigationTarget,
  planTopLevelNavigation,
  readNavigationState,
  type AppNavigationState,
} from './services/appNavigationEngine'

const MEAL_PLAN_WELCOME_STORAGE_KEY =
  'today-table.mealPlanWelcome.v1'

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
  const {
    doNotShowAgain,
    completeTutorial,
  } = useTutorialSettings()
  const [
    isFirstRunTutorialOpen,
    setIsFirstRunTutorialOpen,
  ] = useState(!doNotShowAgain)
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
    }

    function handlePopState(event: PopStateEvent) {
      const nextNavigation = readNavigationState(
        event.state,
        window.location.search,
      )
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
      firstRunTutorialOpenRef.current =
        nextTutorialOpen
      mealPlanWelcomeOpenRef.current =
        nextWelcomeOpen
      setNavigation(nextNavigation)
      setIsFirstRunTutorialOpen(
        nextTutorialOpen,
      )
      setIsMealPlanWelcomeOpen(nextWelcomeOpen)
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

    if (mode === 'replace') {
      window.history.replaceState(
        nextNavigation,
        '',
        nextUrl,
      )
    } else {
      window.history.pushState(
        nextNavigation,
        '',
        nextUrl,
      )
    }

    navigationRef.current = nextNavigation
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
    commitNavigation({
      page,
      recipeId: null,
      plannerRecipeName: null,
      openAiTrial: false,
      overlay: null,
    })
  }

  function navigateToTopLevelPage(page: PageName) {
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
    completeTutorial(shouldNotShowAgain)
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
          />
        )

      case 'shopping':
        return (
          <ShoppingPage
            onChangePage={navigateToPage}
          />
        )

      case 'inventory':
        return <InventoryPage />

      case 'recipes':
        return (
          <RecipePage
            selectedRecipeId={recipeEntryId}
            onChangePage={navigateToPage}
            onOpenRecipeDetail={openRecipeDetail}
            onCloseRecipeDetail={closeRecipeDetail}
          />
        )

      case 'settings':
        return (
          <SettingsPage
            onOpenGuide={() =>
              navigateToPage('guide')
            }
            onReplayTutorial={replayTutorial}
          />
        )

      case 'guide':
        return <GuidePage onBack={closeGuide} />

      case 'today':
      default:
        return (
          <HomePage
            onChangePage={navigateToPage}
            onOpenRecipeDetail={openRecipeDetail}
            onPlanRecipe={openPlannerWithRecipe}
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
  }
  const isUtilityPage =
    currentPage === 'shopping' ||
    currentPage === 'inventory' ||
    currentPage === 'settings' ||
    currentPage === 'guide'
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
            : currentPage
        }
        onChangePage={navigateToTopLevelPage}
      />

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
      />
    </div>
  )
}

export default App

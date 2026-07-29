import {
  useEffect,
  useRef,
  useState,
} from 'react'
import './App.css'
import BrandSplash from './components/BrandSplash'
import MealPlanWelcomeDialog from './components/MealPlanWelcomeDialog'
import BottomNavigation, {
  type PageName,
} from './components/BottomNavigation'
import useShoppingList from './hooks/useShoppingList'
import useMealPlan from './hooks/useMealPlan'
import useRecipes from './hooks/useRecipes'
import InventoryPage from './pages/InventoryPage'
import HomePage from './pages/HomePage'
import MealPlanPage from './pages/MealPlanPage'
import RecipePage from './pages/RecipePage'
import SettingsPage from './pages/SettingsPage'
import ShoppingPage from './pages/ShoppingPage'
import type { Ingredient } from './types/ingredient'
import { createDefaultMonthlyMealPlans } from './services/defaultMealPlanEngine'

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
  const [currentPage, setCurrentPage] =
    useState<PageName>('today')
  const [recipeEntryId, setRecipeEntryId] =
    useState<string | null>(null)
  const [plannerRecipeName, setPlannerRecipeName] =
    useState<string | null>(null)
  const [openAiTrial, setOpenAiTrial] =
    useState(false)
  const [
    isMealPlanWelcomeOpen,
    setIsMealPlanWelcomeOpen,
  ] = useState(shouldShowMealPlanWelcome)
  const pageContainerRef =
    useRef<HTMLDivElement>(null)
  const previousPageRef = useRef(currentPage)

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
    if (previousPageRef.current === currentPage) {
      return
    }

    previousPageRef.current = currentPage
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
  }, [currentPage])

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

  function navigateToPage(page: PageName) {
    setRecipeEntryId(null)
    setPlannerRecipeName(null)
    setOpenAiTrial(false)
    setCurrentPage(page)
  }

  function openRecipeDetail(recipeId: string) {
    setRecipeEntryId(recipeId)
    setPlannerRecipeName(null)
    setCurrentPage('recipes')
  }

  function openPlannerWithRecipe(recipeName: string) {
    setRecipeEntryId(null)
    setPlannerRecipeName(recipeName)
    setCurrentPage('mealPlan')
  }

  function closeMealPlanWelcome() {
    window.localStorage.setItem(
      MEAL_PLAN_WELCOME_STORAGE_KEY,
      'seen',
    )
    setIsMealPlanWelcomeOpen(false)
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

    closeMealPlanWelcome()
    setOpenAiTrial(false)
    setCurrentPage('mealPlan')
  }

  function startAiMealPlanTrial() {
    closeMealPlanWelcome()
    setOpenAiTrial(true)
    setCurrentPage('mealPlan')
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
            openAiTrial={openAiTrial}
          />
        )

      case 'shopping':
        return <ShoppingPage />

      case 'inventory':
        return <InventoryPage />

      case 'recipes':
        return (
          <RecipePage
            initialRecipeId={recipeEntryId}
            onChangePage={navigateToPage}
            onPlanRecipe={openPlannerWithRecipe}
          />
        )

      case 'settings':
        return <SettingsPage />

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
  }
  const isUtilityPage =
    currentPage === 'shopping' ||
    currentPage === 'inventory' ||
    currentPage === 'settings'
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
            : currentPage
        }
        onChangePage={navigateToPage}
      />

      <MealPlanWelcomeDialog
        open={isMealPlanWelcomeOpen}
        onClose={closeMealPlanWelcome}
        onStartDefaultPlan={startDefaultMealPlan}
        onStartAiTrial={startAiMealPlanTrial}
      />
    </div>
  )
}

export default App

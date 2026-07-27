import { useEffect, useState } from 'react'
import './App.css'
import BottomNavigation from './components/BottomNavigation'
import useShoppingList from './hooks/useShoppingList'
import InventoryPage from './pages/InventoryPage'
import MealPlanPage from './pages/MealPlanPage'
import SettingsPage from './pages/SettingsPage'
import ShoppingPage from './pages/ShoppingPage'
import TodayPage from './pages/TodayPage'
import type { Ingredient } from './types/ingredient'

type PageName =
  | 'today'
  | 'mealPlan'
  | 'shopping'
  | 'inventory'
  | 'settings'

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

  const {
    addMealItems,
    removeMealItems,
  } = useShoppingList()

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

  function renderPage() {
    switch (currentPage) {
      case 'mealPlan':
        return <MealPlanPage />

      case 'shopping':
        return <ShoppingPage />

      case 'inventory':
        return <InventoryPage />

      case 'settings':
        return <SettingsPage />

      case 'today':
      default:
        return <TodayPage onChangePage={setCurrentPage} />
    }
  }

  return (
    <div className="app">
      {renderPage()}

      <BottomNavigation
        currentPage={currentPage}
        onChangePage={setCurrentPage}
      />
    </div>
  )
}

export default App

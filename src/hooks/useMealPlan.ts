import { useEffect, useState } from 'react'
import {
  parseMealPlans,
  removeMealPlan,
  upsertMealPlan,
  type MealPlanInput,
} from '../services/mealPlanEngine'
import {
  createPlannerShoppingChange,
  createPlannerShoppingSourceId,
  type PlannerShoppingChange,
} from '../services/mealPlanIntegrationEngine'
import type { PlannedMeal } from '../types/meal'

const STORAGE_KEY = 'homeos.mealPlan.items'
const CHANGE_EVENT = 'homeos:meal-plan-changed'

function dispatchPlannerShoppingChange(
  change: PlannerShoppingChange,
) {
  if (change.ingredients) {
    window.dispatchEvent(
      new CustomEvent('homeos:meal-recipe-matched', {
        detail: change,
      }),
    )
    return
  }

  window.dispatchEvent(
    new CustomEvent('homeos:meal-cleared', {
      detail: {
        sourceId: change.sourceId,
        previousSourceId: change.previousSourceId,
      },
    }),
  )
}

function readMealPlans(): PlannedMeal[] {
  const storedValue = window.localStorage.getItem(STORAGE_KEY)

  if (!storedValue) {
    return []
  }

  try {
    return parseMealPlans(JSON.parse(storedValue))
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

function useMealPlan() {
  const [mealPlans, setMealPlans] =
    useState<PlannedMeal[]>(readMealPlans)

  useEffect(() => {
    function reloadMealPlans() {
      setMealPlans(readMealPlans())
    }

    window.addEventListener('storage', reloadMealPlans)
    window.addEventListener(
      CHANGE_EVENT,
      reloadMealPlans,
    )

    return () => {
      window.removeEventListener(
        'storage',
        reloadMealPlans,
      )
      window.removeEventListener(
        CHANGE_EVENT,
        reloadMealPlans,
      )
    }
  }, [])

  function saveMealPlans(nextMealPlans: PlannedMeal[]) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nextMealPlans),
    )
    setMealPlans(nextMealPlans)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  function saveMealPlan(
    input: MealPlanInput,
    previousId?: string,
  ) {
    const nextMealPlans = upsertMealPlan(
      mealPlans,
      input,
      previousId,
    )
    const shoppingChange = createPlannerShoppingChange(
      nextMealPlans,
      input,
      previousId,
    )

    saveMealPlans(nextMealPlans)

    if (shoppingChange) {
      dispatchPlannerShoppingChange(shoppingChange)
    }
  }

  function deleteMealPlan(mealPlanId: string) {
    saveMealPlans(removeMealPlan(mealPlans, mealPlanId))

    window.dispatchEvent(
      new CustomEvent('homeos:meal-cleared', {
        detail: {
          sourceId:
            createPlannerShoppingSourceId(mealPlanId),
        },
      }),
    )
  }

  return {
    mealPlans,
    saveMealPlan,
    deleteMealPlan,
  }
}

export default useMealPlan

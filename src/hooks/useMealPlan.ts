import { useEffect, useState } from 'react'
import {
  appendMealPlans,
  parseMealPlans,
  removeMealPlan,
  replaceMealPlansBySlot,
  upsertMealPlan,
  type MealPlanInput,
} from '../services/mealPlanEngine'
import {
  createPlannerShoppingChange,
  createPlannerShoppingSourceId,
  type PlannerShoppingChange,
} from '../services/mealPlanIntegrationEngine'
import type { PlannedMeal } from '../types/meal'
import type { Recipe } from '../types/recipe'
import useRecipes from './useRecipes'

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
  const { recipes } = useRecipes()
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
      recipes,
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

  function importMealPlans(
    importedMealPlans: PlannedMeal[],
    availableRecipes: Recipe[],
  ) {
    if (importedMealPlans.length === 0) {
      return
    }

    const nextMealPlans = appendMealPlans(
      mealPlans,
      importedMealPlans,
    )

    saveMealPlans(nextMealPlans)

    importedMealPlans.forEach((mealPlan) => {
      const shoppingChange =
        createPlannerShoppingChange(
          nextMealPlans,
          {
            date: mealPlan.date,
            type: mealPlan.type,
            name: mealPlan.name,
          },
          availableRecipes,
        )

      if (shoppingChange) {
        dispatchPlannerShoppingChange(
          shoppingChange,
        )
      }
    })
  }

  function replaceAllMealPlans(
    nextMealPlans: PlannedMeal[],
  ) {
    const previousMealPlans = readMealPlans()

    previousMealPlans.forEach((mealPlan) => {
      window.dispatchEvent(
        new CustomEvent('homeos:meal-cleared', {
          detail: {
            sourceId:
              createPlannerShoppingSourceId(
                mealPlan.id,
              ),
          },
        }),
      )
    })

    saveMealPlans(
      nextMealPlans.map((mealPlan) => ({
        ...mealPlan,
      })),
    )
  }

  function replaceMealPlanSlots(
    replacementMealPlans: PlannedMeal[],
  ) {
    const currentMealPlans = readMealPlans()
    const replacementIds = new Set(
      replacementMealPlans.map(
        (mealPlan) => mealPlan.id,
      ),
    )

    currentMealPlans
      .filter((mealPlan) =>
        replacementIds.has(mealPlan.id),
      )
      .forEach((mealPlan) => {
        window.dispatchEvent(
          new CustomEvent('homeos:meal-cleared', {
            detail: {
              sourceId:
                createPlannerShoppingSourceId(
                  mealPlan.id,
                ),
            },
          }),
        )
      })

    saveMealPlans(
      replaceMealPlansBySlot(
        currentMealPlans,
        replacementMealPlans,
      ),
    )
  }

  return {
    mealPlans,
    saveMealPlan,
    deleteMealPlan,
    importMealPlans,
    replaceAllMealPlans,
    replaceMealPlanSlots,
  }
}

export default useMealPlan

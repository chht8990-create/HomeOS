import {
  prepareMealPackImport,
  type MealPackPreview,
} from '../services/mealPackEngine'
import useMealPlan from './useMealPlan'
import useRecipes from './useRecipes'

function useMealPackImport() {
  const { recipes, addImportedRecipes } = useRecipes()
  const { mealPlans, importMealPlans } =
    useMealPlan()

  function prepare(json: string) {
    return prepareMealPackImport(
      json,
      recipes,
      mealPlans,
    )
  }

  function apply(preview: MealPackPreview) {
    addImportedRecipes(preview.recipesToImport)
    importMealPlans(
      preview.plannedMealsToImport,
      preview.availableRecipes,
    )
  }

  return {
    prepare,
    apply,
  }
}

export default useMealPackImport

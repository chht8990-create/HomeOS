import { mergeIngredients } from './ingredientMergeEngine'
import { calculateMissingIngredients } from './inventoryEngine'
import type { Ingredient } from '../types/ingredient'
import type { InventoryItem } from '../types/inventory'
import type { Recipe } from '../types/recipe'

export type RecipeRecommendation = {
  recipe: Recipe
  missingIngredients: Ingredient[]
  missingIngredientCount: number
  isInventorySufficient: boolean
}

export function recommendRecipes(
  recipes: Recipe[],
  inventoryItems: InventoryItem[],
): RecipeRecommendation[] {
  return recipes
    .map((recipe, originalIndex) => {
      const requiredIngredients = mergeIngredients(
        recipe.ingredients,
      )
      const missingIngredients =
        calculateMissingIngredients(
          requiredIngredients,
          inventoryItems,
        )

      return {
        originalIndex,
        recommendation: {
          recipe: {
            ...recipe,
            ingredients: recipe.ingredients.map(
              (ingredient) => ({ ...ingredient }),
            ),
          },
          missingIngredients,
          missingIngredientCount:
            missingIngredients.length,
          isInventorySufficient:
            missingIngredients.length === 0,
        },
      }
    })
    .sort(
      (firstResult, secondResult) =>
        Number(
          secondResult.recommendation
            .isInventorySufficient,
        ) -
          Number(
            firstResult.recommendation
              .isInventorySufficient,
          ) ||
        firstResult.recommendation
          .missingIngredientCount -
          secondResult.recommendation
            .missingIngredientCount ||
        firstResult.originalIndex -
          secondResult.originalIndex,
    )
    .map(({ recommendation }) => recommendation)
}

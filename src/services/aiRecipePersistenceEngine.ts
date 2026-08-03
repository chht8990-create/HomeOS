import { normalizeAiRecipeRecommendations } from './aiRecipeRecommendationEngine'
import { normalizeRecipe } from './recipeNormalizationEngine'
import type {
  AiInventoryIngredient,
  AiRecipeIngredient,
  AiRecipeRecommendation,
} from '../types/aiRecipeRecommendation'
import type {
  Recipe,
  RecipeIngredient,
  RecipeIngredientGroups,
} from '../types/recipe'

export const AI_RECIPE_STORAGE_KEY =
  'today-table.aiRecipes.v1'
export const AI_RECIPE_CHANGE_EVENT =
  'today-table:ai-recipes-changed'

function normalizeText(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function normalizeQuantity(value: number) {
  return Math.round(value * 1_000) / 1_000
}

function hashFingerprint(value: string) {
  let hash = 0xcbf29ce484222325n

  for (const character of value) {
    hash ^= BigInt(character.codePointAt(0) ?? 0)
    hash = BigInt.asUintN(
      64,
      hash * 0x100000001b3n,
    )
  }

  return hash.toString(16).padStart(16, '0')
}

function ingredientCanonicalValue(
  ingredient: Pick<
    AiRecipeIngredient,
    'name' | 'quantity' | 'unit' | 'group' | 'optional'
  >,
) {
  return {
    name: normalizeText(ingredient.name),
    quantity: normalizeQuantity(ingredient.quantity),
    unit: normalizeText(ingredient.unit),
    group: ingredient.group,
    optional: ingredient.optional,
  }
}

function groupName(
  groups: RecipeIngredientGroups,
  ingredientId: string,
) {
  if (
    groups.seasoningIngredients.some(
      (ingredient) => ingredient.id === ingredientId,
    )
  ) {
    return 'seasoning' as const
  }

  if (
    groups.brothIngredients.some(
      (ingredient) => ingredient.id === ingredientId,
    )
  ) {
    return 'broth' as const
  }

  if (
    groups.garnishIngredients.some(
      (ingredient) => ingredient.id === ingredientId,
    )
  ) {
    return 'garnish' as const
  }

  if (
    groups.optionalIngredients.some(
      (ingredient) => ingredient.id === ingredientId,
    )
  ) {
    return 'optional' as const
  }

  return 'main' as const
}

function createCanonicalRecommendation(
  recommendation: AiRecipeRecommendation,
) {
  return JSON.stringify({
    name: normalizeText(recommendation.title),
    ingredients: recommendation.ingredients
      .map(ingredientCanonicalValue)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(
          JSON.stringify(right),
        ),
      ),
    steps: recommendation.steps
      .map((step) => ({
        order: step.order,
        title: normalizeText(step.title),
        instruction: normalizeText(step.instruction),
        durationMinutes: step.durationMinutes,
        heatLevel: normalizeText(step.heatLevel),
        completionCue: normalizeText(
          step.completionCue,
        ),
      }))
      .sort((left, right) => left.order - right.order),
  })
}

function createCanonicalRecipe(recipe: Recipe) {
  const normalizedRecipe = normalizeRecipe(recipe)
  const groups = normalizedRecipe.ingredientGroups!
  const groupedIngredients = [
    ...groups.mainIngredients,
    ...groups.seasoningIngredients,
    ...groups.brothIngredients,
    ...groups.garnishIngredients,
    ...groups.optionalIngredients,
  ]

  return JSON.stringify({
    name: normalizeText(normalizedRecipe.name),
    ingredients: groupedIngredients
      .map((ingredient) =>
        ingredientCanonicalValue({
          name: ingredient.name,
          quantity: ingredient.amount,
          unit: ingredient.unit,
          group: groupName(groups, ingredient.id),
          optional:
            groupName(groups, ingredient.id) ===
              'optional' || Boolean(ingredient.optional),
        }),
      )
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(
          JSON.stringify(right),
        ),
      ),
    steps: (normalizedRecipe.steps ?? [])
      .map((step) => ({
        order: step.order,
        title: normalizeText(step.title ?? ''),
        instruction: normalizeText(step.instruction),
        durationMinutes:
          step.durationMinutes ?? step.minutes,
        heatLevel: normalizeText(
          step.heatLevel ?? step.heat ?? '',
        ),
        completionCue: normalizeText(
          step.completionCue ?? step.doneness ?? '',
        ),
      }))
      .sort((left, right) => left.order - right.order),
  })
}

export function createAiRecommendationFingerprint(
  recommendation: AiRecipeRecommendation,
) {
  return `ai-recipe-v1:${hashFingerprint(
    createCanonicalRecommendation(recommendation),
  )}`
}

export function createRecipeFingerprint(
  recipe: Recipe,
) {
  return `ai-recipe-v1:${hashFingerprint(
    createCanonicalRecipe(recipe),
  )}`
}

function toRecipeIngredient(
  ingredient: AiRecipeIngredient,
  id: string,
): RecipeIngredient {
  return {
    id,
    name: ingredient.name.trim(),
    amount: ingredient.quantity,
    unit: ingredient.unit.trim(),
    ...(ingredient.note
      ? { note: ingredient.note }
      : {}),
    ...(ingredient.optional
      ? { optional: true }
      : {}),
    ...(ingredient.substitute.length > 0
      ? { substitute: [...ingredient.substitute] }
      : {}),
    inventoryMatchKey: normalizeText(ingredient.name),
  }
}

export function convertAiRecommendationToRecipe(
  recommendation: AiRecipeRecommendation,
  now = new Date().toISOString(),
): Recipe {
  const fingerprint =
    createAiRecommendationFingerprint(recommendation)
  const ingredients = recommendation.ingredients.map(
    (ingredient, index) => ({
      ingredient,
      recipeIngredient: toRecipeIngredient(
        ingredient,
        `${fingerprint}:ingredient:${index + 1}`,
      ),
    }),
  )
  const selectGroup = (
    group: AiRecipeIngredient['group'],
  ) =>
    ingredients
      .filter(
        ({ ingredient }) => ingredient.group === group,
      )
      .map(({ recipeIngredient }) => recipeIngredient)
  const ingredientGroups: RecipeIngredientGroups = {
    mainIngredients: selectGroup('main'),
    seasoningIngredients: selectGroup('seasoning'),
    brothIngredients: selectGroup('broth'),
    garnishIngredients: selectGroup('garnish'),
    optionalIngredients: selectGroup('optional'),
  }
  const requiredIngredients = ingredients.flatMap(
    ({ ingredient, recipeIngredient }) =>
      ingredient.optional || ingredient.group === 'optional'
        ? []
        : [
            {
              id: recipeIngredient.id,
              name: recipeIngredient.name,
              quantity: recipeIngredient.amount,
              unit: recipeIngredient.unit,
            },
          ],
  )

  return normalizeRecipe({
    id: `ai-recipe-${fingerprint.split(':')[1]}`,
    name: recommendation.title.trim(),
    ingredients: requiredIngredients,
    source: 'ai',
    fingerprint,
    createdAt: now,
    updatedAt: now,
    description: recommendation.summary.trim(),
    servings: recommendation.servings,
    difficulty: recommendation.difficulty,
    prepMinutes: recommendation.prepTimeMinutes,
    cookMinutes: recommendation.cookTimeMinutes,
    prepTimeMinutes: recommendation.prepTimeMinutes,
    cookTimeMinutes: recommendation.cookTimeMinutes,
    totalTimeMinutes:
      recommendation.prepTimeMinutes +
      recommendation.cookTimeMinutes,
    ...(recommendation.calories === null
      ? {}
      : { calories: recommendation.calories }),
    ingredientGroups,
    optionalIngredients: ingredientGroups.optionalIngredients.map(
      (ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        quantity: ingredient.amount,
        unit: ingredient.unit,
      })),
    substitutions: recommendation.ingredients.flatMap(
      (ingredient) =>
        ingredient.substitute.length > 0
          ? [
              {
                ingredientName: ingredient.name,
                alternatives: [...ingredient.substitute],
              },
            ]
          : [],
    ),
    steps: recommendation.steps.map((step) => ({
      order: step.order,
      title: step.title,
      instruction: step.instruction,
      minutes: step.durationMinutes,
      heat: step.heatLevel,
      doneness: step.completionCue,
      durationMinutes: step.durationMinutes,
      heatLevel: step.heatLevel,
      completionCue: step.completionCue,
      ...(step.reason ? { reason: step.reason } : {}),
      ...(step.warning ? { warning: step.warning } : {}),
      ingredientRefs: [...step.ingredientRefs],
    })),
    seasoningAdjustment: [
      ...recommendation.seasoningAdjustment,
    ],
    commonMistakes: [...recommendation.commonMistakes],
    storage: recommendation.storage,
    reheating: recommendation.reheating,
    leftoverIdeas: [...recommendation.leftoverIdeas],
    servingSuggestions: [
      ...recommendation.servingSuggestions,
    ],
  })
}

export function findMatchingRecipeForAiRecommendation(
  recommendation: AiRecipeRecommendation,
  recipes: Recipe[],
) {
  const fingerprint =
    createAiRecommendationFingerprint(recommendation)
  const generatedId = `ai-recipe-${fingerprint.split(':')[1]}`

  return recipes.find(
    (recipe) =>
      recipe.fingerprint === fingerprint ||
      recipe.id === generatedId ||
      createRecipeFingerprint(recipe) === fingerprint,
  )
}

export function resolveAiRecipePersistence(
  recommendation: AiRecipeRecommendation,
  recipes: Recipe[],
  now = new Date().toISOString(),
) {
  const existingRecipe =
    findMatchingRecipeForAiRecommendation(
      recommendation,
      recipes,
    )

  return existingRecipe
    ? { recipe: existingRecipe, created: false }
    : {
        recipe: convertAiRecommendationToRecipe(
          recommendation,
          now,
        ),
        created: true,
      }
}

export function parseStoredAiRecipes(
  value: unknown,
): Recipe[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((candidate) => {
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      Array.isArray(candidate)
    ) {
      return []
    }

    const recipe = candidate as Partial<Recipe>

    if (
      recipe.source !== 'ai' ||
      typeof recipe.id !== 'string' ||
      typeof recipe.name !== 'string' ||
      typeof recipe.fingerprint !== 'string' ||
      typeof recipe.createdAt !== 'string' ||
      typeof recipe.updatedAt !== 'string' ||
      !Array.isArray(recipe.ingredients) ||
      !Array.isArray(recipe.steps)
    ) {
      return []
    }

    try {
      return [normalizeRecipe(recipe as Recipe)]
    } catch {
      return []
    }
  })
}

type AiRecipeStorage = Pick<
  Storage,
  'getItem' | 'setItem'
>

export function readAiRecipesFromStorage(
  storage: AiRecipeStorage,
) {
  const storedValue = storage.getItem(
    AI_RECIPE_STORAGE_KEY,
  )

  if (!storedValue) {
    return []
  }

  try {
    return parseStoredAiRecipes(JSON.parse(storedValue))
  } catch {
    return []
  }
}

export function persistAiRecommendationToStorage(
  storage: AiRecipeStorage,
  recommendation: AiRecipeRecommendation,
  availableRecipes: Recipe[],
  now = new Date().toISOString(),
) {
  const storedRecipes =
    readAiRecipesFromStorage(storage)
  const result = resolveAiRecipePersistence(
    recommendation,
    availableRecipes,
    now,
  )

  if (!result.created) {
    return {
      ...result,
      storedRecipes,
    }
  }

  const nextStoredRecipes = [
    ...storedRecipes,
    result.recipe,
  ]
  storage.setItem(
    AI_RECIPE_STORAGE_KEY,
    JSON.stringify(nextStoredRecipes),
  )

  return {
    ...result,
    storedRecipes: nextStoredRecipes,
  }
}

export function recalculateAiRecommendationForInventory(
  recommendation: AiRecipeRecommendation,
  inventoryItems: AiInventoryIngredient[],
) {
  return normalizeAiRecipeRecommendations(
    [recommendation],
    {
      inventoryItems,
      servings: recommendation.servings,
    },
  )[0]
}

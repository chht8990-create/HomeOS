import { addDaysToDateKey } from './defaultMealPlanEngine.js'
import { createMealPlanShoppingIngredients } from './mealPlanShoppingEngine.js'
import type { Ingredient } from '../types/ingredient'
import type {
  AiMealPlanTrialRequest,
  AiMealPlanTrialResponse,
  SpicePreference,
  StoredAiMealPlanTrial,
} from '../types/aiMealPlanTrial'
import type { DetailedRecipe } from '../types/recipe'
import type { PlannedMeal } from '../types/meal'

export const AI_MEAL_PLAN_TRIAL_STORAGE_KEY =
  'today-table.aiMealPlanTrial.v1'
export const AI_MEAL_PLAN_TRIAL_CHANGE_EVENT =
  'today-table:ai-meal-plan-trial-changed'
export const AI_MEAL_PLAN_TRIAL_DAY_COUNT = 7
export const AI_MEAL_PLAN_MAX_INVENTORY_ITEMS = 40

type ValidationSuccess = {
  ok: true
  data: AiMealPlanTrialRequest
}

type ValidationFailure = {
  ok: false
  code: string
  message: string
}

export type AiMealPlanTrialValidation =
  | ValidationSuccess
  | ValidationFailure

type RawIngredient = Omit<Ingredient, 'id'>

type RawRecipe = {
  name: string
  servings: number
  prepMinutes: number
  cookMinutes: number
  ingredients: RawIngredient[]
  optionalIngredients: RawIngredient[]
  substitutions: Array<{
    ingredientName: string
    alternatives: string[]
  }>
  steps: Array<{
    order: number
    instruction: string
    minutes: number
    heat: string
    doneness: string
  }>
}

function readText(
  value: unknown,
  maxLength: number,
) {
  if (typeof value !== 'string') {
    return null
  }

  const text = value.trim()

  return text && text.length <= maxLength
    ? text
    : null
}

function isDateKey(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(
      new Date(`${value}T12:00:00`).getTime(),
    )
  )
}

function isSpicePreference(
  value: unknown,
): value is SpicePreference {
  return (
    value === 'mild' ||
    value === 'medium' ||
    value === 'spicy'
  )
}

function readOptionalText(
  value: unknown,
  maxLength: number,
) {
  if (value === undefined || value === '') {
    return undefined
  }

  return readText(value, maxLength) ?? undefined
}

export function validateAiMealPlanTrialRequest(
  value: unknown,
): AiMealPlanTrialValidation {
  if (!value || typeof value !== 'object') {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message: '맞춤 식단 정보 형식이 올바르지 않습니다.',
    }
  }

  const request = value as Record<string, unknown>
  const inventoryItems = Array.isArray(
    request.inventoryItems,
  )
    ? request.inventoryItems.flatMap((item) => {
        if (!item || typeof item !== 'object') {
          return []
        }

        const inventoryItem =
          item as Record<string, unknown>
        const name = readText(inventoryItem.name, 80)
        const unit = readText(inventoryItem.unit, 30)
        const quantity = inventoryItem.quantity

        return name &&
          unit &&
          typeof quantity === 'number' &&
          Number.isFinite(quantity) &&
          quantity > 0
          ? [{ name, quantity, unit }]
          : []
      })
    : []

  if (
    !isDateKey(request.startDate) ||
    typeof request.householdSize !== 'number' ||
    !Number.isInteger(request.householdSize) ||
    request.householdSize < 1 ||
    request.householdSize > 10 ||
    typeof request.includesChildren !== 'boolean' ||
    !isSpicePreference(request.spicePreference) ||
    typeof request.weekdayMaxMinutes !== 'number' ||
    !Number.isInteger(request.weekdayMaxMinutes) ||
    request.weekdayMaxMinutes < 15 ||
    request.weekdayMaxMinutes > 90 ||
    inventoryItems.length >
      AI_MEAL_PLAN_MAX_INVENTORY_ITEMS
  ) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message: '맞춤 식단 입력값을 다시 확인해 주세요.',
    }
  }

  return {
    ok: true,
    data: {
      startDate: request.startDate,
      householdSize: request.householdSize,
      includesChildren: request.includesChildren,
      ...(readOptionalText(request.childAgeGroup, 80)
        ? {
            childAgeGroup: readOptionalText(
              request.childAgeGroup,
              80,
            ),
          }
        : {}),
      spicePreference: request.spicePreference,
      ...(readOptionalText(request.preferredFoods, 200)
        ? {
            preferredFoods: readOptionalText(
              request.preferredFoods,
              200,
            ),
          }
        : {}),
      ...(readOptionalText(request.excludedFoods, 200)
        ? {
            excludedFoods: readOptionalText(
              request.excludedFoods,
              200,
            ),
          }
        : {}),
      ...(readOptionalText(request.allergies, 200)
        ? {
            allergies: readOptionalText(
              request.allergies,
              200,
            ),
          }
        : {}),
      weekdayMaxMinutes: request.weekdayMaxMinutes,
      inventoryItems,
    },
  }
}

function readIngredient(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const ingredient = value as Record<string, unknown>
  const name = readText(ingredient.name, 80)
  const unit = readText(ingredient.unit, 30)
  const quantity = ingredient.quantity

  return name &&
    unit &&
    typeof quantity === 'number' &&
    Number.isFinite(quantity) &&
    quantity > 0
    ? { name, quantity, unit }
    : null
}

function readRawRecipe(value: unknown): RawRecipe | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const recipe = value as Record<string, unknown>
  const name = readText(recipe.name, 80)
  const servings = recipe.servings
  const prepMinutes = recipe.prepMinutes
  const cookMinutes = recipe.cookMinutes
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map(readIngredient)
    : []
  const optionalIngredients = Array.isArray(
    recipe.optionalIngredients,
  )
    ? recipe.optionalIngredients.map(readIngredient)
    : []
  const substitutions = Array.isArray(
    recipe.substitutions,
  )
    ? recipe.substitutions.flatMap((value) => {
        if (!value || typeof value !== 'object') {
          return []
        }

        const substitution =
          value as Record<string, unknown>
        const ingredientName = readText(
          substitution.ingredientName,
          80,
        )
        const alternatives = Array.isArray(
          substitution.alternatives,
        )
          ? substitution.alternatives
              .map((alternative) =>
                readText(alternative, 80),
              )
              .filter(
                (alternative): alternative is string =>
                  Boolean(alternative),
              )
          : []

        return ingredientName &&
          alternatives.length > 0
          ? [{ ingredientName, alternatives }]
          : []
      })
    : []
  const steps = Array.isArray(recipe.steps)
    ? recipe.steps.flatMap((value) => {
        if (!value || typeof value !== 'object') {
          return []
        }

        const step = value as Record<string, unknown>
        const order = step.order
        const instruction = readText(
          step.instruction,
          300,
        )
        const minutes = step.minutes
        const heat = readText(step.heat, 40)
        const doneness = readText(step.doneness, 160)

        return typeof order === 'number' &&
          Number.isInteger(order) &&
          typeof minutes === 'number' &&
          Number.isInteger(minutes) &&
          minutes > 0 &&
          instruction &&
          heat &&
          doneness
          ? [
              {
                order,
                instruction,
                minutes,
                heat,
                doneness,
              },
            ]
          : []
      })
    : []

  if (
    !name ||
    typeof servings !== 'number' ||
    !Number.isInteger(servings) ||
    servings < 1 ||
    servings > 10 ||
    typeof prepMinutes !== 'number' ||
    !Number.isInteger(prepMinutes) ||
    prepMinutes < 0 ||
    typeof cookMinutes !== 'number' ||
    !Number.isInteger(cookMinutes) ||
    cookMinutes < 5 ||
    ingredients.length < 2 ||
    ingredients.some((ingredient) => !ingredient) ||
    optionalIngredients.some(
      (ingredient) => !ingredient,
    ) ||
    steps.length < 5 ||
    steps.length > 10
  ) {
    return null
  }

  return {
    name,
    servings,
    prepMinutes,
    cookMinutes,
    ingredients: ingredients as RawIngredient[],
    optionalIngredients:
      optionalIngredients as RawIngredient[],
    substitutions,
    steps,
  }
}

function splitRestrictions(value?: string) {
  return (value ?? '')
    .split(/[,/]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

export function parseAiMealPlanTrialOutput(
  value: unknown,
  request: AiMealPlanTrialRequest,
  generatedAt = new Date().toISOString(),
): AiMealPlanTrialResponse | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const daysValue = (
    value as Record<string, unknown>
  ).days

  if (
    !Array.isArray(daysValue) ||
    daysValue.length !== AI_MEAL_PLAN_TRIAL_DAY_COUNT
  ) {
    return null
  }

  const restrictions = new Set([
    ...splitRestrictions(request.excludedFoods),
    ...splitRestrictions(request.allergies),
  ])
  const dayNumbers = new Set<number>()
  const names = new Set<string>()
  const recipes: DetailedRecipe[] = []

  for (const value of daysValue) {
    if (!value || typeof value !== 'object') {
      return null
    }

    const dayValue = value as Record<string, unknown>
    const day = dayValue.day
    const rawRecipe = readRawRecipe(dayValue.recipe)

    if (
      typeof day !== 'number' ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > AI_MEAL_PLAN_TRIAL_DAY_COUNT ||
      dayNumbers.has(day) ||
      !rawRecipe
    ) {
      return null
    }

    const normalizedName = rawRecipe.name.toLowerCase()

    if (
      names.has(normalizedName) ||
      rawRecipe.ingredients.some((ingredient) =>
        restrictions.has(
          ingredient.name.toLowerCase(),
        ),
      )
    ) {
      return null
    }

    dayNumbers.add(day)
    names.add(normalizedName)
    const recipeId = `ai-trial-${request.startDate}-${day}`

    recipes.push({
      id: recipeId,
      name: rawRecipe.name,
      servings: rawRecipe.servings,
      prepMinutes: rawRecipe.prepMinutes,
      cookMinutes: rawRecipe.cookMinutes,
      ingredients: rawRecipe.ingredients.map(
        (ingredient, index) => ({
          id: `${recipeId}-ingredient-${index + 1}`,
          ...ingredient,
        }),
      ),
      optionalIngredients:
        rawRecipe.optionalIngredients.map(
          (ingredient, index) => ({
            id: `${recipeId}-optional-${index + 1}`,
            ...ingredient,
          }),
        ),
      substitutions: rawRecipe.substitutions.map(
        (substitution) => ({
          ingredientName:
            substitution.ingredientName,
          alternatives: [
            ...substitution.alternatives,
          ],
        }),
      ),
      steps: rawRecipe.steps
        .map((step) => ({ ...step }))
        .sort(
          (firstStep, secondStep) =>
            firstStep.order - secondStep.order,
        ),
    })
  }

  recipes.sort((firstRecipe, secondRecipe) =>
    firstRecipe.id.localeCompare(secondRecipe.id),
  )

  const plans: PlannedMeal[] = recipes.map(
    (recipe, index) => {
      const date = addDaysToDateKey(
        request.startDate,
        index,
      )

      return {
        id: `${date}-dinner`,
        date,
        type: 'dinner',
        status: 'planned',
        name: recipe.name,
        recipeId: recipe.id,
        servings: request.householdSize,
        source: 'ai-trial',
        createdAt: generatedAt,
        updatedAt: generatedAt,
      }
    },
  )
  const weeklyShoppingIngredients =
    createMealPlanShoppingIngredients(
      plans,
      recipes,
      request.inventoryItems.map(
        (inventoryItem, index) => ({
          id: `ai-trial-inventory-${index + 1}`,
          ...inventoryItem,
          location: 'fridge' as const,
          createdAt: generatedAt,
          updatedAt: generatedAt,
        }),
      ),
      request.startDate,
      'week',
    ).ingredients

  return {
    recipes,
    plans,
    weeklyShoppingIngredients,
    meta: {
      generatedAt,
    },
  }
}

export function parseStoredAiMealPlanTrial(
  value: unknown,
): StoredAiMealPlanTrial | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const stored = value as Record<string, unknown>

  if (
    stored.formatVersion !== '1' ||
    typeof stored.usedAt !== 'string' ||
    !stored.response ||
    typeof stored.response !== 'object'
  ) {
    return null
  }

  const response =
    stored.response as Record<string, unknown>
  const meta =
    response.meta as Record<string, unknown> | undefined
  const recipeIds = new Set(
    Array.isArray(response.recipes)
      ? response.recipes.flatMap((recipe) => {
          if (!recipe || typeof recipe !== 'object') {
            return []
          }

          const recipeValue =
            recipe as Record<string, unknown>
          const recipeId = readText(
            recipeValue.id,
            120,
          )

          return recipeId &&
            readRawRecipe(recipeValue) !== null
            ? [recipeId]
            : []
        })
      : [],
  )
  const validPlans = Array.isArray(response.plans)
    ? response.plans.every((plan) => {
        if (!plan || typeof plan !== 'object') {
          return false
        }

        const planValue =
          plan as Record<string, unknown>

        return (
          readText(planValue.id, 120) !== null &&
          isDateKey(planValue.date) &&
          planValue.type === 'dinner' &&
          planValue.status === 'planned' &&
          readText(planValue.name, 80) !== null &&
          typeof planValue.recipeId === 'string' &&
          recipeIds.has(planValue.recipeId) &&
          typeof planValue.servings === 'number' &&
          planValue.servings > 0 &&
          planValue.source === 'ai-trial' &&
          typeof planValue.createdAt === 'string' &&
          typeof planValue.updatedAt === 'string'
        )
      })
    : false
  const validShoppingIngredients = Array.isArray(
    response.weeklyShoppingIngredients,
  )
    ? response.weeklyShoppingIngredients.every(
        (ingredient) => {
          if (
            !ingredient ||
            typeof ingredient !== 'object'
          ) {
            return false
          }

          const ingredientValue =
            ingredient as Record<string, unknown>

          return (
            readText(ingredientValue.id, 120) !==
              null &&
            readIngredient(ingredientValue) !== null
          )
        },
      )
    : false

  if (
    !Array.isArray(response.plans) ||
    response.plans.length !==
      AI_MEAL_PLAN_TRIAL_DAY_COUNT ||
    !Array.isArray(response.recipes) ||
    response.recipes.length !==
      AI_MEAL_PLAN_TRIAL_DAY_COUNT ||
    recipeIds.size !==
      AI_MEAL_PLAN_TRIAL_DAY_COUNT ||
    !validPlans ||
    !validShoppingIngredients ||
    !meta ||
    typeof meta.generatedAt !== 'string' ||
    (meta.model !== undefined &&
      typeof meta.model !== 'string')
  ) {
    return null
  }

  return value as StoredAiMealPlanTrial
}

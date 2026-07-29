import { addDaysToDateKey } from './defaultMealPlanEngine.js'
import { createMealPlanShoppingIngredients } from './mealPlanShoppingEngine.js'
import type { Ingredient } from '../types/ingredient'
import type {
  AiMealPlanDraftDay,
  AiMealPlanDraftResponse,
  AiMealPlanRecipeDetailRequest,
  AiMealPlanRecipeDetailResponse,
  AiMealPlanTrialRequest,
  AiMealPlanTrialResponse,
  SpicePreference,
  StoredAiMealPlanTrial,
} from '../types/aiMealPlanTrial'
import type {
  DetailedRecipe,
  Recipe,
  RecipeDifficulty,
  RecipeIngredient,
  RecipeIngredientGroups,
} from '../types/recipe'
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

type RawIngredient = Omit<Ingredient, 'id'> & {
  group?:
    | 'main'
    | 'seasoning'
    | 'broth'
    | 'garnish'
    | 'optional'
  note?: string | null
  optional?: boolean
  substitute?: string[]
}

type RawRecipe = {
  name: string
  servings: number
  prepMinutes: number
  cookMinutes: number
  description?: string
  difficulty?: RecipeDifficulty
  calories?: number | null
  ingredients: RawIngredient[]
  optionalIngredients: RawIngredient[]
  substitutions: Array<{
    ingredientName: string
    alternatives: string[]
  }>
  steps: Array<{
    order: number
    title?: string
    instruction: string
    minutes: number
    heat: string
    doneness: string
    durationMinutes?: number
    heatLevel?: string
    completionCue?: string
    reason?: string | null
    warning?: string | null
    ingredientRefs?: string[]
  }>
  seasoningAdjustment?: string[]
  commonMistakes?: string[]
  storage?: string
  reheating?: string
  leftoverIdeas?: string[]
  servingSuggestions?: string[]
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

function readRecipeIngredient(
  value: unknown,
): RawIngredient | null {
  const ingredient = readIngredient(value)

  if (
    !ingredient ||
    !value ||
    typeof value !== 'object'
  ) {
    return null
  }

  const record = value as Record<string, unknown>
  const group =
    record.group === undefined
      ? undefined
      : record.group === 'main' ||
          record.group === 'seasoning' ||
          record.group === 'broth' ||
          record.group === 'garnish' ||
          record.group === 'optional'
        ? record.group
        : null
  const note =
    record.note === undefined
      ? undefined
      : record.note === null
        ? null
        : readText(record.note, 120)
  const optional =
    record.optional === undefined
      ? undefined
      : typeof record.optional === 'boolean'
        ? record.optional
        : null
  const substitute =
    record.substitute === undefined
      ? undefined
      : Array.isArray(record.substitute)
        ? record.substitute
            .map((item) => readText(item, 80))
            .filter(
              (item): item is string =>
                Boolean(item),
            )
        : null

  if (
    group === null ||
    note === null && record.note !== null ||
    optional === null ||
    substitute === null ||
    (Array.isArray(record.substitute) &&
      substitute?.length !==
        record.substitute.length)
  ) {
    return null
  }

  return {
    ...ingredient,
    ...(group ? { group } : {}),
    ...(note !== undefined ? { note } : {}),
    ...(optional !== undefined ? { optional } : {}),
    ...(substitute ? { substitute } : {}),
  }
}

function readTextArray(
  value: unknown,
  maximumItems: number,
  maximumLength: number,
) {
  if (
    !Array.isArray(value) ||
    value.length > maximumItems
  ) {
    return null
  }

  const items = value.map((item) =>
    readText(item, maximumLength),
  )

  return items.every(
    (item): item is string => Boolean(item),
  )
    ? items
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
  const description =
    recipe.description === undefined
      ? undefined
      : readText(recipe.description, 240)
  const difficulty =
    recipe.difficulty === undefined
      ? undefined
      : recipe.difficulty === '쉬움' ||
          recipe.difficulty === '보통' ||
          recipe.difficulty === '어려움'
        ? recipe.difficulty
        : null
  const calories =
    recipe.calories === undefined
      ? undefined
      : recipe.calories === null
        ? null
        : typeof recipe.calories === 'number' &&
            Number.isInteger(recipe.calories) &&
            recipe.calories > 0 &&
            recipe.calories <= 5000
          ? recipe.calories
          : undefined
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map(readRecipeIngredient)
    : []
  const optionalIngredients = Array.isArray(
    recipe.optionalIngredients,
  )
    ? recipe.optionalIngredients.map(
        readRecipeIngredient,
      )
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
        const title =
          step.title === undefined
            ? undefined
            : readText(step.title, 80)
        const instruction = readText(
          step.instruction,
          400,
        )
        const minutes =
          step.durationMinutes ?? step.minutes
        const heat =
          readText(step.heatLevel, 40) ??
          readText(step.heat, 40)
        const doneness =
          readText(step.completionCue, 180) ??
          readText(step.doneness, 180)
        const reason =
          step.reason === undefined
            ? undefined
            : step.reason === null
              ? null
              : readText(step.reason, 180)
        const warning =
          step.warning === undefined
            ? undefined
            : step.warning === null
              ? null
              : readText(step.warning, 180)
        const ingredientRefs =
          step.ingredientRefs === undefined
            ? undefined
            : readTextArray(
                step.ingredientRefs,
                25,
                80,
              )

        return typeof order === 'number' &&
          Number.isInteger(order) &&
          typeof minutes === 'number' &&
          Number.isInteger(minutes) &&
          minutes > 0 &&
          instruction &&
          heat &&
          doneness &&
          (step.title === undefined || title) &&
          (step.reason === undefined ||
            reason !== undefined) &&
          (step.warning === undefined ||
            warning !== undefined) &&
          (step.ingredientRefs === undefined ||
            ingredientRefs)
          ? [
              {
                order,
                ...(title ? { title } : {}),
                instruction,
                minutes,
                heat,
                doneness,
                ...(title
                  ? {
                      durationMinutes: minutes,
                      heatLevel: heat,
                      completionCue: doneness,
                    }
                  : {}),
                ...(reason !== undefined
                  ? { reason }
                  : {}),
                ...(warning !== undefined
                  ? { warning }
                  : {}),
                ...(ingredientRefs
                  ? { ingredientRefs }
                  : {}),
              },
            ]
          : []
      })
    : []
  const seasoningAdjustment =
    recipe.seasoningAdjustment === undefined
      ? undefined
      : readTextArray(
          recipe.seasoningAdjustment,
          4,
          180,
        )
  const commonMistakes =
    recipe.commonMistakes === undefined
      ? undefined
      : readTextArray(
          recipe.commonMistakes,
          4,
          180,
        )
  const storage =
    recipe.storage === undefined
      ? undefined
      : readText(recipe.storage, 240)
  const reheating =
    recipe.reheating === undefined
      ? undefined
      : readText(recipe.reheating, 240)
  const leftoverIdeas =
    recipe.leftoverIdeas === undefined
      ? undefined
      : readTextArray(
          recipe.leftoverIdeas,
          4,
          180,
        )
  const servingSuggestions =
    recipe.servingSuggestions === undefined
      ? undefined
      : readTextArray(
          recipe.servingSuggestions,
          4,
          180,
        )
  const isPremium =
    recipe.description !== undefined ||
    recipe.difficulty !== undefined ||
    recipe.seasoningAdjustment !== undefined

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
    steps.length < (isPremium ? 8 : 5) ||
    steps.length > (isPremium ? 12 : 10) ||
    (isPremium &&
      (!description ||
        !difficulty ||
        calories === undefined ||
        !seasoningAdjustment?.length ||
        !commonMistakes?.length ||
        !storage ||
        !reheating ||
        !leftoverIdeas?.length ||
        !servingSuggestions?.length ||
        ingredients.some(
          (ingredient) =>
            !ingredient ||
            !ingredient.group ||
            ingredient.group === 'optional' ||
            ingredient.note === undefined ||
            ingredient.optional === undefined ||
            !ingredient.substitute ||
            (/^(물|.*육수)$/.test(
              ingredient.name,
            ) &&
              ingredient.unit !== 'ml'),
        ) ||
        optionalIngredients.some(
          (ingredient) =>
            !ingredient ||
            ingredient.group !== 'optional' ||
            ingredient.note === undefined ||
            ingredient.optional !== true ||
            !ingredient.substitute ||
            (/^(물|.*육수)$/.test(
              ingredient.name,
            ) &&
              ingredient.unit !== 'ml'),
        ) ||
        steps.some(
          (step) =>
            !step.title ||
            !step.durationMinutes ||
            !step.heatLevel ||
            !step.completionCue ||
            step.reason === undefined ||
            step.warning === undefined ||
            !step.ingredientRefs?.length,
        )))
  ) {
    return null
  }

  return {
    name,
    servings,
    prepMinutes,
    cookMinutes,
    ...(description ? { description } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(calories !== undefined ? { calories } : {}),
    ingredients: ingredients as RawIngredient[],
    optionalIngredients:
      optionalIngredients as RawIngredient[],
    substitutions,
    steps,
    ...(seasoningAdjustment
      ? { seasoningAdjustment }
      : {}),
    ...(commonMistakes ? { commonMistakes } : {}),
    ...(storage ? { storage } : {}),
    ...(reheating ? { reheating } : {}),
    ...(leftoverIdeas ? { leftoverIdeas } : {}),
    ...(servingSuggestions
      ? { servingSuggestions }
      : {}),
  }
}

function splitRestrictions(value?: string) {
  return (value ?? '')
    .split(/[,/]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function createDetailedRecipe(
  rawRecipe: RawRecipe,
  recipeId: string,
): DetailedRecipe | null {
  const allRawIngredients = [
    ...rawRecipe.ingredients,
    ...rawRecipe.optionalIngredients,
  ]
  const ingredientNameSet = new Set(
    allRawIngredients.map((ingredient) =>
      ingredient.name.trim().toLowerCase(),
    ),
  )

  if (
    rawRecipe.steps.some((step) =>
      (step.ingredientRefs ?? []).some(
        (ingredientName) =>
          !ingredientNameSet.has(
            ingredientName.trim().toLowerCase(),
          ),
      ),
    )
  ) {
    return null
  }

  const recipeIngredients: RecipeIngredient[] =
    rawRecipe.ingredients.map(
      (ingredient, index) => ({
        id: `${recipeId}-ingredient-${index + 1}`,
        name: ingredient.name,
        amount: ingredient.quantity,
        unit: ingredient.unit,
        ...(ingredient.note
          ? { note: ingredient.note }
          : {}),
        optional: false,
        substitute: [
          ...(ingredient.substitute ?? []),
        ],
        inventoryMatchKey:
          ingredient.name.trim().toLowerCase(),
      }),
    )
  const recipeOptionalIngredients: RecipeIngredient[] =
    rawRecipe.optionalIngredients.map(
      (ingredient, index) => ({
        id: `${recipeId}-optional-${index + 1}`,
        name: ingredient.name,
        amount: ingredient.quantity,
        unit: ingredient.unit,
        ...(ingredient.note
          ? { note: ingredient.note }
          : {}),
        optional: true,
        substitute: [
          ...(ingredient.substitute ?? []),
        ],
        inventoryMatchKey:
          ingredient.name.trim().toLowerCase(),
      }),
    )
  const ingredientIdByName = new Map(
    [
      ...recipeIngredients,
      ...recipeOptionalIngredients,
    ].map((ingredient) => [
      ingredient.name.trim().toLowerCase(),
      ingredient.id,
    ]),
  )
  const ingredientGroups:
    | RecipeIngredientGroups
    | undefined = rawRecipe.description
    ? {
        mainIngredients: recipeIngredients.filter(
          (_, index) =>
            rawRecipe.ingredients[index].group ===
            'main',
        ),
        seasoningIngredients:
          recipeIngredients.filter(
            (_, index) =>
              rawRecipe.ingredients[index].group ===
              'seasoning',
          ),
        brothIngredients: recipeIngredients.filter(
          (_, index) =>
            rawRecipe.ingredients[index].group ===
            'broth',
        ),
        garnishIngredients: recipeIngredients.filter(
          (_, index) =>
            rawRecipe.ingredients[index].group ===
            'garnish',
        ),
        optionalIngredients:
          recipeOptionalIngredients,
      }
    : undefined

  return {
    id: recipeId,
    name: rawRecipe.name,
    servings: rawRecipe.servings,
    prepMinutes: rawRecipe.prepMinutes,
    cookMinutes: rawRecipe.cookMinutes,
    ...(rawRecipe.description
      ? {
          description: rawRecipe.description,
          difficulty: rawRecipe.difficulty,
          prepTimeMinutes: rawRecipe.prepMinutes,
          cookTimeMinutes: rawRecipe.cookMinutes,
          totalTimeMinutes:
            rawRecipe.prepMinutes +
            rawRecipe.cookMinutes,
          calories: rawRecipe.calories ?? undefined,
          ingredientGroups,
          seasoningAdjustment:
            rawRecipe.seasoningAdjustment,
          commonMistakes:
            rawRecipe.commonMistakes,
          storage: rawRecipe.storage,
          reheating: rawRecipe.reheating,
          leftoverIdeas: rawRecipe.leftoverIdeas,
          servingSuggestions:
            rawRecipe.servingSuggestions,
        }
      : {}),
    ingredients: recipeIngredients.map(
      (ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        quantity: ingredient.amount,
        unit: ingredient.unit,
      }),
    ),
    optionalIngredients:
      recipeOptionalIngredients.map(
        (ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          quantity: ingredient.amount,
          unit: ingredient.unit,
        }),
      ),
    substitutions: rawRecipe.substitutions.map(
      (substitution) => ({
        ingredientName: substitution.ingredientName,
        alternatives: [
          ...substitution.alternatives,
        ],
      }),
    ),
    steps: rawRecipe.steps
      .map((step) => {
        const {
          reason,
          warning,
          ingredientRefs,
          ...stepValues
        } = step

        return {
          ...stepValues,
          ...(reason ? { reason } : {}),
          ...(warning ? { warning } : {}),
          ...(ingredientRefs
            ? {
                ingredientRefs:
                  ingredientRefs.flatMap((name) => {
                    const ingredientId =
                      ingredientIdByName.get(
                        name.trim().toLowerCase(),
                      )

                    return ingredientId
                      ? [ingredientId]
                      : []
                  }),
              }
            : {}),
        }
      })
      .sort(
        (firstStep, secondStep) =>
          firstStep.order - secondStep.order,
      ),
  }
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
    const recipe = createDetailedRecipe(
      rawRecipe,
      recipeId,
    )

    if (!recipe) {
      return null
    }

    recipes.push(recipe)
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
    days: plans.map((plan, index) => ({
      dayIndex: index + 1,
      date: plan.date,
      recipeId: plan.recipeId!,
      name: plan.name,
      summary:
        recipes[index].description ??
        `${plan.name} 맞춤 식단`,
      recommendationReason:
        '가족 조건과 냉장고 재료를 반영한 메뉴예요.',
      servings: plan.servings ?? request.householdSize,
      prepMinutes: recipes[index].prepMinutes,
      cookMinutes: recipes[index].cookMinutes,
      mainIngredientNames:
        recipes[index].ingredients
          .slice(0, 4)
          .map((ingredient) => ingredient.name),
      missingIngredientNames:
        weeklyShoppingIngredients.map(
          (ingredient) => ingredient.name,
        ),
      constraintCompliance:
        '입력한 제외 음식과 알레르기 조건을 반영했어요.',
    })),
    recipes,
    plans,
    recipeSources: Object.fromEntries(
      recipes.map((recipe) => [
        recipe.id,
        'ai' as const,
      ]),
    ),
    recipeMeta: {},
    weeklyShoppingIngredients,
    meta: {
      generatedAt,
    },
  }
}

function readDraftDay(
  value: unknown,
  startDate: string,
): AiMealPlanDraftDay | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const day = value as Record<string, unknown>
  const dayIndex = day.day
  const name = readText(day.name, 80)
  const summary = readText(day.summary, 240)
  const recommendationReason = readText(
    day.recommendationReason,
    240,
  )
  const servings = day.servings
  const prepMinutes = day.prepMinutes
  const cookMinutes = day.cookMinutes
  const mainIngredientNames = readTextArray(
    day.mainIngredientNames,
    8,
    80,
  )
  const missingIngredientNames = readTextArray(
    day.missingIngredientNames,
    12,
    80,
  )
  const constraintCompliance = readText(
    day.constraintCompliance,
    240,
  )

  if (
    typeof dayIndex !== 'number' ||
    !Number.isInteger(dayIndex) ||
    dayIndex < 1 ||
    dayIndex > AI_MEAL_PLAN_TRIAL_DAY_COUNT ||
    !name ||
    !summary ||
    !recommendationReason ||
    typeof servings !== 'number' ||
    !Number.isInteger(servings) ||
    servings < 1 ||
    servings > 10 ||
    typeof prepMinutes !== 'number' ||
    !Number.isInteger(prepMinutes) ||
    prepMinutes < 0 ||
    prepMinutes > 120 ||
    typeof cookMinutes !== 'number' ||
    !Number.isInteger(cookMinutes) ||
    cookMinutes < 5 ||
    cookMinutes > 180 ||
    !mainIngredientNames?.length ||
    !missingIngredientNames ||
    !constraintCompliance
  ) {
    return null
  }

  const date = addDaysToDateKey(
    startDate,
    dayIndex - 1,
  )

  return {
    dayIndex,
    date,
    recipeId: `ai-trial-${startDate}-${dayIndex}`,
    name,
    summary,
    recommendationReason,
    servings,
    prepMinutes,
    cookMinutes,
    mainIngredientNames,
    missingIngredientNames,
    constraintCompliance,
  }
}

export function parseAiMealPlanDraftOutput(
  value: unknown,
  request: AiMealPlanTrialRequest,
  generatedAt = new Date().toISOString(),
): AiMealPlanDraftResponse | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const daysValue = (
    value as Record<string, unknown>
  ).days

  if (
    !Array.isArray(daysValue) ||
    daysValue.length !==
      AI_MEAL_PLAN_TRIAL_DAY_COUNT
  ) {
    return null
  }

  const restrictions = new Set([
    ...splitRestrictions(request.excludedFoods),
    ...splitRestrictions(request.allergies),
  ])
  const dayIndexes = new Set<number>()
  const menuNames = new Set<string>()
  const days: AiMealPlanDraftDay[] = []

  for (const dayValue of daysValue) {
    const day = readDraftDay(
      dayValue,
      request.startDate,
    )

    if (!day) {
      return null
    }

    const normalizedName = day.name
      .trim()
      .toLowerCase()
    const ingredientNames = [
      ...day.mainIngredientNames,
      ...day.missingIngredientNames,
    ].map((name) => name.trim().toLowerCase())
    const dateDay = new Date(
      `${day.date}T12:00:00`,
    ).getDay()
    const isWeekday = dateDay >= 1 && dateDay <= 5

    if (
      dayIndexes.has(day.dayIndex) ||
      menuNames.has(normalizedName) ||
      ingredientNames.some((name) =>
        restrictions.has(name),
      ) ||
      (isWeekday &&
        day.cookMinutes >
          request.weekdayMaxMinutes)
    ) {
      return null
    }

    dayIndexes.add(day.dayIndex)
    menuNames.add(normalizedName)
    days.push(day)
  }

  days.sort(
    (firstDay, secondDay) =>
      firstDay.dayIndex - secondDay.dayIndex,
  )

  const plans: PlannedMeal[] = days.map((day) => ({
    id: `${day.date}-dinner`,
    date: day.date,
    type: 'dinner',
    status: 'planned',
    name: day.name,
    recipeId: day.recipeId,
    servings: day.servings,
    source: 'ai-trial',
    createdAt: generatedAt,
    updatedAt: generatedAt,
  }))

  return {
    days,
    plans,
    meta: {
      generatedAt,
    },
  }
}

export function validateAiMealPlanRecipeDetailRequest(
  value: unknown,
):
  | {
      ok: true
      data: AiMealPlanRecipeDetailRequest
    }
  | ValidationFailure {
  if (!value || typeof value !== 'object') {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message:
        '상세 레시피 요청 형식이 올바르지 않습니다.',
    }
  }

  const request = value as Record<string, unknown>
  const householdSize = request.householdSize
  const includesChildren = request.includesChildren
  const childAgeGroup = readOptionalText(
    request.childAgeGroup,
    80,
  )
  const spicePreference = request.spicePreference
  const excludedFoods = readOptionalText(
    request.excludedFoods,
    300,
  )
  const allergies = readOptionalText(
    request.allergies,
    300,
  )
  const dayRecord =
    request.day &&
    typeof request.day === 'object'
      ? (request.day as Record<string, unknown>)
      : null
  const rawDayIndex = dayRecord?.dayIndex
  const rawDate = dayRecord?.date
  const startDate =
    isDateKey(rawDate) &&
    typeof rawDayIndex === 'number' &&
    Number.isInteger(rawDayIndex)
      ? addDaysToDateKey(
          rawDate,
          -(rawDayIndex - 1),
        )
      : ''
  const day = dayRecord
    ? readDraftDay(
        {
          ...dayRecord,
          day: dayRecord.dayIndex,
        },
        startDate,
      )
    : null

  if (
    !day ||
    day.date !== startDate ||
    day.recipeId !== dayRecord?.recipeId ||
    typeof householdSize !== 'number' ||
    !Number.isInteger(householdSize) ||
    householdSize < 1 ||
    householdSize > 10 ||
    typeof includesChildren !== 'boolean' ||
    !isSpicePreference(spicePreference)
  ) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message:
        '상세 레시피 요청 값이 올바르지 않습니다.',
    }
  }

  return {
    ok: true,
    data: {
      day,
      householdSize,
      includesChildren,
      ...(childAgeGroup ? { childAgeGroup } : {}),
      spicePreference,
      ...(excludedFoods ? { excludedFoods } : {}),
      ...(allergies ? { allergies } : {}),
    },
  }
}

export function parseAiMealPlanRecipeDetailOutput(
  value: unknown,
  request: AiMealPlanRecipeDetailRequest,
  generatedAt = new Date().toISOString(),
): AiMealPlanRecipeDetailResponse | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const rawRecipe = readRawRecipe(
    (value as Record<string, unknown>).recipe,
  )

  if (
    !rawRecipe ||
    rawRecipe.name.trim().toLowerCase() !==
      request.day.name.trim().toLowerCase()
  ) {
    return null
  }

  const restrictions = new Set([
    ...splitRestrictions(request.excludedFoods),
    ...splitRestrictions(request.allergies),
  ])

  if (
    [
      ...rawRecipe.ingredients,
      ...rawRecipe.optionalIngredients,
    ].some((ingredient) =>
      restrictions.has(
        ingredient.name.trim().toLowerCase(),
      ),
    )
  ) {
    return null
  }

  const recipe = createDetailedRecipe(
    rawRecipe,
    request.day.recipeId,
  )

  return recipe
    ? {
        recipe,
        meta: {
          generatedAt,
        },
      }
    : null
}

export function parseAiMealPlanDraftResponse(
  value: unknown,
  request: AiMealPlanTrialRequest,
): AiMealPlanDraftResponse | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const response = value as Record<string, unknown>
  const meta =
    response.meta &&
    typeof response.meta === 'object'
      ? (response.meta as Record<string, unknown>)
      : null

  if (!meta || typeof meta.generatedAt !== 'string') {
    return null
  }

  const stored = parseStoredAiMealPlanTrial({
    formatVersion: '2',
    status: 'draft',
    draftCreatedAt: meta.generatedAt,
    request,
    response: {
      plans: response.plans,
      days: response.days,
      recipes: [],
      recipeSources: {},
      recipeMeta: {},
      weeklyShoppingIngredients: [],
      meta,
    },
  })

  return stored
    ? {
        plans: stored.response.plans,
        days: stored.response.days,
        meta: stored.response.meta,
      }
    : null
}

export function parseAiMealPlanRecipeDetailResponse(
  value: unknown,
  request: AiMealPlanRecipeDetailRequest,
): AiMealPlanRecipeDetailResponse | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const response = value as Record<string, unknown>
  const recipe = response.recipe
  const meta =
    response.meta &&
    typeof response.meta === 'object'
      ? (response.meta as Record<string, unknown>)
      : null

  if (
    !recipe ||
    typeof recipe !== 'object' ||
    !isStoredDetailedRecipe(recipe) ||
    (
      recipe as Record<string, unknown>
    ).id !== request.day.recipeId ||
    (
      recipe as Record<string, unknown>
    ).name !== request.day.name ||
    !meta ||
    typeof meta.generatedAt !== 'string' ||
    (meta.model !== undefined &&
      typeof meta.model !== 'string')
  ) {
    return null
  }

  return value as AiMealPlanRecipeDetailResponse
}

export function findGoldenRecipeForDraftDay(
  day: AiMealPlanDraftDay,
  recipes: Recipe[],
): DetailedRecipe | null {
  const normalizedName = day.name
    .trim()
    .toLowerCase()
  const recipe = recipes.find(
    (candidate) =>
      candidate.name.trim().toLowerCase() ===
        normalizedName &&
      isStoredDetailedRecipe(candidate),
  )

  if (!recipe) {
    return null
  }

  return {
    ...(structuredClone(recipe) as DetailedRecipe),
    id: day.recipeId,
    name: day.name,
  }
}

export function addRecipeToStoredAiMealPlanTrial(
  storedTrial: StoredAiMealPlanTrial,
  recipe: DetailedRecipe,
  source: 'golden' | 'ai',
  meta: StoredAiMealPlanTrial['response']['meta'],
  savedAt = new Date().toISOString(),
): StoredAiMealPlanTrial | null {
  const day = storedTrial.response.days.find(
    (candidate) =>
      candidate.recipeId === recipe.id,
  )

  if (
    !day ||
    recipe.name !== day.name ||
    !isStoredDetailedRecipe(recipe) ||
    !storedTrial.request
  ) {
    return null
  }

  const recipes = [
    ...storedTrial.response.recipes.filter(
      (candidate) => candidate.id !== recipe.id,
    ),
    structuredClone(recipe),
  ].sort((firstRecipe, secondRecipe) => {
    const firstDay =
      storedTrial.response.days.find(
        (candidate) =>
          candidate.recipeId === firstRecipe.id,
      )?.dayIndex ?? 99
    const secondDay =
      storedTrial.response.days.find(
        (candidate) =>
          candidate.recipeId === secondRecipe.id,
      )?.dayIndex ?? 99

    return firstDay - secondDay
  })
  const inventoryItems =
    storedTrial.request.inventoryItems.map(
      (inventoryItem, index) => ({
        id: `ai-trial-inventory-${index + 1}`,
        ...inventoryItem,
        location: 'fridge' as const,
        createdAt: storedTrial.draftCreatedAt,
        updatedAt: storedTrial.draftCreatedAt,
      }),
    )
  const weeklyShoppingIngredients =
    createMealPlanShoppingIngredients(
      storedTrial.response.plans,
      recipes,
      inventoryItems,
      storedTrial.response.plans[0].date,
      'week',
    ).ingredients
  const firstRecipeId =
    storedTrial.response.days[0].recipeId
  const completed =
    storedTrial.status === 'completed' ||
    recipes.some(
      (candidate) =>
        candidate.id === firstRecipeId,
    )
  const candidate: StoredAiMealPlanTrial = {
    ...storedTrial,
    status: completed ? 'completed' : 'draft',
    ...(completed
      ? {
          usedAt: storedTrial.usedAt ?? savedAt,
        }
      : {}),
    response: {
      ...storedTrial.response,
      recipes,
      recipeSources: {
        ...storedTrial.response.recipeSources,
        [recipe.id]: source,
      },
      recipeMeta: {
        ...storedTrial.response.recipeMeta,
        [recipe.id]: meta,
      },
      weeklyShoppingIngredients,
    },
  }

  return parseStoredAiMealPlanTrial(candidate)
}

function isStoredDetailedRecipe(value: unknown) {
  if (!value || typeof value !== 'object') {
    return false
  }

  if (readRawRecipe(value) !== null) {
    return true
  }

  const recipe = value as Record<string, unknown>
  const groups =
    recipe.ingredientGroups as
      | Record<string, unknown>
      | undefined
  const groupKeys = [
    'mainIngredients',
    'seasoningIngredients',
    'brothIngredients',
    'garnishIngredients',
    'optionalIngredients',
  ]

  return (
    readText(recipe.id, 120) !== null &&
    readText(recipe.name, 80) !== null &&
    readText(recipe.description, 240) !== null &&
    typeof recipe.servings === 'number' &&
    recipe.servings > 0 &&
    typeof recipe.prepMinutes === 'number' &&
    typeof recipe.cookMinutes === 'number' &&
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.every(
      (ingredient) =>
        readIngredient(ingredient) !== null,
    ) &&
    Boolean(groups) &&
    groupKeys.every(
      (key) =>
        Array.isArray(groups?.[key]) &&
        (
          groups?.[key] as unknown[]
        ).every((ingredient) => {
          if (
            !ingredient ||
            typeof ingredient !== 'object'
          ) {
            return false
          }

          const record =
            ingredient as Record<string, unknown>

          return (
            readText(record.id, 120) !== null &&
            readText(record.name, 80) !== null &&
            typeof record.amount === 'number' &&
            record.amount > 0 &&
            readText(record.unit, 30) !== null
          )
        }),
    ) &&
    Array.isArray(recipe.steps) &&
    recipe.steps.length >= 8 &&
    recipe.steps.length <= 12 &&
    recipe.steps.every((step) => {
      if (!step || typeof step !== 'object') {
        return false
      }

      const record = step as Record<string, unknown>

      return (
        readText(record.title, 80) !== null &&
        readText(record.instruction, 400) !== null &&
        typeof record.durationMinutes === 'number' &&
        record.durationMinutes > 0 &&
        readText(record.heatLevel, 40) !== null &&
        readText(record.completionCue, 180) !==
          null &&
        Array.isArray(record.ingredientRefs)
      )
    })
  )
}

export function parseStoredAiMealPlanTrial(
  value: unknown,
): StoredAiMealPlanTrial | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const stored = value as Record<string, unknown>

  if (
    !stored.response ||
    typeof stored.response !== 'object'
  ) {
    return null
  }

  const response =
    stored.response as Record<string, unknown>
  const plans = Array.isArray(response.plans)
    ? response.plans
    : null
  const recipes = Array.isArray(response.recipes)
    ? response.recipes
    : null
  const shoppingIngredients = Array.isArray(
    response.weeklyShoppingIngredients,
  )
    ? response.weeklyShoppingIngredients
    : null
  const meta =
    response.meta as Record<string, unknown> | undefined
  const validRecipes =
    recipes?.every(isStoredDetailedRecipe) ?? false
  const recipeIds = new Set(
    validRecipes
      ? recipes!.map(
          (recipe) =>
            (
              recipe as Record<string, unknown>
            ).id as string,
        )
      : [],
  )
  const validShoppingIngredients =
    shoppingIngredients?.every(
      (ingredient) =>
        Boolean(
          ingredient &&
            typeof ingredient === 'object' &&
            readText(
              (
                ingredient as Record<
                  string,
                  unknown
                >
              ).id,
              120,
            ) &&
            readIngredient(ingredient),
        ),
    ) ?? false
  const validMeta =
    Boolean(
      meta &&
        typeof meta.generatedAt === 'string' &&
        (meta.model === undefined ||
          typeof meta.model === 'string') &&
        (meta.durationMs === undefined ||
          (typeof meta.durationMs === 'number' &&
            meta.durationMs >= 0)) &&
        (meta.outputBytes === undefined ||
          (typeof meta.outputBytes === 'number' &&
            meta.outputBytes >= 0)),
    )

  if (
    !plans ||
    plans.length !== AI_MEAL_PLAN_TRIAL_DAY_COUNT ||
    !recipes ||
    !shoppingIngredients ||
    !validRecipes ||
    !validShoppingIngredients ||
    !validMeta
  ) {
    return null
  }

  if (stored.formatVersion === '1') {
    if (
      typeof stored.usedAt !== 'string' ||
      recipes.length !==
        AI_MEAL_PLAN_TRIAL_DAY_COUNT
    ) {
      return null
    }

    const validLegacyPlans = plans.every(
      (plan) => {
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
      },
    )

    if (!validLegacyPlans) {
      return null
    }

    const typedPlans = plans as PlannedMeal[]
    const typedRecipes = recipes as DetailedRecipe[]
    const days: AiMealPlanDraftDay[] =
      typedPlans.map((plan, index) => {
        const recipe = typedRecipes.find(
          (candidate) =>
            candidate.id === plan.recipeId,
        )!

        return {
          dayIndex: index + 1,
          date: plan.date,
          recipeId: recipe.id,
          name: recipe.name,
          summary:
            recipe.description ??
            `${recipe.name} 맞춤 식단`,
          recommendationReason:
            '가족 조건과 냉장고 재료를 반영한 메뉴예요.',
          servings:
            plan.servings ?? recipe.servings,
          prepMinutes: recipe.prepMinutes,
          cookMinutes: recipe.cookMinutes,
          mainIngredientNames:
            recipe.ingredients
              .slice(0, 4)
              .map((ingredient) => ingredient.name),
          missingIngredientNames:
            (
              shoppingIngredients as Ingredient[]
            ).map((ingredient) => ingredient.name),
          constraintCompliance:
            '입력한 제외 음식과 알레르기 조건을 반영했어요.',
        }
      })

    return {
      formatVersion: '2',
      status: 'completed',
      draftCreatedAt: meta!.generatedAt as string,
      usedAt: stored.usedAt,
      response: {
        plans: typedPlans,
        days,
        recipes: typedRecipes,
        recipeSources: Object.fromEntries(
          typedRecipes.map((recipe) => [
            recipe.id,
            'ai' as const,
          ]),
        ),
        recipeMeta: {},
        weeklyShoppingIngredients:
          shoppingIngredients as Ingredient[],
        meta:
          meta as StoredAiMealPlanTrial['response']['meta'],
      },
    }
  }

  if (
    stored.formatVersion !== '2' ||
    (stored.status !== 'draft' &&
      stored.status !== 'completed') ||
    typeof stored.draftCreatedAt !== 'string' ||
    (stored.status === 'completed' &&
      typeof stored.usedAt !== 'string') ||
    (stored.status === 'draft' &&
      stored.usedAt !== undefined)
  ) {
    return null
  }

  const daysValue = Array.isArray(response.days)
    ? response.days
    : null

  if (
    !daysValue ||
    daysValue.length !==
      AI_MEAL_PLAN_TRIAL_DAY_COUNT
  ) {
    return null
  }

  const firstPlan =
    plans[0] &&
    typeof plans[0] === 'object'
      ? (plans[0] as Record<string, unknown>)
      : null
  const startDate = firstPlan?.date

  if (!isDateKey(startDate)) {
    return null
  }

  const days = daysValue.map((dayValue) => {
    if (!dayValue || typeof dayValue !== 'object') {
      return null
    }

    const dayRecord =
      dayValue as Record<string, unknown>
    const parsedDay = readDraftDay(
      {
        ...dayRecord,
        day: dayRecord.dayIndex,
      },
      startDate,
    )

    return parsedDay &&
      parsedDay.date === dayRecord.date &&
      parsedDay.recipeId === dayRecord.recipeId
      ? parsedDay
      : null
  })

  if (
    days.some((day) => !day) ||
    !plans.every((plan, index) => {
      if (!plan || typeof plan !== 'object') {
        return false
      }

      const planValue =
        plan as Record<string, unknown>
      const day = days[index]!

      return (
        readText(planValue.id, 120) !== null &&
        planValue.date === day.date &&
        planValue.type === 'dinner' &&
        planValue.status === 'planned' &&
        planValue.name === day.name &&
        planValue.recipeId === day.recipeId &&
        planValue.servings === day.servings &&
        planValue.source === 'ai-trial' &&
        typeof planValue.createdAt === 'string' &&
        typeof planValue.updatedAt === 'string'
      )
    }) ||
    recipes.length > AI_MEAL_PLAN_TRIAL_DAY_COUNT ||
    recipes.some(
      (recipe) =>
        !days.some(
          (day) =>
            day?.recipeId ===
            (
              recipe as Record<string, unknown>
            ).id,
        ),
    )
  ) {
    return null
  }

  const recipeSources =
    response.recipeSources &&
    typeof response.recipeSources === 'object'
      ? (response.recipeSources as Record<
          string,
          unknown
        >)
      : null
  const recipeMeta =
    response.recipeMeta &&
    typeof response.recipeMeta === 'object'
      ? (response.recipeMeta as Record<
          string,
          unknown
        >)
      : null

  if (
    !recipeSources ||
    !recipeMeta ||
    recipes.some((recipe) => {
      const recipeId = (
        recipe as Record<string, unknown>
      ).id as string

      return (
        recipeSources[recipeId] !== 'golden' &&
        recipeSources[recipeId] !== 'ai'
      )
    })
  ) {
    return null
  }

  let storedRequest:
    | AiMealPlanTrialRequest
    | undefined
  const usedAt =
    typeof stored.usedAt === 'string'
      ? stored.usedAt
      : undefined

  if (stored.request !== undefined) {
    const validation =
      validateAiMealPlanTrialRequest(stored.request)

    if (
      !validation.ok ||
      validation.data.startDate !== startDate
    ) {
      return null
    }

    storedRequest = validation.data
  } else if (stored.status === 'draft') {
    return null
  }

  return {
    formatVersion: '2',
    status: stored.status,
    draftCreatedAt: stored.draftCreatedAt,
    ...(usedAt
      ? { usedAt }
      : {}),
    ...(storedRequest
      ? { request: storedRequest }
      : {}),
    response: {
      plans: plans as PlannedMeal[],
      days: days as AiMealPlanDraftDay[],
      recipes: recipes as DetailedRecipe[],
      recipeSources:
        recipeSources as Record<
          string,
          'golden' | 'ai'
        >,
      recipeMeta:
        recipeMeta as StoredAiMealPlanTrial['response']['recipeMeta'],
      weeklyShoppingIngredients:
        shoppingIngredients as Ingredient[],
      meta:
        meta as StoredAiMealPlanTrial['response']['meta'],
    },
  }
}

export type AiMealPlanTrialFailureState = {
  title: string
  message: string
  trialConsumed: false
  canRetry: true
}

export function getAiMealPlanTrialFailureState(
  errorCode?: string,
): AiMealPlanTrialFailureState {
  if (errorCode === 'AI_TRIAL_TIMEOUT') {
    return {
      title: '식단 생성 시간이 길어지고 있어요',
      message:
        '무료 체험은 사용 처리되지 않았어요. 잠시 후 다시 시도해 주세요.',
      trialConsumed: false,
      canRetry: true,
    }
  }

  if (errorCode === 'AI_NETWORK_ERROR') {
    return {
      title: '인터넷 연결을 확인해 주세요',
      message:
        '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
      trialConsumed: false,
      canRetry: true,
    }
  }

  if (
    errorCode === 'AI_RESPONSE_INVALID' ||
    errorCode === 'AI_RESPONSE_TOO_LARGE'
  ) {
    return {
      title: '식단을 안전하게 완성하지 못했어요',
      message:
        '안전하게 사용할 수 있는 식단을 완성하지 못했어요. 무료 체험은 사용 처리되지 않았습니다.',
      trialConsumed: false,
      canRetry: true,
    }
  }

  return {
    title: 'AI 서비스 연결이 원활하지 않아요',
    message:
      '잠시 후 다시 시도해 주세요. 무료 체험은 사용 처리되지 않았어요.',
    trialConsumed: false,
    canRetry: true,
  }
}

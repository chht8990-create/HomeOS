import type {
  AiInventoryIngredient,
  AiMissingIngredient,
  AiRecipeIngredient,
  AiRecipeRecommendation,
  AiRecipeRecommendationRequest,
  AiRecipeStep,
} from '../types/aiRecipeRecommendation.js'

export const AI_MAX_INVENTORY_ITEMS = 40
export const AI_MAX_RECOMMENDATIONS = 3
export const AI_MAX_EXCLUDED_INGREDIENTS = 20
export const AI_MAX_PREFERENCES_LENGTH = 200
export const AI_MIN_ESTIMATED_MINUTES = 5
export const AI_MAX_ESTIMATED_MINUTES = 180

type ValidationSuccess<T> = {
  ok: true
  data: T
}

type ValidationFailure = {
  ok: false
  code:
    | 'EMPTY_INVENTORY'
    | 'TOO_MANY_INGREDIENTS'
    | 'INVALID_REQUEST'
  message: string
}

export type ValidationResult<T> =
  | ValidationSuccess<T>
  | ValidationFailure

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function readText(
  value: unknown,
  maximumLength: number,
) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()

  return trimmedValue.length > 0 &&
    trimmedValue.length <= maximumLength
    ? trimmedValue
    : null
}

function readNullableText(
  value: unknown,
  maximumLength: number,
) {
  return value === null
    ? null
    : (readText(value, maximumLength) ??
        undefined)
}

function readPositiveNumber(value: unknown) {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : null
}

function readInteger(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : null
}

function readInventoryIngredient(
  value: unknown,
): AiInventoryIngredient | null {
  if (!isRecord(value)) {
    return null
  }

  const name = readText(value.name, 80)
  const quantity = readPositiveNumber(value.quantity)
  const unit = readText(value.unit, 30)

  return name && quantity !== null && unit
    ? { name, quantity, unit }
    : null
}

function readRecipeIngredient(
  value: unknown,
): AiRecipeIngredient | null {
  if (!isRecord(value)) {
    return null
  }

  const name = readText(value.name, 80)
  const quantity = readPositiveNumber(value.quantity)
  const unit = readText(value.unit, 30)
  const group =
    value.group === 'main' ||
    value.group === 'seasoning' ||
    value.group === 'broth' ||
    value.group === 'garnish' ||
    value.group === 'optional'
      ? value.group
      : null
  const note = readNullableText(value.note, 120)
  const substitute = readArray(
    value.substitute,
    4,
    (item) => readText(item, 80),
  )

  return name &&
    quantity !== null &&
    unit &&
    typeof value.available === 'boolean' &&
    group &&
    note !== undefined &&
    typeof value.optional === 'boolean' &&
    substitute
    ? {
        name,
        quantity,
        unit,
        available: value.available,
        group,
        note,
        optional: value.optional,
        substitute,
      }
    : null
}

function readRecipeStep(
  value: unknown,
): AiRecipeStep | null {
  if (!isRecord(value)) {
    return null
  }

  const order = readInteger(value.order, 1, 12)
  const title = readText(value.title, 80)
  const instruction = readText(
    value.instruction,
    400,
  )
  const durationMinutes = readInteger(
    value.durationMinutes,
    1,
    180,
  )
  const heatLevel = readText(value.heatLevel, 40)
  const completionCue = readText(
    value.completionCue,
    180,
  )
  const reason = readNullableText(value.reason, 180)
  const warning = readNullableText(
    value.warning,
    180,
  )
  const ingredientRefs = readArray(
    value.ingredientRefs,
    AI_MAX_INVENTORY_ITEMS,
    (item) => readText(item, 80),
  )

  return order !== null &&
    title &&
    instruction &&
    durationMinutes !== null &&
    heatLevel &&
    completionCue &&
    reason !== undefined &&
    warning !== undefined &&
    ingredientRefs &&
    ingredientRefs.length > 0
    ? {
        order,
        title,
        instruction,
        durationMinutes,
        heatLevel,
        completionCue,
        reason,
        warning,
        ingredientRefs,
      }
    : null
}

function readMissingIngredient(
  value: unknown,
): AiMissingIngredient | null {
  if (!isRecord(value)) {
    return null
  }

  const name = readText(value.name, 80)
  const quantity = readPositiveNumber(value.quantity)
  const unit = readText(value.unit, 30)

  return name && quantity !== null && unit
    ? { name, quantity, unit }
    : null
}

function readArray<T>(
  value: unknown,
  maximumLength: number,
  reader: (item: unknown) => T | null,
) {
  if (
    !Array.isArray(value) ||
    value.length > maximumLength
  ) {
    return null
  }

  const parsedItems = value.map(reader)

  return parsedItems.every(
    (item): item is T => item !== null,
  )
    ? parsedItems
    : null
}

function readRecommendation(
  value: unknown,
): AiRecipeRecommendation | null {
  if (!isRecord(value)) {
    return null
  }

  const title = readText(value.title, 80)
  const summary = readText(value.summary, 240)
  const servings = readInteger(value.servings, 1, 12)
  const estimatedMinutes = readInteger(
    value.estimatedMinutes,
    AI_MIN_ESTIMATED_MINUTES,
    AI_MAX_ESTIMATED_MINUTES,
  )
  const difficulty =
    value.difficulty === '쉬움' ||
    value.difficulty === '보통' ||
    value.difficulty === '어려움'
      ? value.difficulty
      : null
  const prepTimeMinutes = readInteger(
    value.prepTimeMinutes,
    0,
    120,
  )
  const cookTimeMinutes = readInteger(
    value.cookTimeMinutes,
    5,
    180,
  )
  const calories =
    value.calories === null
      ? null
      : readInteger(value.calories, 1, 5000)
  const ingredients = readArray(
    value.ingredients,
    AI_MAX_INVENTORY_ITEMS,
    readRecipeIngredient,
  )
  const missingIngredients = readArray(
    value.missingIngredients,
    AI_MAX_INVENTORY_ITEMS,
    readMissingIngredient,
  )
  const steps = readArray(
    value.steps,
    12,
    readRecipeStep,
  )
  const seasoningAdjustment = readArray(
    value.seasoningAdjustment,
    4,
    (item) => readText(item, 180),
  )
  const commonMistakes = readArray(
    value.commonMistakes,
    4,
    (item) => readText(item, 180),
  )
  const storage = readText(value.storage, 240)
  const reheating = readText(value.reheating, 240)
  const leftoverIdeas = readArray(
    value.leftoverIdeas,
    4,
    (item) => readText(item, 180),
  )
  const servingSuggestions = readArray(
    value.servingSuggestions,
    4,
    (item) => readText(item, 180),
  )

  if (
    !title ||
    !summary ||
    servings === null ||
    estimatedMinutes === null ||
    !difficulty ||
    prepTimeMinutes === null ||
    cookTimeMinutes === null ||
    calories === undefined ||
    !ingredients ||
    ingredients.length === 0 ||
    !missingIngredients ||
    !steps ||
    steps.length < 8 ||
    !seasoningAdjustment ||
    seasoningAdjustment.length === 0 ||
    !commonMistakes ||
    commonMistakes.length === 0 ||
    !storage ||
    !reheating ||
    !leftoverIdeas ||
    leftoverIdeas.length === 0 ||
    !servingSuggestions ||
    servingSuggestions.length === 0
  ) {
    return null
  }

  const ingredientNames = new Set(
    ingredients.map((ingredient) =>
      ingredient.name.trim().toLowerCase(),
    ),
  )

  if (
    steps.some((step) =>
      step.ingredientRefs.some(
        (ingredientName) =>
          !ingredientNames.has(
            ingredientName.trim().toLowerCase(),
          ),
      ),
    ) ||
    ingredients.some(
      (ingredient) =>
        /^(물|.*육수)$/.test(ingredient.name) &&
        ingredient.unit !== 'ml',
    )
  ) {
    return null
  }

  return {
    title,
    summary,
    servings,
    estimatedMinutes,
    difficulty,
    prepTimeMinutes,
    cookTimeMinutes,
    calories,
    ingredients,
    missingIngredients,
    steps,
    seasoningAdjustment,
    commonMistakes,
    storage,
    reheating,
    leftoverIdeas,
    servingSuggestions,
  }
}

export function validateAiRecipeRecommendationRequest(
  value: unknown,
): ValidationResult<AiRecipeRecommendationRequest> {
  if (!isRecord(value)) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message: '요청 형식이 올바르지 않습니다.',
    }
  }

  if (!Array.isArray(value.inventoryItems)) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message: '냉장고 재료 형식이 올바르지 않습니다.',
    }
  }

  if (value.inventoryItems.length === 0) {
    return {
      ok: false,
      code: 'EMPTY_INVENTORY',
      message: '냉장고에 재료를 먼저 넣어주세요.',
    }
  }

  if (
    value.inventoryItems.length >
    AI_MAX_INVENTORY_ITEMS
  ) {
    return {
      ok: false,
      code: 'TOO_MANY_INGREDIENTS',
      message: `재료는 최대 ${AI_MAX_INVENTORY_ITEMS}개까지 추천에 사용할 수 있습니다.`,
    }
  }

  const inventoryItems = readArray(
    value.inventoryItems,
    AI_MAX_INVENTORY_ITEMS,
    readInventoryIngredient,
  )
  const servings = readInteger(value.servings, 1, 12)

  if (!inventoryItems || servings === null) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message: '재료 또는 인분 값이 올바르지 않습니다.',
    }
  }

  const preferences =
    value.preferences === undefined
      ? undefined
      : readText(
          value.preferences,
          AI_MAX_PREFERENCES_LENGTH,
        )

  if (
    value.preferences !== undefined &&
    !preferences
  ) {
    return {
      ok: false,
      code: 'INVALID_REQUEST',
      message: '선호 음식 설명이 너무 깁니다.',
    }
  }

  let excludedIngredients: string[] | undefined

  if (value.excludedIngredients !== undefined) {
    excludedIngredients = readArray(
      value.excludedIngredients,
      AI_MAX_EXCLUDED_INGREDIENTS,
      (ingredient) => readText(ingredient, 80),
    ) ?? undefined

    if (!excludedIngredients) {
      return {
        ok: false,
        code: 'INVALID_REQUEST',
        message: '제외 재료 형식이 올바르지 않습니다.',
      }
    }
  }

  return {
    ok: true,
    data: {
      inventoryItems,
      servings,
      ...(preferences ? { preferences } : {}),
      ...(excludedIngredients
        ? { excludedIngredients }
        : {}),
    },
  }
}

export function parseAiRecipeRecommendationOutput(
  value: unknown,
): AiRecipeRecommendation[] | null {
  if (!isRecord(value)) {
    return null
  }

  const recommendations = readArray(
    value.recommendations,
    AI_MAX_RECOMMENDATIONS,
    readRecommendation,
  )

  return recommendations &&
    recommendations.length > 0
    ? recommendations
    : null
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

function getInventoryQuantity(
  inventoryItems: AiInventoryIngredient[],
  name: string,
  unit: string,
) {
  const normalizedName = normalizeName(name)

  return inventoryItems.reduce(
    (total, inventoryItem) =>
      normalizeName(inventoryItem.name) ===
        normalizedName &&
      inventoryItem.unit.trim() === unit
        ? total + inventoryItem.quantity
        : total,
    0,
  )
}

export function normalizeAiRecipeRecommendations(
  recommendations: AiRecipeRecommendation[],
  input: AiRecipeRecommendationRequest,
): AiRecipeRecommendation[] {
  const seenTitles = new Set<string>()
  const excludedIngredients = new Set(
    (input.excludedIngredients ?? []).map(normalizeName),
  )

  return recommendations
    .flatMap((recommendation) => {
      const titleKey = normalizeName(
        recommendation.title,
      )

      if (seenTitles.has(titleKey)) {
        return []
      }

      const mergedIngredients = new Map<
        string,
        Omit<AiRecipeIngredient, 'available'>
      >()

      for (const ingredient of recommendation.ingredients) {
        const name = ingredient.name.trim()
        const unit = ingredient.unit.trim()
        const ingredientKey = `${normalizeName(name)}\u0000${unit}`
        const existingIngredient =
          mergedIngredients.get(ingredientKey)

        if (existingIngredient) {
          existingIngredient.quantity += ingredient.quantity
        } else {
          mergedIngredients.set(ingredientKey, {
            name,
            quantity: ingredient.quantity,
            unit,
            group: ingredient.group,
            note: ingredient.note,
            optional: ingredient.optional,
            substitute: [...ingredient.substitute],
          })
        }
      }

      const ingredients = Array.from(
        mergedIngredients.values(),
        (ingredient): AiRecipeIngredient => ({
          ...ingredient,
          available:
            getInventoryQuantity(
              input.inventoryItems,
              ingredient.name,
              ingredient.unit,
            ) >= ingredient.quantity,
        }),
      )

      if (
        ingredients.some((ingredient) =>
          excludedIngredients.has(
            normalizeName(ingredient.name),
          ),
        )
      ) {
        return []
      }

      const missingIngredients =
        ingredients.flatMap((ingredient) => {
          const availableQuantity =
            getInventoryQuantity(
              input.inventoryItems,
              ingredient.name,
              ingredient.unit,
            )
          const missingQuantity =
            ingredient.quantity - availableQuantity

          return missingQuantity > 0
            ? [
                {
                  name: ingredient.name,
                  quantity: missingQuantity,
                  unit: ingredient.unit,
                },
              ]
            : []
        })

      seenTitles.add(titleKey)

      return [
        {
          ...recommendation,
          ingredients,
          missingIngredients,
          steps: recommendation.steps.map((step) => ({
            ...step,
            ingredientRefs: [
              ...step.ingredientRefs,
            ],
          })),
          seasoningAdjustment: [
            ...recommendation.seasoningAdjustment,
          ],
          commonMistakes: [
            ...recommendation.commonMistakes,
          ],
          leftoverIdeas: [
            ...recommendation.leftoverIdeas,
          ],
          servingSuggestions: [
            ...recommendation.servingSuggestions,
          ],
        },
      ]
    })
    .slice(0, AI_MAX_RECOMMENDATIONS)
}

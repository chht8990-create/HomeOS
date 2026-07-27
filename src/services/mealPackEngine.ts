import type { Ingredient } from '../types/ingredient'
import type { MealType, PlannedMeal } from '../types/meal'
import type {
  MealPack,
  MealPackMetadata,
} from '../types/mealPack'
import type { Recipe } from '../types/recipe'

export const MEAL_PACK_FORMAT_VERSION = '1.0'

export type MealPackConflict = {
  type: 'recipe-id' | 'meal-slot'
  incomingId: string
  existingId: string
  message: string
}

export type MealPackPreview = {
  mealPack: MealPack
  conflicts: MealPackConflict[]
  recipesToImport: Recipe[]
  plannedMealsToImport: PlannedMeal[]
  availableRecipes: Recipe[]
}

export type MealPackPreparationResult =
  | {
      success: true
      preview: MealPackPreview
    }
  | {
      success: false
      errors: string[]
    }

type UnknownRecord = Record<string, unknown>

const mealTypes: MealType[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
]

function asRecord(value: unknown): UnknownRecord | null {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return null
  }

  return value as UnknownRecord
}

function readRequiredString(
  record: UnknownRecord,
  key: string,
  path: string,
  errors: string[],
) {
  const value = record[key]

  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    errors.push(`${path}.${key} 값이 필요합니다.`)
    return null
  }

  return value.trim()
}

function readPositiveInteger(
  record: UnknownRecord,
  key: string,
  path: string,
  errors: string[],
) {
  const value = record[key]

  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    errors.push(
      `${path}.${key}는 1 이상의 정수여야 합니다.`,
    )
    return null
  }

  return value
}

function readStringArray(
  record: UnknownRecord,
  key: string,
  path: string,
  errors: string[],
) {
  const value = record[key]

  if (
    !Array.isArray(value) ||
    value.some(
      (item) =>
        typeof item !== 'string' || !item.trim(),
    )
  ) {
    errors.push(
      `${path}.${key}는 문자열 배열이어야 합니다.`,
    )
    return null
  }

  return value.map((item) => item.trim())
}

function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

function isIsoDateTime(value: string) {
  return !Number.isNaN(Date.parse(value))
}

function parseMetadata(
  value: unknown,
  errors: string[],
): MealPackMetadata | null {
  const record = asRecord(value)

  if (!record) {
    errors.push('pack 메타데이터가 필요합니다.')
    return null
  }

  const id = readRequiredString(
    record,
    'id',
    'pack',
    errors,
  )
  const name = readRequiredString(
    record,
    'name',
    'pack',
    errors,
  )
  const servings = readPositiveInteger(
    record,
    'servings',
    'pack',
    errors,
  )
  const startDate = readRequiredString(
    record,
    'startDate',
    'pack',
    errors,
  )
  const durationDays = readPositiveInteger(
    record,
    'durationDays',
    'pack',
    errors,
  )
  const allergies = readStringArray(
    record,
    'allergies',
    'pack',
    errors,
  )
  const excludedFoods = readStringArray(
    record,
    'excludedFoods',
    'pack',
    errors,
  )
  const description = readRequiredString(
    record,
    'description',
    'pack',
    errors,
  )
  const formatVersion = readRequiredString(
    record,
    'formatVersion',
    'pack',
    errors,
  )

  if (startDate && !isDateKey(startDate)) {
    errors.push(
      'pack.startDate는 YYYY-MM-DD 형식의 유효한 날짜여야 합니다.',
    )
  }

  if (
    formatVersion &&
    formatVersion !== MEAL_PACK_FORMAT_VERSION
  ) {
    errors.push(
      `지원하는 형식 버전은 ${MEAL_PACK_FORMAT_VERSION}입니다.`,
    )
  }

  if (
    !id ||
    !name ||
    !servings ||
    !startDate ||
    !durationDays ||
    !allergies ||
    !excludedFoods ||
    !description ||
    formatVersion !== MEAL_PACK_FORMAT_VERSION ||
    !isDateKey(startDate)
  ) {
    return null
  }

  return {
    id,
    name,
    servings,
    startDate,
    durationDays,
    allergies,
    excludedFoods,
    description,
    formatVersion,
  }
}

function parseIngredient(
  value: unknown,
  path: string,
  errors: string[],
): Ingredient | null {
  const record = asRecord(value)

  if (!record) {
    errors.push(`${path}는 객체여야 합니다.`)
    return null
  }

  const id = readRequiredString(
    record,
    'id',
    path,
    errors,
  )
  const name = readRequiredString(
    record,
    'name',
    path,
    errors,
  )
  const unit = readRequiredString(
    record,
    'unit',
    path,
    errors,
  )
  const quantity = record.quantity

  if (
    typeof quantity !== 'number' ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    errors.push(
      `${path}.quantity는 0보다 큰 숫자여야 합니다.`,
    )
  }

  if (
    !id ||
    !name ||
    !unit ||
    typeof quantity !== 'number' ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return null
  }

  return {
    id,
    name,
    quantity,
    unit,
  }
}

function parseRecipes(
  value: unknown,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push('recipes는 배열이어야 합니다.')
    return []
  }

  const recipeIds = new Set<string>()
  const ingredientIds = new Set<string>()

  return value.flatMap((item, recipeIndex) => {
    const path = `recipes[${recipeIndex}]`
    const record = asRecord(item)

    if (!record) {
      errors.push(`${path}는 객체여야 합니다.`)
      return []
    }

    const id = readRequiredString(
      record,
      'id',
      path,
      errors,
    )
    const name = readRequiredString(
      record,
      'name',
      path,
      errors,
    )

    if (id) {
      if (recipeIds.has(id)) {
        errors.push(`Recipe ID가 중복되었습니다: ${id}`)
      }
      recipeIds.add(id)
    }

    if (
      !Array.isArray(record.ingredients) ||
      record.ingredients.length === 0
    ) {
      errors.push(
        `${path}.ingredients는 한 개 이상의 재료를 포함해야 합니다.`,
      )
      return []
    }

    const ingredients = record.ingredients.flatMap(
      (ingredient, ingredientIndex) => {
        const parsedIngredient = parseIngredient(
          ingredient,
          `${path}.ingredients[${ingredientIndex}]`,
          errors,
        )

        if (!parsedIngredient) {
          return []
        }

        if (ingredientIds.has(parsedIngredient.id)) {
          errors.push(
            `Ingredient ID가 중복되었습니다: ${parsedIngredient.id}`,
          )
        }
        ingredientIds.add(parsedIngredient.id)

        return [parsedIngredient]
      },
    )

    if (
      !id ||
      !name ||
      ingredients.length !== record.ingredients.length
    ) {
      return []
    }

    return [
      {
        id,
        name,
        ingredients,
      },
    ]
  })
}

function parsePlannedMeals(
  value: unknown,
  errors: string[],
) {
  if (!Array.isArray(value)) {
    errors.push('plannedMeals는 배열이어야 합니다.')
    return []
  }

  const mealIds = new Set<string>()
  const mealSlots = new Set<string>()

  return value.flatMap((item, mealIndex) => {
    const path = `plannedMeals[${mealIndex}]`
    const record = asRecord(item)

    if (!record) {
      errors.push(`${path}는 객체여야 합니다.`)
      return []
    }

    const id = readRequiredString(
      record,
      'id',
      path,
      errors,
    )
    const date = readRequiredString(
      record,
      'date',
      path,
      errors,
    )
    const name = readRequiredString(
      record,
      'name',
      path,
      errors,
    )
    const createdAt = readRequiredString(
      record,
      'createdAt',
      path,
      errors,
    )
    const updatedAt = readRequiredString(
      record,
      'updatedAt',
      path,
      errors,
    )
    const type = record.type
    const status = record.status

    if (
      typeof type !== 'string' ||
      !mealTypes.includes(type as MealType)
    ) {
      errors.push(`${path}.type 값이 올바르지 않습니다.`)
    }

    if (status !== 'planned') {
      errors.push(
        `${path}.status는 planned여야 합니다.`,
      )
    }

    if (date && !isDateKey(date)) {
      errors.push(
        `${path}.date는 YYYY-MM-DD 형식의 유효한 날짜여야 합니다.`,
      )
    }

    if (createdAt && !isIsoDateTime(createdAt)) {
      errors.push(
        `${path}.createdAt은 유효한 날짜·시간이어야 합니다.`,
      )
    }

    if (updatedAt && !isIsoDateTime(updatedAt)) {
      errors.push(
        `${path}.updatedAt은 유효한 날짜·시간이어야 합니다.`,
      )
    }

    if (id) {
      if (mealIds.has(id)) {
        errors.push(`PlannedMeal ID가 중복되었습니다: ${id}`)
      }
      mealIds.add(id)
    }

    if (
      date &&
      typeof type === 'string' &&
      mealTypes.includes(type as MealType)
    ) {
      const slot = `${date}:${type}`

      if (mealSlots.has(slot)) {
        errors.push(
          `날짜·식사 유형이 중복되었습니다: ${date} ${type}`,
        )
      }
      mealSlots.add(slot)

      if (id && id !== `${date}-${type}`) {
        errors.push(
          `${path}.id는 ${date}-${type} 형식이어야 합니다.`,
        )
      }
    }

    if (
      !id ||
      !date ||
      !name ||
      !createdAt ||
      !updatedAt ||
      typeof type !== 'string' ||
      !mealTypes.includes(type as MealType) ||
      status !== 'planned' ||
      !isDateKey(date) ||
      !isIsoDateTime(createdAt) ||
      !isIsoDateTime(updatedAt) ||
      id !== `${date}-${type}`
    ) {
      return []
    }

    return [
      {
        id,
        date,
        type: type as MealType,
        status: 'planned' as const,
        name,
        ...(typeof record.note === 'string'
          ? { note: record.note }
          : {}),
        createdAt,
        updatedAt,
      },
    ]
  })
}

function cloneRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map(
      (ingredient) => ({ ...ingredient }),
    ),
  }
}

function clonePlannedMeal(
  mealPlan: PlannedMeal,
): PlannedMeal {
  return { ...mealPlan }
}

export function parseRecipeCollection(
  value: unknown,
): Recipe[] {
  const errors: string[] = []
  const recipes = parseRecipes(value, errors)

  return errors.length === 0 ? recipes : []
}

export function parseMealPackJson(
  json: string,
): MealPackPreparationResult {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(json)
  } catch {
    return {
      success: false,
      errors: ['JSON 형식이 올바르지 않습니다.'],
    }
  }

  const record = asRecord(parsedValue)

  if (!record) {
    return {
      success: false,
      errors: ['Meal Pack 최상위 값은 객체여야 합니다.'],
    }
  }

  const errors: string[] = []
  const pack = parseMetadata(record.pack, errors)
  const recipes = parseRecipes(
    record.recipes,
    errors,
  )
  const plannedMeals = parsePlannedMeals(
    record.plannedMeals,
    errors,
  )

  if (!pack || errors.length > 0) {
    return {
      success: false,
      errors,
    }
  }

  return {
    success: true,
    preview: {
      mealPack: {
        pack,
        recipes,
        plannedMeals,
      },
      conflicts: [],
      recipesToImport: recipes,
      plannedMealsToImport: plannedMeals,
      availableRecipes: recipes,
    },
  }
}

export function prepareMealPackImport(
  json: string,
  existingRecipes: Recipe[],
  existingMealPlans: PlannedMeal[],
): MealPackPreparationResult {
  const result = parseMealPackJson(json)

  if (!result.success) {
    return result
  }

  const { mealPack } = result.preview
  const existingRecipeIds = new Map(
    existingRecipes.map((recipe) => [
      recipe.id,
      recipe,
    ]),
  )
  const existingMealSlots = new Map(
    existingMealPlans.map((mealPlan) => [
      `${mealPlan.date}:${mealPlan.type}`,
      mealPlan,
    ]),
  )
  const conflicts: MealPackConflict[] = []
  const recipesToImport = mealPack.recipes.filter(
    (recipe) => {
      const existingRecipe = existingRecipeIds.get(
        recipe.id,
      )

      if (!existingRecipe) {
        return true
      }

      conflicts.push({
        type: 'recipe-id',
        incomingId: recipe.id,
        existingId: existingRecipe.id,
        message: `Recipe ID "${recipe.id}"는 이미 존재하여 건너뜁니다.`,
      })
      return false
    },
  )
  const plannedMealsToImport =
    mealPack.plannedMeals.filter((mealPlan) => {
      const existingMeal = existingMealSlots.get(
        `${mealPlan.date}:${mealPlan.type}`,
      )

      if (!existingMeal) {
        return true
      }

      conflicts.push({
        type: 'meal-slot',
        incomingId: mealPlan.id,
        existingId: existingMeal.id,
        message: `${mealPlan.date} ${mealPlan.type} 식단은 이미 존재하여 건너뜁니다.`,
      })
      return false
    })

  return {
    success: true,
    preview: {
      mealPack,
      conflicts,
      recipesToImport:
        recipesToImport.map(cloneRecipe),
      plannedMealsToImport:
        plannedMealsToImport.map(clonePlannedMeal),
      availableRecipes: [
        ...existingRecipes.map(cloneRecipe),
        ...recipesToImport.map(cloneRecipe),
      ],
    },
  }
}

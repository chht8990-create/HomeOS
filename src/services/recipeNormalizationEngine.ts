import type { Ingredient } from '../types/ingredient'
import type {
  Recipe,
  RecipeIngredient,
  RecipeIngredientGroups,
  RecipeStep,
} from '../types/recipe'

const emptyGroups = (): RecipeIngredientGroups => ({
  mainIngredients: [],
  seasoningIngredients: [],
  brothIngredients: [],
  garnishIngredients: [],
  optionalIngredients: [],
})

function toRecipeIngredient(
  ingredient: Ingredient,
  optional = false,
): RecipeIngredient {
  return {
    id: ingredient.id,
    name: ingredient.name,
    amount: ingredient.quantity,
    unit: ingredient.unit,
    ...(optional ? { optional: true } : {}),
    inventoryMatchKey: ingredient.name.trim().toLowerCase(),
  }
}

function toLegacyIngredient(
  ingredient: RecipeIngredient,
): Ingredient {
  return {
    id: ingredient.id,
    name: ingredient.name,
    quantity: ingredient.amount,
    unit: ingredient.unit,
  }
}

export function getRecipeIngredients(
  groups: RecipeIngredientGroups,
): RecipeIngredient[] {
  return [
    ...groups.mainIngredients,
    ...groups.seasoningIngredients,
    ...groups.brothIngredients,
    ...groups.garnishIngredients,
  ].filter((ingredient) => !ingredient.optional)
}

export function normalizeRecipeStep(
  step: RecipeStep,
): RecipeStep {
  const durationMinutes =
    step.durationMinutes ?? step.minutes
  const heatLevel =
    step.heatLevel ?? step.heat ?? '불 사용 안 함'
  const completionCue =
    step.completionCue ??
    step.doneness ??
    step.instruction

  return {
    ...step,
    title: step.title ?? `${step.order}단계`,
    minutes: durationMinutes,
    heat: heatLevel,
    doneness: completionCue,
    durationMinutes,
    heatLevel,
    completionCue,
    ingredientRefs: [...(step.ingredientRefs ?? [])],
  }
}

/**
 * 구형 Recipe를 저장소에 다시 쓰지 않고 읽는 시점에만 확장한다.
 * 기존 LocalStorage 스키마와 이미 저장된 Meal Pack을 그대로 보존한다.
 */
export function normalizeRecipe(recipe: Recipe): Recipe {
  const groups = recipe.ingredientGroups
    ? {
        mainIngredients: recipe.ingredientGroups.mainIngredients.map(
          (ingredient) => ({ ...ingredient }),
        ),
        seasoningIngredients:
          recipe.ingredientGroups.seasoningIngredients.map(
            (ingredient) => ({ ...ingredient }),
          ),
        brothIngredients: recipe.ingredientGroups.brothIngredients.map(
          (ingredient) => ({ ...ingredient }),
        ),
        garnishIngredients:
          recipe.ingredientGroups.garnishIngredients.map(
            (ingredient) => ({ ...ingredient }),
          ),
        optionalIngredients:
          recipe.ingredientGroups.optionalIngredients.map(
            (ingredient) => ({ ...ingredient }),
          ),
      }
    : {
        ...emptyGroups(),
        mainIngredients: recipe.ingredients.map((ingredient) =>
          toRecipeIngredient(ingredient),
        ),
        optionalIngredients: (
          recipe.optionalIngredients ?? []
        ).map((ingredient) =>
          toRecipeIngredient(ingredient, true),
        ),
      }

  const ingredients = getRecipeIngredients(groups).map(
    toLegacyIngredient,
  )
  const optionalIngredients =
    groups.optionalIngredients.map(toLegacyIngredient)
  const prepTimeMinutes =
    recipe.prepTimeMinutes ?? recipe.prepMinutes ?? 0
  const cookTimeMinutes =
    recipe.cookTimeMinutes ?? recipe.cookMinutes ?? 0

  return {
    ...recipe,
    ingredients:
      ingredients.length > 0
        ? ingredients
        : recipe.ingredients.map((ingredient) => ({
            ...ingredient,
          })),
    servings: recipe.servings ?? 4,
    description:
      recipe.description ??
      `${recipe.name}을(를) 집에서 차근차근 만드는 레시피예요.`,
    difficulty: recipe.difficulty ?? '보통',
    prepMinutes: prepTimeMinutes,
    cookMinutes: cookTimeMinutes,
    prepTimeMinutes,
    cookTimeMinutes,
    totalTimeMinutes:
      recipe.totalTimeMinutes ??
      prepTimeMinutes + cookTimeMinutes,
    ingredientGroups: groups,
    optionalIngredients,
    substitutions: (recipe.substitutions ?? []).map(
      (substitution) => ({
        ...substitution,
        alternatives: [...substitution.alternatives],
      }),
    ),
    steps: (recipe.steps ?? []).map(normalizeRecipeStep),
    seasoningAdjustment: [
      ...(recipe.seasoningAdjustment ?? []),
    ],
    commonMistakes: [...(recipe.commonMistakes ?? [])],
    storage:
      recipe.storage ??
      '완전히 식힌 뒤 밀폐 용기에 담아 냉장 보관하세요.',
    reheating:
      recipe.reheating ??
      '먹을 만큼 덜어 속까지 충분히 뜨거워지도록 다시 데우세요.',
    leftoverIdeas: [...(recipe.leftoverIdeas ?? [])],
    servingSuggestions: [
      ...(recipe.servingSuggestions ?? []),
    ],
  }
}

export function normalizeRecipeCollection(
  recipes: Recipe[],
): Recipe[] {
  return recipes.map(normalizeRecipe)
}

/**
 * 기본 레시피는 앱과 함께 배포되는 최신 스키마를 항상 우선한다.
 * 같은 ID의 구형 저장 레시피는 LocalStorage에서 삭제하지 않고
 * 카탈로그 표시에서만 제외하며, 다른 ID의 사용자 레시피는 보존한다.
 */
export function mergeRecipeCatalog(
  builtInRecipes: Recipe[],
  storedRecipeGroups: Recipe[][],
): Recipe[] {
  const normalizedBuiltIns =
    normalizeRecipeCollection(builtInRecipes)
  const seenRecipeIds = new Set(
    normalizedBuiltIns.map((recipe) => recipe.id),
  )
  const mergedRecipes = [...normalizedBuiltIns]

  for (const storedRecipes of storedRecipeGroups) {
    for (const recipe of normalizeRecipeCollection(
      storedRecipes,
    )) {
      if (seenRecipeIds.has(recipe.id)) {
        continue
      }

      seenRecipeIds.add(recipe.id)
      mergedRecipes.push(recipe)
    }
  }

  return mergedRecipes
}

export function scaleRecipeAmount(
  amount: number,
  baseServings: number,
  targetServings: number,
) {
  if (
    amount <= 0 ||
    baseServings <= 0 ||
    targetServings <= 0
  ) {
    return amount
  }

  return amount * (targetServings / baseServings)
}

const fractions = [
  { value: 0.25, label: '¼' },
  { value: 0.5, label: '½' },
  { value: 0.75, label: '¾' },
]

const countUnits = new Set([
  '개',
  '대',
  '모',
  '포기',
  '알',
  '쪽',
  '장',
  '봉',
  '봉지',
  '팩',
  '캔',
  '공기',
  '마리',
])

function formatCountAmount(amount: number) {
  if (amount > 0 && amount < 0.75) {
    return '1/2'
  }

  return String(Math.max(1, Math.round(amount)))
}

export function formatRecipeAmount(
  amount: number,
  unit?: string,
) {
  const normalizedUnit = unit?.trim().toLowerCase()

  if (
    normalizedUnit === '약간' ||
    normalizedUnit === '한 꼬집'
  ) {
    return ''
  }

  if (normalizedUnit === 'g') {
    return amount > 0 && amount < 1
      ? '<1'
      : String(Math.round(amount))
  }

  if (unit && countUnits.has(unit.trim())) {
    return formatCountAmount(amount)
  }

  const roundedAmount = Math.round(amount * 100) / 100
  const integerPart = Math.floor(roundedAmount)
  const decimalPart = roundedAmount - integerPart
  const fraction = fractions.find(
    (candidate) =>
      Math.abs(candidate.value - decimalPart) < 0.02,
  )

  if (!fraction) {
    return Number.isInteger(roundedAmount)
      ? String(roundedAmount)
      : String(roundedAmount)
  }

  return integerPart === 0
    ? fraction.label
    : `${integerPart}${fraction.label}`
}

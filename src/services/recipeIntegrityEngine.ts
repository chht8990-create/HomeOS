import type { Recipe } from '../types/recipe'

export type RecipeIntegrityIssue = {
  recipeId: string
  rule: string
  message: string
}

const placeholderPattern =
  /기본 조리 안내|공통 placeholder|상세 조리법 준비 중|레시피 준비 중/i

function addIssue(
  issues: RecipeIntegrityIssue[],
  recipeId: string,
  rule: string,
  message: string,
) {
  issues.push({ recipeId, rule, message })
}

export function auditPremiumRecipes(
  recipes: Recipe[],
  monthlyRecipeIds: readonly string[],
  imageRecipeIds: readonly string[],
): RecipeIntegrityIssue[] {
  const issues: RecipeIntegrityIssue[] = []
  const recipeIds = new Set(
    recipes.map((recipe) => recipe.id),
  )
  const imageIds = new Set(imageRecipeIds)
  const knownIngredientNames = new Set(
    recipes.flatMap(
      (recipe) =>
        recipe.ingredientGroups
          ? Object.values(
              recipe.ingredientGroups,
            ).flatMap((ingredients) =>
              ingredients.map(
                (ingredient) => ingredient.name,
              ),
            )
          : recipe.ingredients.map(
              (ingredient) => ingredient.name,
            ),
    ),
  )

  for (const recipe of recipes) {
    if (recipe.servings !== 4) {
      addIssue(
        issues,
        recipe.id,
        'SERVINGS',
        '기본 인분은 4여야 합니다.',
      )
    }

    if (
      !recipe.description ||
      !recipe.difficulty ||
      typeof recipe.prepTimeMinutes !== 'number' ||
      typeof recipe.cookTimeMinutes !== 'number' ||
      typeof recipe.totalTimeMinutes !== 'number'
    ) {
      addIssue(
        issues,
        recipe.id,
        'BASE_METADATA',
        '설명·난이도·준비/조리/전체 시간이 필요합니다.',
      )
    }

    if (!imageIds.has(recipe.id)) {
      addIssue(
        issues,
        recipe.id,
        'IMAGE',
        '로컬 대표 이미지가 없습니다.',
      )
    }

    const groups = recipe.ingredientGroups

    if (!groups) {
      addIssue(
        issues,
        recipe.id,
        'INGREDIENT_GROUPS',
        '재료 그룹이 없습니다.',
      )
      continue
    }

    const ingredients = Object.values(groups).flat()
    const ingredientIds = new Set(
      ingredients.map((ingredient) => ingredient.id),
    )

    for (const ingredient of ingredients) {
      if (
        !ingredient.id ||
        !ingredient.name.trim() ||
        !Number.isFinite(ingredient.amount) ||
        ingredient.amount <= 0 ||
        !ingredient.unit.trim()
      ) {
        addIssue(
          issues,
          recipe.id,
          'INGREDIENT_MEASURE',
          `${ingredient.name || ingredient.id}의 수량 또는 단위가 올바르지 않습니다.`,
        )
      }

      if (
        /^(물|.*육수)$/.test(ingredient.name) &&
        ingredient.unit !== 'ml'
      ) {
        addIssue(
          issues,
          recipe.id,
          'LIQUID_UNIT',
          `${ingredient.name}은 ml 단위를 사용해야 합니다.`,
        )
      }
    }

    const steps = recipe.steps ?? []

    if (steps.length < 8 || steps.length > 12) {
      addIssue(
        issues,
        recipe.id,
        'STEP_COUNT',
        '조리 단계는 8~12개여야 합니다.',
      )
    }

    for (const step of steps) {
      if (
        !step.title ||
        !step.instruction.trim() ||
        !step.durationMinutes ||
        !step.heatLevel ||
        !step.completionCue
      ) {
        addIssue(
          issues,
          recipe.id,
          'STEP_METADATA',
          `${step.order}단계의 제목·시간·불 세기·완성 기준이 필요합니다.`,
        )
      }

      if (
        !step.ingredientRefs ||
        step.ingredientRefs.some(
          (ingredientId) =>
            !ingredientIds.has(ingredientId),
        )
      ) {
        addIssue(
          issues,
          recipe.id,
          'INGREDIENT_REFS',
          `${step.order}단계가 존재하지 않는 재료를 참조합니다.`,
        )
      }

      for (const ingredientName of knownIngredientNames) {
        if (
          ingredientName.length >= 2 &&
          step.instruction.includes(ingredientName) &&
          !ingredients.some(
            (ingredient) =>
              ingredient.name.includes(
                ingredientName,
              ) ||
              ingredientName.includes(
                ingredient.name,
              ),
          )
        ) {
          addIssue(
            issues,
            recipe.id,
            'UNLISTED_INGREDIENT',
            `${step.order}단계의 ${ingredientName}이 재료 목록에 없습니다.`,
          )
        }
      }
    }

    const searchableText = [
      recipe.description ?? '',
      ...steps.map((step) => step.instruction),
    ].join(' ')

    if (placeholderPattern.test(searchableText)) {
      addIssue(
        issues,
        recipe.id,
        'PLACEHOLDER',
        '공통 placeholder 문구가 남아 있습니다.',
      )
    }

    if (
      !recipe.seasoningAdjustment?.length ||
      !recipe.commonMistakes?.length ||
      !recipe.storage ||
      !recipe.reheating ||
      !recipe.leftoverIdeas?.length ||
      !recipe.servingSuggestions?.length
    ) {
      addIssue(
        issues,
        recipe.id,
        'EXTRA_GUIDANCE',
        '간 조절·실수·보관·재가열·활용·곁들이기 정보가 필요합니다.',
      )
    }
  }

  for (const recipeId of monthlyRecipeIds) {
    if (!recipeIds.has(recipeId)) {
      addIssue(
        issues,
        recipeId,
        'MONTHLY_PLAN_LINK',
        '30일 기본 식단의 Recipe ID가 연결되지 않습니다.',
      )
    }
  }

  return issues
}

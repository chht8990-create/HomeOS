import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({
  appType: 'custom',
  logLevel: 'silent',
  server: {
    middlewareMode: true,
  },
})
const completedChecks = []

async function check(name, assertion) {
  await assertion()
  completedChecks.push(name)
}

try {
  const {
    calculateRecipeReadinessPercent,
    recommendRecipes,
  } = await vite.ssrLoadModule(
    '/src/services/recommendationEngine.ts',
  )
  const { groupShoppingItemsByCategory } =
    await vite.ssrLoadModule(
      '/src/services/shoppingCategoryEngine.ts',
    )
  const { findRecipeByMealName } =
    await vite.ssrLoadModule(
      '/src/services/recipeEngine.ts',
    )
  const {
    AI_MAX_INVENTORY_ITEMS,
    normalizeAiRecipeRecommendations,
    parseAiRecipeRecommendationOutput,
    validateAiRecipeRecommendationRequest,
  } = await vite.ssrLoadModule(
    '/src/services/aiRecipeRecommendationEngine.ts',
  )
  const {
    handleAiRecipeRecommendation,
    mapOpenAiError,
    parseOpenAiErrorDetails,
  } = await vite.ssrLoadModule(
    '/api/ai/recipe-recommendation.ts',
  )
  const { recipes: builtInRecipes } =
    await vite.ssrLoadModule(
      '/src/data/recipes.ts',
    )
  const {
    createDefaultMonthlyMealPlans,
    getMealPlansInRange,
    isDetailedRecipe,
  } = await vite.ssrLoadModule(
    '/src/services/defaultMealPlanEngine.ts',
  )
  const {
    createMealPlanShoppingIngredients,
  } = await vite.ssrLoadModule(
    '/src/services/mealPlanShoppingEngine.ts',
  )
  const {
    parseAiMealPlanTrialOutput,
    parseStoredAiMealPlanTrial,
    validateAiMealPlanTrialRequest,
  } = await vite.ssrLoadModule(
    '/src/services/aiMealPlanTrialEngine.ts',
  )
  const { handleAiMealPlanTrial } =
    await vite.ssrLoadModule(
      '/api/ai/meal-plan-trial.ts',
    )

  const recipe = {
    id: 'recipe-test-stew',
    name: '테스트 찌개',
    ingredients: [
      {
        id: 'ingredient-kimchi',
        name: '김치',
        quantity: 1,
        unit: '포기',
      },
      {
        id: 'ingredient-tofu',
        name: '두부',
        quantity: 1,
        unit: '모',
      },
    ],
  }
  const inventoryItem = {
    id: 'inventory-kimchi',
    name: '김치',
    quantity: 1,
    unit: '포기',
    location: 'fridge',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  await check(
    'Recommendation: 재고가 없으면 조리 가능률 0%',
    () => {
      const [result] = recommendRecipes([recipe], [])

      assert.equal(result.missingIngredientCount, 2)
      assert.equal(
        calculateRecipeReadinessPercent(
          recipe.ingredients.length,
          result.missingIngredientCount,
        ),
        0,
      )
    },
  )

  await check(
    'Recommendation: 재료 하나 보유 시 비율과 부족 개수 갱신',
    () => {
      const [result] = recommendRecipes(
        [recipe],
        [inventoryItem],
      )

      assert.equal(result.missingIngredientCount, 1)
      assert.equal(
        calculateRecipeReadinessPercent(
          recipe.ingredients.length,
          result.missingIngredientCount,
        ),
        50,
      )
    },
  )

  await check(
    'Shopping: 동일 품목을 병합하고 같은 단위 수량을 합산',
    () => {
      const shoppingItems = [
        {
          id: 'shopping-manual',
          name: ' 바나나 ',
          quantity: 6,
          unit: '개',
          completed: false,
          source: 'manual',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'shopping-meal',
          name: '바나나',
          quantity: 6,
          unit: '개',
          completed: false,
          source: 'meal',
          sourceId: 'planner:2026-01-01:dinner',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]
      const before = JSON.stringify(shoppingItems)
      const groups =
        groupShoppingItemsByCategory(shoppingItems)
      const displayItems = groups.flatMap(
        (group) => group.items,
      )

      assert.equal(displayItems.length, 1)
      assert.deepEqual(displayItems[0].itemIds, [
        'shopping-manual',
        'shopping-meal',
      ])
      assert.deepEqual(displayItems[0].quantities, [
        { quantity: 12, unit: '개' },
      ])
      assert.deepEqual(
        displayItems[0].sourceTypes.sort(),
        ['manual', 'meal'],
      )
      assert.equal(JSON.stringify(shoppingItems), before)
    },
  )

  await check(
    'Recipe 연결: 존재하는 메뉴는 찾고 없는 메뉴는 안전 처리',
    () => {
      assert.equal(
        findRecipeByMealName(' 테스트찌개 ', [recipe])
          ?.id,
        recipe.id,
      )
      assert.equal(
        findRecipeByMealName('없는 메뉴', [recipe]),
        undefined,
      )
    },
  )

  await check(
    'AI request: 정상 입력에서 필요한 재료 정보만 유지',
    () => {
      const result =
        validateAiRecipeRecommendationRequest({
          inventoryItems: [
            {
              id: 'private-storage-id',
              name: ' 계란 ',
              quantity: 2,
              unit: '개',
              location: 'fridge',
            },
          ],
          servings: 2,
        })

      assert.equal(result.ok, true)

      if (result.ok) {
        assert.deepEqual(result.data, {
          inventoryItems: [
            {
              name: '계란',
              quantity: 2,
              unit: '개',
            },
          ],
          servings: 2,
        })
      }
    },
  )

  await check(
    'AI request: 빈 냉장고를 안전하게 거부',
    () => {
      const result =
        validateAiRecipeRecommendationRequest({
          inventoryItems: [],
          servings: 2,
        })

      assert.equal(result.ok, false)

      if (!result.ok) {
        assert.equal(result.code, 'EMPTY_INVENTORY')
      }
    },
  )

  await check(
    'AI request: 최대 재료 개수 초과를 거부',
    () => {
      const result =
        validateAiRecipeRecommendationRequest({
          inventoryItems: Array.from(
            {
              length:
                AI_MAX_INVENTORY_ITEMS + 1,
            },
            (_, index) => ({
              name: `재료 ${index}`,
              quantity: 1,
              unit: '개',
            }),
          ),
          servings: 2,
        })

      assert.equal(result.ok, false)

      if (!result.ok) {
        assert.equal(
          result.code,
          'TOO_MANY_INGREDIENTS',
        )
      }
    },
  )

  await check(
    'AI response: 잘못된 구조를 결과로 사용하지 않음',
    () => {
      assert.equal(
        parseAiRecipeRecommendationOutput({
          recommendations: [
            {
              title: '형식 오류 메뉴',
              ingredients: '잘못된 값',
            },
          ],
        }),
        null,
      )
    },
  )

  await check(
    'AI response: 중복·보유 상태·부족 수량·제외 재료를 정규화',
    () => {
      const recommendations = [
        {
          title: '두부 달걀 덮밥',
          summary: '가족이 함께 먹기 좋은 덮밥',
          servings: 2,
          estimatedMinutes: 25,
          ingredients: [
            {
              name: '계란',
              quantity: 1,
              unit: '개',
              available: false,
            },
            {
              name: ' 계란 ',
              quantity: 1,
              unit: '개',
              available: false,
            },
            {
              name: '두부',
              quantity: 1,
              unit: '모',
              available: true,
            },
          ],
          missingIngredients: [
            {
              name: '잘못된 재료',
              quantity: 10,
              unit: '개',
            },
          ],
          steps: ['재료를 충분히 익혀요.'],
        },
        {
          title: ' 두부 달걀 덮밥 ',
          summary: '중복 메뉴',
          servings: 2,
          estimatedMinutes: 20,
          ingredients: [
            {
              name: '계란',
              quantity: 2,
              unit: '개',
              available: true,
            },
          ],
          missingIngredients: [],
          steps: ['익혀요.'],
        },
        {
          title: '돼지고기 볶음',
          summary: '제외되어야 하는 메뉴',
          servings: 2,
          estimatedMinutes: 20,
          ingredients: [
            {
              name: '돼지고기',
              quantity: 300,
              unit: 'g',
              available: true,
            },
          ],
          missingIngredients: [],
          steps: ['충분히 익혀요.'],
        },
      ]
      const original = JSON.stringify(recommendations)
      const normalized =
        normalizeAiRecipeRecommendations(
          recommendations,
          {
            inventoryItems: [
              {
                name: '계란',
                quantity: 1,
                unit: '개',
              },
              {
                name: '두부',
                quantity: 1,
                unit: '모',
              },
            ],
            servings: 2,
            excludedIngredients: ['돼지고기'],
          },
        )

      assert.equal(normalized.length, 1)
      assert.deepEqual(normalized[0].ingredients, [
        {
          name: '계란',
          quantity: 2,
          unit: '개',
          available: false,
        },
        {
          name: '두부',
          quantity: 1,
          unit: '모',
          available: true,
        },
      ])
      assert.deepEqual(
        normalized[0].missingIngredients,
        [
          {
            name: '계란',
            quantity: 1,
            unit: '개',
          },
        ],
      )
      assert.equal(JSON.stringify(recommendations), original)
    },
  )

  await check(
    'AI endpoint: API Key 미설정 상태를 명확히 반환',
    async () => {
      const response =
        await handleAiRecipeRecommendation(
          new Request(
            'http://localhost/api/ai/recipe-recommendation',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inventoryItems: [
                  {
                    name: '계란',
                    quantity: 2,
                    unit: '개',
                  },
                ],
                servings: 2,
              }),
            },
          ),
          {
            NODE_ENV: 'production',
          },
        )
      const body = await response.json()

      assert.equal(response.status, 503)
      assert.equal(body.code, 'AI_NOT_CONFIGURED')
    },
  )

  await check(
    'AI endpoint: upstream 오류 메타데이터를 제한하고 비밀값을 제거',
    () => {
      const details = parseOpenAiErrorDetails(
        401,
        JSON.stringify({
          error: {
            type: 'invalid_request_error',
            code: 'invalid_api_key',
            param: null,
            message:
              'Incorrect API key provided: sk-testsecretvalue',
          },
        }),
        'req_test',
      )

      assert.deepEqual(details, {
        upstreamStatus: 401,
        errorType: 'invalid_request_error',
        errorCode: 'invalid_api_key',
        errorParam: null,
        errorMessage:
          'Incorrect API key provided: [redacted]',
        requestId: 'req_test',
      })
    },
  )

  await check(
    'AI endpoint: upstream 상태를 안전한 사용자 오류로 구분',
    () => {
      assert.equal(mapOpenAiError(400).status, 400)
      assert.equal(mapOpenAiError(401).status, 401)
      assert.equal(mapOpenAiError(403).status, 403)
      assert.equal(mapOpenAiError(429).status, 429)
      assert.equal(mapOpenAiError(500).status, 503)
      assert.equal(mapOpenAiError(418).status, 502)
    },
  )

  await check(
    'AI endpoint: Mock 성공 응답도 최대 3개와 스키마를 준수',
    async () => {
      const response =
        await handleAiRecipeRecommendation(
          new Request(
            'http://localhost/api/ai/recipe-recommendation',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inventoryItems: [
                  {
                    name: '계란',
                    quantity: 2,
                    unit: '개',
                  },
                ],
                servings: 2,
              }),
            },
          ),
          {
            HOMEOS_AI_MOCK: 'true',
            NODE_ENV: 'development',
          },
        )
      const body = await response.json()
      const parsed =
        parseAiRecipeRecommendationOutput(body)

      assert.equal(response.status, 200)
      assert.equal(parsed?.length, 3)
    },
  )

  await check(
    '기본 식단: 30일 모두 상세 Recipe ID에 연결되고 공통 placeholder가 없음',
    () => {
      const plans = createDefaultMonthlyMealPlans(
        '2026-08-01',
        builtInRecipes,
        '2026-08-01T00:00:00.000Z',
      )
      const recipeById = new Map(
        builtInRecipes.map((item) => [
          item.id,
          item,
        ]),
      )
      const allIngredientIds = builtInRecipes.flatMap(
        (recipe) => [
          ...recipe.ingredients,
          ...recipe.optionalIngredients,
        ],
      ).map((ingredient) => ingredient.id)

      assert.equal(plans.length, 30)
      assert.equal(
        recipeById.size,
        builtInRecipes.length,
      )
      assert.equal(
        new Set(allIngredientIds).size,
        allIngredientIds.length,
      )
      assert.equal(
        new Set(plans.map((plan) => plan.id)).size,
        30,
      )
      assert.equal(
        new Set(
          plans.map((plan) => plan.recipeId),
        ).size >= 20,
        true,
      )
      const useCounts = plans.reduce(
        (counts, plan) => {
          counts.set(
            plan.recipeId,
            (counts.get(plan.recipeId) ?? 0) + 1,
          )
          return counts
        },
        new Map(),
      )
      assert.equal(
        [...useCounts.values()].every(
          (count) => count <= 2,
        ),
        true,
      )
      assert.equal(
        plans.every((plan) => {
          const connectedRecipe = recipeById.get(
            plan.recipeId,
          )

          return (
            connectedRecipe &&
            isDetailedRecipe(connectedRecipe) &&
            connectedRecipe.steps.length >= 5 &&
            connectedRecipe.steps.length <= 10
          )
        }),
        true,
      )
      assert.equal(
        plans.some(
          (plan, index) =>
            index > 0 &&
            plan.name === plans[index - 1].name,
        ),
        false,
      )
      assert.equal(
        plans.some(
          (plan) => plan.name === '김치찌개',
        ),
        true,
      )
      const newRecipeIds = [
        'japchae',
        'chicken-soup',
        'salmon-soy-grill',
        'vegetable-bibimbap',
        'squid-radish-soup',
        'steamed-egg',
        'andong-jjimdak',
        'potato-pancake',
        'tofu-mushroom-rice',
        'boiled-pork',
      ]
      assert.equal(
        newRecipeIds.every((recipeId) => {
          const recipe = recipeById.get(recipeId)

          return (
            recipe &&
            recipe.servings > 0 &&
            recipe.prepMinutes >= 0 &&
            recipe.cookMinutes > 0 &&
            recipe.ingredients.every(
              (ingredient) =>
                ingredient.quantity > 0 &&
                ingredient.unit.trim().length > 0,
            ) &&
            recipe.optionalIngredients.length > 0 &&
            recipe.substitutions.length > 0 &&
            recipe.steps.length >= 5 &&
            recipe.steps.every(
              (recipeStep) =>
                recipeStep.minutes > 0 &&
                Boolean(recipeStep.heat?.trim()) &&
                Boolean(recipeStep.doneness?.trim()),
            )
          )
        }),
        true,
      )
      assert.equal(
        /기본 조리 안내|공통 placeholder|상세 조리법 준비 중/.test(
          JSON.stringify(builtInRecipes),
        ),
        false,
      )
      const menuGroups = new Map([
        ['kimchi-stew', '찌개'],
        ['grilled-mackerel', '생선'],
        ['egg-fried-rice', '밥'],
        ['chicken-soup', '국'],
        ['japchae', '면'],
        ['steamed-egg', '계란'],
        ['beef-bulgogi', '육류'],
        ['vegetable-bibimbap', '밥'],
        ['braised-tofu', '두부'],
        ['squid-radish-soup', '국'],
        ['curry', '카레'],
        ['salmon-soy-grill', '생선'],
        ['soybean-paste-stew', '찌개'],
        ['andong-jjimdak', '찜'],
        ['potato-pancake', '전'],
        ['beef-seaweed-soup', '국'],
        ['tofu-mushroom-rice', '밥'],
        ['spicy-pork', '볶음'],
        ['boiled-pork', '육류'],
        ['chicken-galbi', '볶음'],
      ])
      assert.equal(
        plans.some(
          (plan, index) =>
            index > 0 &&
            menuGroups.get(plan.recipeId) ===
              menuGroups.get(
                plans[index - 1].recipeId,
              ),
        ),
        false,
      )
      assert.equal(
        plans.some((plan) => plan.name === '카레'),
        true,
      )
      assert.equal(
        plans.some(
          (plan) => plan.name === '계란볶음밥',
        ),
        true,
      )
    },
  )

  await check(
    '식단 보기: 오늘·일주일·보름·한 달 범위를 정확히 반환',
    () => {
      const plans = createDefaultMonthlyMealPlans(
        '2026-08-01',
        builtInRecipes,
      )

      assert.equal(
        getMealPlansInRange(
          plans,
          '2026-08-01',
          'today',
        ).length,
        1,
      )
      assert.equal(
        getMealPlansInRange(
          plans,
          '2026-08-01',
          'week',
        ).length,
        7,
      )
      assert.equal(
        getMealPlansInRange(
          plans,
          '2026-08-01',
          'fortnight',
        ).length,
        15,
      )
      assert.equal(
        getMealPlansInRange(
          plans,
          '2026-08-01',
          'month',
        ).length,
        30,
      )
    },
  )

  await check(
    '식단 장보기: 같은 재료 합산·냉장고 차감·기본 조미료 제외',
    () => {
      const plans = createDefaultMonthlyMealPlans(
        '2026-08-01',
        builtInRecipes,
      )
      const result =
        createMealPlanShoppingIngredients(
          plans,
          builtInRecipes,
          [
            {
              id: 'inventory-onion',
              name: '양파',
              quantity: 2,
              unit: '개',
              location: 'fridge',
              createdAt:
                '2026-08-01T00:00:00.000Z',
              updatedAt:
                '2026-08-01T00:00:00.000Z',
            },
          ],
          '2026-08-01',
          'week',
        )
      const onion = result.ingredients.find(
        (ingredient) =>
          ingredient.name === '양파' &&
          ingredient.unit === '개',
      )
      const resultWithoutInventory =
        createMealPlanShoppingIngredients(
          plans,
          builtInRecipes,
          [],
          '2026-08-01',
          'week',
        )
      const onionWithoutInventory =
        resultWithoutInventory.ingredients.find(
          (ingredient) =>
            ingredient.name === '양파' &&
            ingredient.unit === '개',
        )

      assert.equal(result.selectedMealPlans.length, 7)
      assert.equal(
        onion?.quantity,
        (onionWithoutInventory?.quantity ?? 0) - 2,
      )
      assert.equal(
        result.ingredients.some((ingredient) =>
          ['물', '소금', '식용유', '후추', '설탕'].includes(
            ingredient.name,
          ),
        ),
        false,
      )
    },
  )

  await check(
    'AI 7일 체험: 정상 요청과 7개 상세 레시피 응답을 검증',
    () => {
      const request = {
        startDate: '2026-08-01',
        householdSize: 4,
        includesChildren: true,
        childAgeGroup: '초등학생',
        spicePreference: 'mild',
        excludedFoods: '땅콩',
        allergies: '새우',
        weekdayMaxMinutes: 40,
        inventoryItems: [
          {
            name: '계란',
            quantity: 4,
            unit: '개',
          },
        ],
      }
      const validation =
        validateAiMealPlanTrialRequest(request)

      assert.equal(validation.ok, true)

      if (!validation.ok) {
        return
      }

      const output = {
        days: Array.from(
          { length: 7 },
          (_, index) => ({
            day: index + 1,
            recipe: {
              name: `가정식 메뉴 ${index + 1}`,
              servings: 4,
              prepMinutes: 10,
              cookMinutes: 25,
              ingredients: [
                {
                  name: '계란',
                  quantity: 2,
                  unit: '개',
                },
                {
                  name: `채소 ${index + 1}`,
                  quantity: 1,
                  unit: '개',
                },
              ],
              optionalIngredients: [],
              substitutions: [
                {
                  ingredientName: `채소 ${index + 1}`,
                  alternatives: ['버섯 100g'],
                },
              ],
              steps: Array.from(
                { length: 5 },
                (_, stepIndex) => ({
                  order: stepIndex + 1,
                  instruction: `${stepIndex + 1}단계 조리`,
                  minutes: 5,
                  heat: '중불',
                  doneness: '속까지 충분히 익어요.',
                }),
              ),
            },
          }),
        ),
      }
      const parsed = parseAiMealPlanTrialOutput(
        output,
        validation.data,
      )

      assert.equal(parsed?.recipes.length, 7)
      assert.equal(parsed?.plans.length, 7)
      assert.equal(
        parsed?.weeklyShoppingIngredients.length,
        8,
      )
      assert.equal(
        parsed?.plans.every(
          (plan) =>
            plan.source === 'ai-trial' &&
            Boolean(plan.recipeId),
        ),
        true,
      )
      assert.equal(
        parseStoredAiMealPlanTrial({
          formatVersion: '1',
          usedAt:
            '2026-08-01T00:00:00.000Z',
          response: parsed,
        })?.response.plans.length,
        7,
      )
      assert.equal(
        parseStoredAiMealPlanTrial({
          formatVersion: '1',
          usedAt:
            '2026-08-01T00:00:00.000Z',
          response: {
            plans: [],
            recipes: [],
            weeklyShoppingIngredients: [],
            meta: {
              generatedAt:
                '2026-08-01T00:00:00.000Z',
            },
          },
        }),
        null,
      )
    },
  )

  await check(
    'AI 7일 체험 endpoint: API Key 미설정 시 체험 차감 없는 설정 오류',
    async () => {
      const response = await handleAiMealPlanTrial(
        new Request(
          'http://localhost/api/ai/meal-plan-trial',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              startDate: '2026-08-01',
              householdSize: 4,
              includesChildren: false,
              spicePreference: 'mild',
              weekdayMaxMinutes: 40,
              inventoryItems: [],
            }),
          },
        ),
        {
          NODE_ENV: 'production',
        },
      )
      const body = await response.json()

      assert.equal(response.status, 503)
      assert.equal(body.code, 'AI_NOT_CONFIGURED')
    },
  )

  await check(
    'AI 7일 체험 endpoint: 개발 Mock도 저장 가능한 7일 결과를 반환',
    async () => {
      const response = await handleAiMealPlanTrial(
        new Request(
          'http://localhost/api/ai/meal-plan-trial',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              startDate: '2026-08-01',
              householdSize: 4,
              includesChildren: false,
              spicePreference: 'mild',
              weekdayMaxMinutes: 40,
              inventoryItems: [],
            }),
          },
        ),
        {
          NODE_ENV: 'development',
          HOMEOS_AI_MOCK: 'true',
        },
      )
      const body = await response.json()

      assert.equal(response.status, 200)
      assert.equal(body.plans.length, 7)
      assert.equal(body.recipes.length, 7)
      assert.equal(body.meta.model, 'mock')
    },
  )
} finally {
  await vite.close()
}

for (const name of completedChecks) {
  console.log(`✓ ${name}`)
}

console.log(
  `\n${completedChecks.length} core checks passed`,
)

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
} finally {
  await vite.close()
}

for (const name of completedChecks) {
  console.log(`✓ ${name}`)
}

console.log(
  `\n${completedChecks.length} core checks passed`,
)

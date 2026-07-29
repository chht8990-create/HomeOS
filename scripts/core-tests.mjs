import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
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
  await check(
    'Release 1.0.1: package와 앱 표시 버전 동기화',
    () => {
      const packageJson = JSON.parse(
        readFileSync('package.json', 'utf8'),
      )
      const packageLock = JSON.parse(
        readFileSync('package-lock.json', 'utf8'),
      )
      const settingsPage = readFileSync(
        'src/pages/SettingsPage.tsx',
        'utf8',
      )

      assert.equal(packageJson.version, '1.0.1')
      assert.equal(packageLock.version, '1.0.1')
      assert.equal(
        packageLock.packages[''].version,
        '1.0.1',
      )
      assert.match(settingsPage, />1\.0\.1</)
    },
  )

  await check(
    'PWA manifest: 오늘식탁 메타데이터와 필수 아이콘',
    () => {
      const manifest = JSON.parse(
        readFileSync(
          'public/manifest.webmanifest',
          'utf8',
        ),
      )

      assert.equal(manifest.name, '오늘식탁')
      assert.equal(manifest.display, 'standalone')
      assert.equal(manifest.start_url, '/')
      assert.equal(manifest.scope, '/')
      assert.ok(
        manifest.icons.every((icon) =>
          existsSync(`public${icon.src}`),
        ),
      )
    },
  )

  await check(
    'PWA 등록: Production 전용 Service Worker',
    () => {
      const mainSource = readFileSync(
        'src/main.tsx',
        'utf8',
      )

      assert.match(
        mainSource,
        /import\.meta\.env\.PROD/,
      )
      assert.match(
        mainSource,
        /\.register\('\/sw\.js'/,
      )
      assert.match(
        mainSource,
        /updateViaCache: 'none'/,
      )
    },
  )

  await check(
    'PWA 캐시: v1.0.1 앱 셸·업데이트·API 제외 정책',
    () => {
      const serviceWorker = readFileSync(
        'public/sw.js',
        'utf8',
      )

      assert.match(
        serviceWorker,
        /RELEASE_VERSION = '1\.0\.1'/,
      )
      assert.match(
        serviceWorker,
        /home-os-one\.vercel\.app/,
      )
      assert.match(
        serviceWorker,
        /request\.method === 'GET'/,
      )
      assert.match(
        serviceWorker,
        /pathname\.startsWith\('\/api\/'\)/,
      )
      assert.match(
        serviceWorker,
        /request\.mode === 'navigate'/,
      )
      assert.match(
        serviceWorker,
        /networkFirstNavigation/,
      )
      assert.match(serviceWorker, /caches\.delete/)
      assert.doesNotMatch(
        serviceWorker,
        /skipWaiting/,
      )
    },
  )

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
  const {
    calculateShoppingPurchase,
    deleteShoppingItems,
    getShoppingReminderItems,
    markShoppingItemsForReminder,
    normalizeShoppingItem,
    normalizeStoredShoppingItem,
    restoreShoppingReminderItems,
    shouldShowShoppingReminder,
    summarizeShoppingPurchase,
    updateShoppingPurchase,
  } = await vite.ssrLoadModule(
    '/src/services/shoppingPurchaseEngine.ts',
  )
  const {
    mergeCompletedShoppingIntoInventory,
  } = await vite.ssrLoadModule(
    '/src/services/shoppingInventoryEngine.ts',
  )
  const { default: StyledSelect } =
    await vite.ssrLoadModule(
      '/src/components/ui/StyledSelect.tsx',
    )
  const { default: DatePickerField } =
    await vite.ssrLoadModule(
      '/src/components/ui/DatePickerField.tsx',
    )
  const { RecipeIngredientStatusBadge } =
    await vite.ssrLoadModule(
      '/src/pages/RecipePage.tsx',
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
  const { recipeImages } = await vite.ssrLoadModule(
    '/src/data/recipeImages.ts',
  )
  const { auditPremiumRecipes } =
    await vite.ssrLoadModule(
      '/src/services/recipeIntegrityEngine.ts',
    )
  const {
    formatRecipeAmount,
    mergeRecipeCatalog,
    normalizeRecipe,
    scaleRecipeAmount,
  } = await vite.ssrLoadModule(
    '/src/services/recipeNormalizationEngine.ts',
  )
  const {
    createNavigationState,
    createNavigationUrl,
    isSameNavigationTarget,
    planTopLevelNavigation,
    readNavigationState,
  } = await vite.ssrLoadModule(
    '/src/services/appNavigationEngine.ts',
  )
  const {
    createTemporaryModalHistoryState,
    isTemporaryModalHistoryState,
  } = await vite.ssrLoadModule(
      '/src/hooks/useHistoryModal.ts',
    )
  const {
    createMeasurementSuggestions,
    defaultMeasurementTools,
    parseMeasurementTools,
    toggleMeasurementTool,
    tutorialMeasurementTools,
  } = await vite.ssrLoadModule(
    '/src/services/measurementEngine.ts',
  )
  const {
    normalizePositiveIntegerInput,
  } = await vite.ssrLoadModule(
    '/src/services/integerInputEngine.ts',
  )
  const {
    getInventoryListDisplayName,
  } = await vite.ssrLoadModule(
    '/src/services/inventoryPresentationEngine.ts',
  )
  const {
    parseTutorialSettings,
    readTutorialSettings,
  } = await vite.ssrLoadModule(
    '/src/services/tutorialSettingsEngine.ts',
  )
  const { tutorialPages } =
    await vite.ssrLoadModule(
      '/src/data/tutorialPages.ts',
    )
  const { default: Dialog } =
    await vite.ssrLoadModule(
      '/src/components/ui/Dialog.tsx',
    )
  const {
    DEFAULT_MONTHLY_RECIPE_IDS,
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
    addRecipeToStoredAiMealPlanTrial,
    getAiMealPlanTrialFailureState,
    parseAiMealPlanDraftOutput,
    parseAiMealPlanTrialOutput,
    parseStoredAiMealPlanTrial,
    validateAiMealPlanRecipeDetailRequest,
    validateAiMealPlanTrialRequest,
  } = await vite.ssrLoadModule(
    '/src/services/aiMealPlanTrialEngine.ts',
  )
  const {
    requestAiMealPlanTrial,
  } = await vite.ssrLoadModule(
    '/src/services/aiMealPlanTrialClient.ts',
  )
  const { handleAiMealPlanTrial } =
    await vite.ssrLoadModule(
      '/api/ai/meal-plan-trial.ts',
    )
  const { handleAiMealPlanRecipeDetail } =
    await vite.ssrLoadModule(
      '/api/ai/meal-plan-recipe-detail.ts',
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

  function createTestAiDetails(
    ingredientNames,
    estimatedMinutes,
  ) {
    return {
      difficulty: '쉬움',
      prepTimeMinutes: 5,
      cookTimeMinutes: estimatedMinutes - 5,
      calories: null,
      steps: Array.from({ length: 8 }, (_, index) => ({
        order: index + 1,
        title: `${index + 1}단계`,
        instruction: `${ingredientNames[index % ingredientNames.length]}을(를) 순서대로 조리해요.`,
        durationMinutes: 2,
        heatLevel:
          index < 2 ? '불 사용 안 함' : '중불',
        completionCue: '재료가 알맞게 익어요.',
        reason: null,
        warning: null,
        ingredientRefs: [
          ingredientNames[
            index % ingredientNames.length
          ],
        ],
      })),
      seasoningAdjustment: ['간을 조금씩 맞춰요.'],
      commonMistakes: ['센 불로 태우지 않아요.'],
      storage: '식혀 냉장 보관해요.',
      reheating: '중심까지 충분히 데워요.',
      leftoverIdeas: ['남은 음식은 볶음밥으로 활용해요.'],
      servingSuggestions: ['제철 반찬과 곁들여요.'],
    }
  }

  const tutorialSource = readFileSync(
    new URL(
      '../src/components/FirstRunTutorial.tsx',
      import.meta.url,
    ),
    'utf8',
  )
  const recipePageSource = readFileSync(
    new URL(
      '../src/pages/RecipePage.tsx',
      import.meta.url,
    ),
    'utf8',
  )
  const uiCssSource = readFileSync(
    new URL(
      '../src/components/ui/ui.css',
      import.meta.url,
    ),
    'utf8',
  )
  const recipeCssSource = readFileSync(
    new URL(
      '../src/pages/RecipePage.css',
      import.meta.url,
    ),
    'utf8',
  )

  await check(
    'Tutorial: 최초 실행과 다시 보지 않기 설정 판별',
    () => {
      assert.equal(tutorialPages.length, 5)
      assert.equal(
        tutorialPages[0].title,
        '오늘식탁에 오신 것을 환영합니다.',
      )
      assert.equal(
        parseTutorialSettings(null)
          .doNotShowAgain,
        false,
      )
      assert.equal(
        readTutorialSettings({
          getItem: () =>
            JSON.stringify({
              doNotShowAgain: true,
            }),
        }).doNotShowAgain,
        true,
      )
    },
  )

  await check(
    'Tutorial CTA: 주요 버튼 문구를 48px 한 줄로 유지',
    () => {
      const ctaRule = uiCssSource.match(
        /\.first-run-tutorial__actions \.ui-button,\s*\.meal-plan-welcome__actions \.ui-button\s*\{([^}]+)\}/,
      )?.[1]

      assert.ok(ctaRule)
      assert.match(ctaRule, /min-height:\s*48px/)
      assert.match(ctaRule, /align-items:\s*center/)
      assert.match(ctaRule, /justify-content:\s*center/)
      assert.match(ctaRule, /white-space:\s*nowrap/)
      assert.match(
        tutorialSource,
        /오늘식탁 시작하기/,
      )
      assert.doesNotMatch(
        tutorialSource,
        /오늘식탁\s*<br\s*\/?>\s*시작하기/,
      )
    },
  )

  await check(
    'Recipe 계량 액션: 가로 텍스트·간격·투명 보조 액션 유지',
    () => {
      const measurementRule = recipeCssSource.match(
        /\.recipe-ingredient-list__measurement\s*\{([^}]+)\}/,
      )?.[1]
      const actionRule = recipeCssSource.match(
        /\.recipe-measurement-button\s*\{([^}]+)\}/,
      )?.[1]
      const numberRule = recipeCssSource.match(
        /\.recipe-ingredient-list \.ui-number\s*\{([^}]+)\}/,
      )?.[1]

      assert.ok(measurementRule)
      assert.ok(actionRule)
      assert.ok(numberRule)
      assert.match(
        measurementRule,
        /gap:\s*var\(--space-4\)/,
      )
      assert.match(
        measurementRule,
        /white-space:\s*nowrap/,
      )
      assert.match(actionRule, /width:\s*auto/)
      assert.match(actionRule, /min-width:\s*44px/)
      assert.match(actionRule, /height:\s*44px/)
      assert.match(
        actionRule,
        /border:\s*0/,
      )
      assert.match(
        actionRule,
        /border-color:\s*transparent/,
      )
      assert.match(
        actionRule,
        /background:\s*transparent/,
      )
      assert.match(
        actionRule,
        /white-space:\s*nowrap/,
      )
      assert.match(numberRule, /white-space:\s*nowrap/)
      assert.match(recipePageSource, /<span>계량<\/span>/)
      assert.match(
        recipePageSource,
        /계량 방법 보기/,
      )
    },
  )

  await check(
    'Measurement: 선택한 계량도구 설정 정규화',
    () => {
      assert.deepEqual(
        parseMeasurementTools([
          'paper-cup',
          'paper-cup',
          'unknown',
          'scale',
        ]),
        ['paper-cup', 'scale'],
      )
      assert.deepEqual(defaultMeasurementTools, [
        'measuring-spoon',
        'paper-cup',
        'rice-spoon',
      ])
      assert.deepEqual(tutorialMeasurementTools, [
        'measuring-spoon',
        'paper-cup',
        'rice-spoon',
        'scale',
      ])
      assert.deepEqual(
        toggleMeasurementTool(
          defaultMeasurementTools,
          'scale',
        ),
        [
          'measuring-spoon',
          'paper-cup',
          'rice-spoon',
          'scale',
        ],
      )
    },
  )

  await check(
    'Input: 인원 입력 선행 0 제거와 기본값 저장',
    () => {
      const options = {
        defaultValue: 4,
        min: 1,
        max: 12,
      }

      assert.equal(
        normalizePositiveIntegerInput('06', options),
        6,
      )
      assert.equal(
        normalizePositiveIntegerInput('0012', options),
        12,
      )
      assert.equal(
        normalizePositiveIntegerInput('', options),
        4,
      )
      assert.equal(
        JSON.parse(
          JSON.stringify({
            servings: normalizePositiveIntegerInput(
              '06',
              options,
            ),
          }),
        ).servings,
        6,
      )
    },
  )

  await check(
    'Inventory: 목록은 계산 수량을 숨기고 재료명만 표시',
    () => {
      const item = {
        name: ' 양파 ',
        quantity: 12,
        unit: 'g',
      }

      assert.equal(
        getInventoryListDisplayName(item),
        '양파',
      )
      assert.doesNotMatch(
        getInventoryListDisplayName(item),
        /12|g/,
      )
    },
  )

  await check(
    'Measurement: 700ml를 종이컵 3컵 반으로 안내',
    () => {
      const suggestions =
        createMeasurementSuggestions(
          {
            name: '물',
            amount: 700,
            unit: 'ml',
          },
          ['paper-cup'],
        )

      assert.equal(suggestions.length, 1)
      assert.equal(
        suggestions[0].measurement,
        '3컵 반',
      )
    },
  )

  await check(
    'Measurement: 1큰술은 작은 컵보다 계량스푼을 우선',
    () => {
      const suggestions =
        createMeasurementSuggestions(
          {
            name: '국간장',
            amount: 15,
            unit: 'ml',
          },
          [
            'measuring-spoon',
            'measuring-cup',
            'paper-cup',
            'rice-spoon',
          ],
        )

      assert.deepEqual(
        suggestions.map(
          (suggestion) =>
            `${suggestion.toolLabel}:${suggestion.measurement}`,
        ),
        ['계량스푼:1큰술', '밥숟가락:약 1스푼'],
      )
    },
  )

  await check(
    'Bottom sheet: 드래그 닫기 손잡이 렌더링',
    () => {
      const markup = renderToStaticMarkup(
        createElement(
          Dialog,
          {
            open: true,
            title: '계량 도우미',
            onClose: () => undefined,
            placement: 'bottom',
          },
          '내용',
        ),
      )

      assert.match(
        markup,
        /ui-dialog__drag-handle/,
      )
    },
  )

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
    'UI 입력: Styled Select와 날짜 필드가 label·값을 유지',
    () => {
      const selectMarkup = renderToStaticMarkup(
        createElement(
          StyledSelect,
          {
            label: '장보기 범위',
            defaultValue: 'week',
          },
          createElement(
            'option',
            { value: 'week' },
            '일주일',
          ),
        ),
      )
      const dateMarkup = renderToStaticMarkup(
        createElement(DatePickerField, {
          label: '식단 날짜',
          defaultValue: '2026-08-01',
        }),
      )

      assert.match(
        selectMarkup,
        /ui-select-control/,
      )
      assert.match(selectMarkup, /장보기 범위/)
      assert.match(selectMarkup, /일주일/)
      assert.match(dateMarkup, /type="date"/)
      assert.match(dateMarkup, /2026-08-01/)
      assert.match(dateMarkup, /식단 날짜/)
    },
  )

  await check(
    'Recipe 재료 상태: 아이콘 없이 상태 배지 하나만 표시',
    () => {
      const missingMarkup = renderToStaticMarkup(
        createElement(RecipeIngredientStatusBadge, {
          status: 'missing',
        }),
      )
      const ownedMarkup = renderToStaticMarkup(
        createElement(RecipeIngredientStatusBadge, {
          status: 'owned',
        }),
      )
      const optionalMarkup = renderToStaticMarkup(
        createElement(RecipeIngredientStatusBadge, {
          status: 'optional',
        }),
      )

      assert.equal(
        (missingMarkup.match(/부족/g) ?? []).length,
        2,
      )
      assert.equal(
        (missingMarkup.match(/<span/g) ?? []).length,
        1,
      )
      assert.doesNotMatch(missingMarkup, /<svg|!/)
      assert.match(
        missingMarkup,
        /aria-label="재료 상태: 부족"/,
      )
      assert.match(ownedMarkup, />보유<\/span>/)
      assert.match(optionalMarkup, />선택<\/span>/)
    },
  )

  await check(
    'Shopping 구매: 부분 구매 잔량과 묶음 초과 수량 계산',
    () => {
      const partial = calculateShoppingPurchase(3, {
        mode: 'single',
        purchasedQuantity: 1,
      })
      const packaged = calculateShoppingPurchase(2, {
        mode: 'package',
        packageQuantity: 3,
        purchasedPackageCount: 1,
      })

      assert.equal(partial.purchaseStatus, 'partial')
      assert.equal(
        partial.remainingPurchaseQuantity,
        2,
      )
      assert.equal(
        partial.purchasedTotalQuantity,
        1,
      )
      assert.equal(packaged.purchaseStatus, 'completed')
      assert.equal(
        packaged.purchasedTotalQuantity,
        3,
      )
      assert.equal(packaged.surplusQuantity, 1)

      const groupedItems = [
        {
          id: 'onion-a',
          name: '양파',
          quantity: 1,
          unit: '개',
          completed: false,
          source: 'manual',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
        {
          id: 'onion-b',
          name: '양파',
          quantity: 1,
          unit: '개',
          completed: false,
          source: 'manual',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ]
      const updatedGroupedItems =
        updateShoppingPurchase(
          groupedItems,
          groupedItems.map((item) => item.id),
          {
            mode: 'package',
            packageQuantity: 3,
            purchasedPackageCount: 1,
          },
          '2026-08-02T00:00:00.000Z',
        )
      const groupedSummary =
        summarizeShoppingPurchase(
          updatedGroupedItems,
        )

      assert.equal(
        updatedGroupedItems.every(
          (item) => item.completed,
        ),
        true,
      )
      assert.equal(groupedSummary.requiredQuantity, 2)
      assert.equal(
        groupedSummary.purchasedTotalQuantity,
        3,
      )
      assert.equal(groupedSummary.surplusQuantity, 1)
    },
  )

  await check(
    'Shopping 구매: 못 산 품목을 보존하고 다음 목록으로 복원',
    () => {
      const shoppingItem = {
        id: 'shopping-onion',
        name: '양파',
        quantity: 3,
        unit: '개',
        completed: false,
        source: 'manual',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      }
      const notPurchased = updateShoppingPurchase(
        [shoppingItem],
        [shoppingItem.id],
        {
          mode: 'single',
          purchasedQuantity: 0,
          notPurchased: true,
        },
        '2026-08-02T00:00:00.000Z',
      )
      const restored = restoreShoppingReminderItems(
        notPurchased,
        [shoppingItem.id],
        '2026-08-03T00:00:00.000Z',
      )

      assert.equal(
        notPurchased[0].purchaseStatus,
        'not-purchased',
      )
      assert.equal(
        notPurchased[0].reminderStatus,
        'pending',
      )
      assert.equal(restored[0].purchaseStatus, 'planned')
      assert.equal(restored[0].completed, false)
      assert.equal(
        restored[0].remainingPurchaseQuantity,
        3,
      )
    },
  )

  await check(
    'Shopping 리마인드: 냉장고 반영·재진입·복원·삭제에서 상태를 보존',
    () => {
      const timestamp = '2026-08-01T00:00:00.000Z'
      const baseItems = [
        {
          id: 'shopping-banana',
          name: '바나나',
          quantity: 6,
          unit: '개',
          completed: false,
          source: 'manual',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: 'shopping-apple',
          name: '사과',
          quantity: 3,
          unit: '개',
          completed: false,
          source: 'manual',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: 'shopping-milk',
          name: '우유',
          quantity: 4,
          unit: '개',
          completed: false,
          source: 'manual',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: 'shopping-onion',
          name: '양파',
          quantity: 2,
          unit: '개',
          completed: false,
          source: 'manual',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ]
      const completed = updateShoppingPurchase(
        baseItems,
        ['shopping-banana'],
        {
          mode: 'single',
          purchasedQuantity: 6,
        },
        timestamp,
      )
      const missed = updateShoppingPurchase(
        completed,
        ['shopping-apple'],
        {
          mode: 'single',
          purchasedQuantity: 0,
          notPurchased: true,
        },
        timestamp,
      )
      const partial = updateShoppingPurchase(
        missed,
        ['shopping-milk'],
        {
          mode: 'single',
          purchasedQuantity: 2,
        },
        timestamp,
      )
      const persisted = JSON.parse(
        JSON.stringify(partial),
      ).flatMap((item) => {
        const normalized =
          normalizeStoredShoppingItem(item)

        return normalized ? [normalized] : []
      })
      let nextId = 0
      const inventoryResult =
        mergeCompletedShoppingIntoInventory(
          [],
          persisted,
          {
            createId: () => `inventory-${++nextId}`,
            createApplicationId: () =>
              `application-${++nextId}`,
            now: '2026-08-02T00:00:00.000Z',
          },
        )
      const shoppingAfterCheckout =
        markShoppingItemsForReminder(
          inventoryResult.shoppingItems,
          [
            'shopping-apple',
            'shopping-milk',
            'shopping-onion',
          ],
          '2026-08-02T00:01:00.000Z',
        )
      const reminderItems =
        getShoppingReminderItems(
          shoppingAfterCheckout,
        )
      const partialItem =
        shoppingAfterCheckout.find(
          (item) => item.id === 'shopping-milk',
        )
      const plannedItem =
        shoppingAfterCheckout.find(
          (item) => item.id === 'shopping-onion',
        )

      assert.deepEqual(
        inventoryResult.inventoryItems
          .map((item) => [
            item.name,
            item.quantity,
          ])
          .sort(),
        [
          ['바나나', 6],
          ['우유', 2],
        ],
      )
      assert.equal(reminderItems.length, 3)
      assert.equal(
        reminderItems[0].reminderStatus,
        'pending',
      )
      assert.equal(
        partialItem?.remainingPurchaseQuantity,
        2,
      )
      assert.equal(
        partialItem?.purchaseStatus,
        'partial',
      )
      assert.equal(
        plannedItem?.purchaseStatus,
        'planned',
      )
      assert.equal(
        shouldShowShoppingReminder(
          reminderItems.length,
          true,
        ),
        false,
      )
      assert.equal(
        shouldShowShoppingReminder(
          getShoppingReminderItems(
            JSON.parse(
              JSON.stringify(
                shoppingAfterCheckout,
              ),
            ),
          ).length,
          false,
        ),
        true,
      )

      const restored = restoreShoppingReminderItems(
        shoppingAfterCheckout,
        ['shopping-apple', 'shopping-milk'],
        '2026-08-03T00:00:00.000Z',
      )
      assert.equal(restored.length, persisted.length)
      assert.equal(
        new Set(restored.map((item) => item.id)).size,
        restored.length,
      )
      assert.equal(
        restored.find(
          (item) => item.id === 'shopping-apple',
        )?.remainingPurchaseQuantity,
        3,
      )
      assert.equal(
        restored.find(
          (item) => item.id === 'shopping-milk',
        )?.remainingPurchaseQuantity,
        2,
      )
      assert.equal(
        restored.find(
          (item) => item.id === 'shopping-milk',
        )?.purchaseStatus,
        'planned',
      )

      const deleted = deleteShoppingItems(
        shoppingAfterCheckout,
        ['shopping-apple'],
      )
      assert.equal(deleted.length, persisted.length - 1)
      assert.equal(
        deleted.some(
          (item) => item.id === 'shopping-banana',
        ),
        true,
      )
    },
  )

  await check(
    'Shopping 마이그레이션: 구형 checked 값을 구매 상태로 안전하게 정규화',
    () => {
      const completed = normalizeShoppingItem({
        id: 'legacy-completed',
        name: '두부',
        quantity: 2,
        unit: '모',
        completed: true,
        source: 'manual',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      })
      const planned = normalizeShoppingItem({
        id: 'legacy-planned',
        name: '대파',
        completed: false,
        source: 'manual',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      })

      assert.equal(
        completed.purchaseStatus,
        'completed',
      )
      assert.equal(
        completed.purchasedTotalQuantity,
        2,
      )
      assert.equal(completed.purchaseMode, 'single')
      assert.equal(planned.purchaseStatus, 'planned')
      assert.equal(
        planned.purchasedTotalQuantity,
        0,
      )
      assert.equal(planned.reminderStatus, 'none')
      assert.equal(
        normalizeStoredShoppingItem({
          id: 'legacy-checked',
          name: '우유',
          checked: true,
          source: 'manual',
          createdAt:
            '2026-08-01T00:00:00.000Z',
          updatedAt:
            '2026-08-01T00:00:00.000Z',
        })?.purchaseStatus,
        'completed',
      )
    },
  )

  await check(
    'Shopping 냉장고 반영: 실제 구매량만 한 번 추가',
    () => {
      const inventory = [
        {
          id: 'inventory-banana',
          name: '바나나',
          quantity: 2,
          unit: '개',
          location: 'fridge',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ]
      const shopping = [
        {
          id: 'shopping-banana',
          name: '바나나',
          quantity: 6,
          unit: '개',
          completed: true,
          source: 'manual',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ]
      let nextId = 0
      const first = mergeCompletedShoppingIntoInventory(
        inventory,
        shopping,
        {
          createId: () => `id-${++nextId}`,
          createApplicationId: () =>
            `application-${++nextId}`,
          now: '2026-08-02T00:00:00.000Z',
        },
      )
      const second =
        mergeCompletedShoppingIntoInventory(
          first.inventoryItems,
          first.shoppingItems,
          {
            createId: () => `id-${++nextId}`,
            createApplicationId: () =>
              `application-${++nextId}`,
            now: '2026-08-03T00:00:00.000Z',
          },
        )

      assert.equal(
        first.inventoryItems[0].quantity,
        8,
      )
      assert.equal(
        first.shoppingItems[0]
          .inventoryAppliedQuantity,
        6,
      )
      assert.match(
        first.shoppingItems[0]
          .inventoryApplicationId,
        /^application-/,
      )
      assert.equal(
        second.inventoryItems[0].quantity,
        8,
      )
      assert.equal(
        second.appliedShoppingItemIds.length,
        0,
      )
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
    'Premium Recipe: 20개 레시피·이미지·30일 연결 무결성',
    () => {
      assert.equal(builtInRecipes.length, 20)
      assert.equal(
        Object.keys(recipeImages).length,
        20,
      )

      const issues = auditPremiumRecipes(
        builtInRecipes,
        DEFAULT_MONTHLY_RECIPE_IDS,
        Object.keys(recipeImages),
      )

      assert.deepEqual(issues, [])
    },
  )

  await check(
    'Premium Recipe: 4인분 기준 수량을 1~12인분으로 안전하게 조절',
    () => {
      assert.equal(scaleRecipeAmount(600, 4, 2), 300)
      assert.equal(scaleRecipeAmount(0.5, 4, 6), 0.75)
      assert.equal(formatRecipeAmount(0.25), '¼')
      assert.equal(formatRecipeAmount(1.5), '1½')
      assert.equal(
        formatRecipeAmount(0.63, '개'),
        '2/3',
      )
      assert.equal(formatRecipeAmount(1, '개'), '1')
      assert.equal(formatRecipeAmount(22.5, 'g'), '23')
      assert.equal(
        formatRecipeAmount(18.75, 'g'),
        '19',
      )
    },
  )

  await check(
    'Premium Recipe: 핵심 4개 메뉴 계량·물·익힘 기준 심화 점검',
    () => {
      const recipeById = new Map(
        builtInRecipes.map((recipe) => [
          recipe.id,
          recipe,
        ]),
      )
      const expectations = {
        'kimchi-stew': {
          ingredient: '배추김치',
          amount: 600,
          liquid: '멸치 다시마 육수',
          liquidAmount: 1000,
        },
        curry: {
          ingredient: '돼지고기 등심',
          amount: 300,
          liquid: '물',
          liquidAmount: 900,
        },
        'spicy-pork': {
          ingredient: '돼지고기 앞다리살',
          amount: 600,
        },
        'egg-fried-rice': {
          ingredient: '달걀',
          amount: 4,
        },
      }

      for (const [recipeId, expectation] of Object.entries(
        expectations,
      )) {
        const recipe = recipeById.get(recipeId)
        const ingredients = Object.values(
          recipe.ingredientGroups,
        ).flat()
        const mainIngredient = ingredients.find(
          (ingredient) =>
            ingredient.name ===
            expectation.ingredient,
        )

        assert.equal(recipe.servings, 4)
        assert.equal(recipe.steps.length, 8)
        assert.equal(
          mainIngredient?.amount,
          expectation.amount,
        )
        assert.equal(
          recipe.steps.every(
            (step) =>
              step.durationMinutes > 0 &&
              Boolean(step.heatLevel) &&
              Boolean(step.completionCue) &&
              step.ingredientRefs.length > 0,
          ),
          true,
        )

        if (expectation.liquid) {
          const liquid = ingredients.find(
            (ingredient) =>
              ingredient.name ===
              expectation.liquid,
          )

          assert.equal(
            liquid?.amount,
            expectation.liquidAmount,
          )
          assert.equal(liquid?.unit, 'ml')
        }
      }
    },
  )

  await check(
    'Premium Recipe: 구형 Recipe를 저장 변경 없이 읽기 정규화',
    () => {
      const legacyRecipe = {
        id: 'legacy-recipe',
        name: '예전 레시피',
        ingredients: [
          {
            id: 'legacy-onion',
            name: '양파',
            quantity: 1,
            unit: '개',
          },
        ],
        prepMinutes: 5,
        cookMinutes: 10,
        steps: [
          {
            order: 1,
            instruction: '양파를 익혀요.',
            minutes: 10,
          },
        ],
      }
      const before = JSON.stringify(legacyRecipe)
      const normalized = normalizeRecipe(legacyRecipe)

      assert.equal(
        normalized.ingredientGroups.mainIngredients[0]
          .amount,
        1,
      )
      assert.equal(
        normalized.steps[0].durationMinutes,
        10,
      )
      assert.equal(normalized.totalTimeMinutes, 15)
      assert.equal(JSON.stringify(legacyRecipe), before)
    },
  )

  await check(
    'Premium Recipe: 같은 ID의 구형 저장본보다 최신 기본본을 우선하고 커스텀은 보존',
    () => {
      const legacyStoredRecipe = {
        id: 'kimchi-stew',
        name: '김치찌개',
        ingredients: [
          {
            id: 'legacy-kimchi',
            name: '김치',
            quantity: 0.5,
            unit: '포기',
          },
        ],
        steps: [
          {
            order: 1,
            instruction: '간단히 끓여요.',
            minutes: 10,
          },
        ],
      }
      const customRecipe = {
        id: 'custom-family-soup',
        name: '우리집 국',
        ingredients: [
          {
            id: 'custom-radish',
            name: '무',
            quantity: 200,
            unit: 'g',
          },
        ],
      }
      const storedBefore = JSON.stringify([
        legacyStoredRecipe,
        customRecipe,
      ])
      const merged = mergeRecipeCatalog(
        builtInRecipes,
        [[legacyStoredRecipe, customRecipe]],
      )
      const kimchiStew = merged.find(
        (recipe) => recipe.id === 'kimchi-stew',
      )

      assert.equal(
        kimchiStew?.ingredientGroups.seasoningIngredients.some(
          (ingredient) =>
            ingredient.name === '국간장',
        ),
        true,
      )
      assert.equal(kimchiStew?.steps.length, 8)
      assert.equal(
        merged.some(
          (recipe) =>
            recipe.id === 'custom-family-soup',
        ),
        true,
      )
      assert.equal(
        JSON.stringify([
          legacyStoredRecipe,
          customRecipe,
        ]),
        storedBefore,
      )
    },
  )

  await check(
    'Navigation: 상세 URL과 history 상태를 복원하고 동일 화면 중복을 구분',
    () => {
      const listState = createNavigationState({
        page: 'recipes',
        index: 1,
      })
      const detailState = createNavigationState({
        page: 'recipes',
        recipeId: 'kimchi-stew',
        index: 2,
      })
      const restored = readNavigationState(
        detailState,
        '',
      )
      const direct = readNavigationState(
        null,
        '?page=recipes&recipe=curry',
      )

      assert.equal(restored.recipeId, 'kimchi-stew')
      assert.equal(direct.page, 'recipes')
      assert.equal(direct.recipeId, 'curry')
      assert.equal(
        createNavigationUrl(
          detailState,
          'https://example.com/',
        ),
        '/?page=recipes&recipe=kimchi-stew',
      )
      assert.equal(
        isSameNavigationTarget(
          listState,
          createNavigationState({
            ...listState,
            index: 99,
          }),
        ),
        true,
      )
      assert.equal(
        isSameNavigationTarget(
          listState,
          detailState,
        ),
        false,
      )
    },
  )

  await check(
    'Navigation: 하단 탭은 한 단계만 유지하고 상세 계층만 history에 남김',
    () => {
      const home = createNavigationState({
        page: 'today',
        index: 0,
      })
      const mealPlan = createNavigationState({
        page: 'mealPlan',
        index: 1,
      })
      const recipeDetail = createNavigationState({
        page: 'recipes',
        recipeId: 'kimchi-stew',
        index: 2,
      })

      assert.deepEqual(
        planTopLevelNavigation(
          home,
          'mealPlan',
        ),
        { kind: 'push' },
      )
      assert.deepEqual(
        planTopLevelNavigation(
          mealPlan,
          'shopping',
        ),
        { kind: 'replace' },
      )
      assert.deepEqual(
        planTopLevelNavigation(
          recipeDetail,
          'inventory',
        ),
        {
          kind: 'back-and-replace',
          delta: -1,
        },
      )
      assert.deepEqual(
        planTopLevelNavigation(
          mealPlan,
          'today',
        ),
        { kind: 'back', delta: -1 },
      )
    },
  )

  await check(
    'Navigation: 모달은 화면 index를 늘리지 않는 임시 history 한 건만 사용',
    () => {
      const detailState = createNavigationState({
        page: 'recipes',
        recipeId: 'kimchi-stew',
        index: 2,
      })
      const modalState =
        createTemporaryModalHistoryState(
          detailState,
          'recipe-meal-plan',
        )

      assert.equal(modalState.index, 2)
      assert.equal(
        isTemporaryModalHistoryState(
          modalState,
          'recipe-meal-plan',
        ),
        true,
      )
      assert.equal(
        isTemporaryModalHistoryState(
          detailState,
          'recipe-meal-plan',
        ),
        false,
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
      const rawRecommendations = [
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
      const recommendations = rawRecommendations.map(
        (recommendation) => ({
          ...recommendation,
          ...createTestAiDetails(
            recommendation.ingredients.map(
              (ingredient) =>
                ingredient.name.trim(),
            ),
            recommendation.estimatedMinutes,
          ),
          ingredients: recommendation.ingredients.map(
            (ingredient) => ({
              ...ingredient,
              group: 'main',
              note: null,
              optional: false,
              substitute: [],
            }),
          ),
        }),
      )
      assert.equal(
        parseAiRecipeRecommendationOutput({
          recommendations,
        })?.[0].steps.length,
        8,
      )
      const invalidReferenceRecommendations =
        structuredClone(recommendations)
      invalidReferenceRecommendations[0].steps[0]
        .ingredientRefs = ['없는 재료']
      assert.equal(
        parseAiRecipeRecommendationOutput({
          recommendations:
            invalidReferenceRecommendations,
        }),
        null,
      )
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
          group: 'main',
          note: null,
          optional: false,
          substitute: [],
        },
        {
          name: '두부',
          quantity: 1,
          unit: '모',
          available: true,
          group: 'main',
          note: null,
          optional: false,
          substitute: [],
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
              description:
                `가정식 메뉴 ${index + 1}을(를) 위한 상세 조리법`,
              difficulty: '쉬움',
              calories: null,
              servings: 4,
              prepMinutes: 10,
              cookMinutes: 25,
              ingredients: [
                {
                  name: '계란',
                  quantity: 2,
                  unit: '개',
                  group: 'main',
                  note: null,
                  optional: false,
                  substitute: [],
                },
                {
                  name: `채소 ${index + 1}`,
                  quantity: 1,
                  unit: '개',
                  group: 'main',
                  note: null,
                  optional: false,
                  substitute: ['버섯 100g'],
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
                { length: 8 },
                (_, stepIndex) => ({
                  order: stepIndex + 1,
                  title: `${stepIndex + 1}단계`,
                  instruction: `${stepIndex + 1}단계 조리`,
                  durationMinutes: 5,
                  heatLevel:
                    stepIndex < 2
                      ? '불 사용 안 함'
                      : '중불',
                  completionCue:
                    '속까지 충분히 익어요.',
                  reason: null,
                  warning: null,
                  ingredientRefs: ['계란'],
                }),
              ),
              seasoningAdjustment: [
                '완성 직전 간을 조금씩 맞춰요.',
              ],
              commonMistakes: [
                '재료를 센 불에 태우지 않아요.',
              ],
              storage:
                '완전히 식혀 냉장 보관해요.',
              reheating:
                '중심까지 충분히 데워요.',
              leftoverIdeas: [
                '남은 음식은 볶음밥으로 활용해요.',
              ],
              servingSuggestions: [
                '제철 반찬과 곁들여요.',
              ],
            },
          }),
        ),
      }
      const parsed = parseAiMealPlanTrialOutput(
        output,
        validation.data,
      )
      const unlistedReferenceOutput =
        structuredClone(output)
      unlistedReferenceOutput.days[0].recipe.steps[0]
        .ingredientRefs = ['없는 재료']
      const shortStepsOutput = structuredClone(output)
      shortStepsOutput.days[0].recipe.steps =
        shortStepsOutput.days[0].recipe.steps.slice(
          0,
          7,
        )
      const invalidQuantityOutput =
        structuredClone(output)
      invalidQuantityOutput.days[0].recipe.ingredients[0]
        .quantity = 0
      const invalidWaterUnitOutput =
        structuredClone(output)
      invalidWaterUnitOutput.days[0].recipe.ingredients[0]
        .name = '물'
      invalidWaterUnitOutput.days[0].recipe.ingredients[0]
        .unit = 'L'
      invalidWaterUnitOutput.days[0].recipe.steps.forEach(
        (step) => {
          step.ingredientRefs = ['물']
        },
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
        parseAiMealPlanTrialOutput(
          unlistedReferenceOutput,
          validation.data,
        ),
        null,
      )
      assert.equal(
        parseAiMealPlanTrialOutput(
          shortStepsOutput,
          validation.data,
        ),
        null,
      )
      assert.equal(
        parseAiMealPlanTrialOutput(
          invalidQuantityOutput,
          validation.data,
        ),
        null,
      )
      assert.equal(
        parseAiMealPlanTrialOutput(
          invalidWaterUnitOutput,
          validation.data,
        ),
        null,
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
    'AI 7일 체험: timeout·검증 실패는 체험 미차감이며 재시도 가능',
    () => {
      const timeout =
        getAiMealPlanTrialFailureState(
          'AI_TRIAL_TIMEOUT',
        )
      const invalid =
        getAiMealPlanTrialFailureState(
          'AI_RESPONSE_INVALID',
        )

      assert.equal(timeout.trialConsumed, false)
      assert.equal(timeout.canRetry, true)
      assert.match(timeout.title, /시간/)
      assert.equal(invalid.trialConsumed, false)
      assert.equal(invalid.canRetry, true)
      assert.match(invalid.title, /안전/)
    },
  )

  await check(
    'AI 7일 체험: 생성 중 중복 요청을 하나의 호출로 제한',
    async () => {
      const originalFetch = globalThis.fetch
      const originalWindow = globalThis.window
      let fetchCount = 0
      let resolveFetch

      globalThis.window = globalThis
      globalThis.fetch = () => {
        fetchCount += 1

        return new Promise((resolve) => {
          resolveFetch = resolve
        })
      }

      try {
        const request = {
          startDate: '2026-08-01',
          householdSize: 4,
          includesChildren: false,
          spicePreference: 'mild',
          weekdayMaxMinutes: 40,
          inventoryItems: [],
        }
        const first = requestAiMealPlanTrial(request)
        const second = requestAiMealPlanTrial(request)

        assert.equal(first, second)
        assert.equal(fetchCount, 1)

        resolveFetch(
          new Response(
            JSON.stringify({
              code: 'AI_SERVICE_ERROR',
              message:
                'AI 서비스 연결이 원활하지 않아요.',
            }),
            {
              status: 503,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          ),
        )

        await assert.rejects(first)
      } finally {
        globalThis.fetch = originalFetch

        if (originalWindow === undefined) {
          delete globalThis.window
        } else {
          globalThis.window = originalWindow
        }
      }
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
      assert.equal(body.days.length, 7)
      assert.equal(body.recipes, undefined)
      assert.equal(body.meta.model, 'mock')
    },
  )

  await check(
    'AI 7일 체험 Phase 1: 초안만 7일 저장하고 체험은 미차감',
    () => {
      const request = {
        startDate: '2026-08-03',
        householdSize: 4,
        includesChildren: false,
        spicePreference: 'mild',
        weekdayMaxMinutes: 40,
        inventoryItems: [],
      }
      const draft = parseAiMealPlanDraftOutput(
        {
          days: Array.from(
            { length: 7 },
            (_, index) => ({
              day: index + 1,
              name: `맞춤 메뉴 ${index + 1}`,
              summary: '가족 저녁 메뉴예요.',
              recommendationReason:
                '가족 조건을 반영했어요.',
              servings: 4,
              prepMinutes: 10,
              cookMinutes: 25,
              mainIngredientNames: [
                `주재료 ${index + 1}`,
              ],
              missingIngredientNames: [
                `부족 재료 ${index + 1}`,
              ],
              constraintCompliance:
                '제외 조건을 모두 지켰어요.',
            }),
          ),
        },
        request,
        '2026-08-03T00:00:00.000Z',
      )

      assert.equal(draft?.plans.length, 7)
      assert.equal(draft?.days.length, 7)
      assert.equal(
        draft?.days[0].recipeId,
        'ai-trial-2026-08-03-1',
      )

      const stored = parseStoredAiMealPlanTrial({
        formatVersion: '2',
        status: 'draft',
        draftCreatedAt:
          '2026-08-03T00:00:00.000Z',
        request,
        response: {
          ...draft,
          recipes: [],
          recipeSources: {},
          recipeMeta: {},
          weeklyShoppingIngredients: [],
        },
      })

      assert.equal(stored?.status, 'draft')
      assert.equal(stored?.usedAt, undefined)
      assert.equal(stored?.response.recipes.length, 0)
    },
  )

  await check(
    'AI 7일 체험 Phase 2: 첫 상세 저장 후에만 사용 완료·정확 장보기 계산',
    async () => {
      const trialRequest = {
        startDate: '2026-08-03',
        householdSize: 4,
        includesChildren: false,
        spicePreference: 'mild',
        weekdayMaxMinutes: 40,
        inventoryItems: [],
      }
      const draft = parseAiMealPlanDraftOutput(
        {
          days: Array.from(
            { length: 7 },
            (_, index) => ({
              day: index + 1,
              name: `저녁 메뉴 ${index + 1}`,
              summary: '가족 저녁 메뉴예요.',
              recommendationReason:
                '냉장고 조건을 반영했어요.',
              servings: 4,
              prepMinutes: 10,
              cookMinutes: 25,
              mainIngredientNames: [
                `주재료 ${index + 1}`,
              ],
              missingIngredientNames: [
                `부족 재료 ${index + 1}`,
              ],
              constraintCompliance:
                '제외 조건을 모두 지켰어요.',
            }),
          ),
        },
        trialRequest,
        '2026-08-03T00:00:00.000Z',
      )
      const storedDraft =
        parseStoredAiMealPlanTrial({
          formatVersion: '2',
          status: 'draft',
          draftCreatedAt:
            '2026-08-03T00:00:00.000Z',
          request: trialRequest,
          response: {
            ...draft,
            recipes: [],
            recipeSources: {},
            recipeMeta: {},
            weeklyShoppingIngredients: [],
          },
        })
      const detailRequest = {
        day: storedDraft.response.days[0],
        householdSize: 4,
        includesChildren: false,
        spicePreference: 'mild',
      }

      assert.equal(
        validateAiMealPlanRecipeDetailRequest(
          detailRequest,
        ).ok,
        true,
      )

      const response =
        await handleAiMealPlanRecipeDetail(
          new Request(
            'http://localhost/api/ai/meal-plan-recipe-detail',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify(detailRequest),
            },
          ),
          {
            NODE_ENV: 'development',
            HOMEOS_AI_MOCK: 'true',
          },
        )
      const detailBody = await response.json()
      const completed =
        addRecipeToStoredAiMealPlanTrial(
          storedDraft,
          detailBody.recipe,
          'ai',
          detailBody.meta,
          '2026-08-03T00:01:00.000Z',
        )

      assert.equal(response.status, 200)
      assert.equal(
        detailBody.recipe.steps.length,
        8,
      )
      assert.equal(completed?.status, 'completed')
      assert.equal(
        completed?.usedAt,
        '2026-08-03T00:01:00.000Z',
      )
      assert.equal(
        completed?.response.recipes.length,
        1,
      )
      assert.ok(
        completed.response
          .weeklyShoppingIngredients.length > 0,
      )
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

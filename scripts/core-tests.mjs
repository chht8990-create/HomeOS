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
    'Release 1.0.2: package와 앱 표시 버전 동기화',
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
      const appConfig = readFileSync(
        'src/config/app.ts',
        'utf8',
      )

      assert.equal(packageJson.version, '1.0.2')
      assert.equal(packageLock.version, '1.0.2')
      assert.equal(
        packageLock.packages[''].version,
        '1.0.2',
      )
      assert.match(
        appConfig,
        /APP_VERSION = '1\.0\.2'/,
      )
      assert.match(settingsPage, /APP_VERSION/)
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
    'PWA 캐시: v1.0.2 앱 셸·업데이트·API 제외 정책',
    () => {
      const serviceWorker = readFileSync(
        'public/sw.js',
        'utf8',
      )

      assert.match(
        serviceWorker,
        /RELEASE_VERSION = '1\.0\.2'/,
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
  const { calculateMissingIngredients } =
    await vite.ssrLoadModule(
      '/src/services/inventoryEngine.ts',
    )
  const { groupShoppingItemsByCategory } =
    await vite.ssrLoadModule(
      '/src/services/shoppingCategoryEngine.ts',
    )
  const {
    calculateShoppingPurchase,
    createShoppingReminderPreview,
    deleteShoppingItems,
    getShoppingReminderItems,
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
  const {
    recipeImages,
    resolveRecipeImage,
  } = await vite.ssrLoadModule(
    '/src/data/recipeImages.ts',
  )
  const { normalizeAiMenuName } =
    await vite.ssrLoadModule(
      '/src/services/aiMenuNameEngine.ts',
    )
  const {
    createIngredientUnitPresentation,
    normalizeAiIngredientUnit,
  } =
    await vite.ssrLoadModule(
      '/src/services/ingredientUnitEngine.ts',
    )
  const {
    replaceMealShoppingSourceItems,
    replaceMealPlanRangeShoppingItems,
  } = await vite.ssrLoadModule(
    '/src/services/shoppingEngine.ts',
  )
  const {
    updateRecipeDetailGenerationState,
  } = await vite.ssrLoadModule(
    '/src/hooks/useAiMealPlanTrial.ts',
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
    createPwaExitGuardState,
    createNavigationState,
    createNavigationUrl,
    isPwaExitGuardState,
    isSameNavigationTarget,
    isTopLevelNavigationState,
    planTopLevelNavigation,
    readNavigationState,
    shouldUsePwaBackExit,
  } = await vite.ssrLoadModule(
    '/src/services/appNavigationEngine.ts',
  )
  const {
    createAiMealPlanPipelineError,
    mapAiMealPlanPipelineErrorCode,
  } = await vite.ssrLoadModule(
    '/src/services/aiMealPlanPipelineEngine.ts',
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
    normalizePositiveIntegerDraft,
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
    classifyAiMealCookingType,
    completeStoredAiMealPlanTrial,
    getAiMealPlanTrialFailureState,
    getRecentMealPlanMenuNames,
    parseAiMealPlanDraftOutput,
    parseAiMealPlanDraftOutputResult,
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
  const {
    FEEDBACK_MESSAGE_MAX_LENGTH,
    escapeFeedbackText,
    validateFeedbackPayload,
  } = await vite.ssrLoadModule(
    '/src/services/feedbackEngine.ts',
  )
  const { handleFeedback } =
    await vite.ssrLoadModule('/api/feedback.ts')

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
  const aiTestMenuNames = [
    '김치찌개',
    '고등어구이',
    '소고기미역국',
    '닭갈비',
    '계란볶음밥',
    '카레',
    '두부조림',
  ]
  const inventoryItem = {
    id: 'inventory-kimchi',
    name: '김치',
    quantity: 1,
    unit: '포기',
    location: 'fridge',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  function createTestFeedbackPayload(
    overrides = {},
  ) {
    return {
      category: 'issue',
      message: '장보기 화면을 확인해 주세요.',
      diagnostics: {
        appVersion: '1.0.2',
        currentPage: 'feedback',
        createdAt: '2026-07-30T00:00:00.000Z',
        userAgent: 'Core Test Browser',
        viewport: {
          width: 390,
          height: 844,
        },
        displayMode: 'standalone',
        online: true,
        language: 'ko-KR',
      },
      ...overrides,
    }
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
  const appCssSource = readFileSync(
    new URL('../src/App.css', import.meta.url),
    'utf8',
  )
  const recipeCssSource = readFileSync(
    new URL(
      '../src/pages/RecipePage.css',
      import.meta.url,
    ),
    'utf8',
  )
  const positiveIntegerInputSource = readFileSync(
    new URL(
      '../src/components/ui/PositiveIntegerInput.tsx',
      import.meta.url,
    ),
    'utf8',
  )
  const sectionSource = readFileSync(
    new URL(
      '../src/components/ui/Section.tsx',
      import.meta.url,
    ),
    'utf8',
  )
  const mealPlanPageSource = readFileSync(
    new URL(
      '../src/pages/MealPlanPage.tsx',
      import.meta.url,
    ),
    'utf8',
  )
  const shoppingPageSource = readFileSync(
    new URL(
      '../src/pages/ShoppingPage.tsx',
      import.meta.url,
    ),
    'utf8',
  )
  const homePageSource = readFileSync(
    new URL(
      '../src/pages/HomePage.tsx',
      import.meta.url,
    ),
    'utf8',
  )
  const inventoryPageSource = readFileSync(
    new URL(
      '../src/pages/InventoryPage.tsx',
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
    'Tutorial·Guide: 짧은 문구와 사용 순서 연결',
    () => {
      assert.match(
        tutorialSource,
        /사용 순서 자세히 보기/,
      )
      assert.match(
        tutorialSource,
        /onOpenGuide\(doNotShowAgain\)/,
      )
      assert.equal(
        tutorialPages[2].description,
        '필요한 재료를 장보기 목록으로 모아드려요.',
      )
      const tutorialPagesSource = readFileSync(
        new URL(
          '../src/data/tutorialPages.ts',
          import.meta.url,
        ),
        'utf8',
      )
      assert.match(
        tutorialPagesSource,
        /Refrigerator/,
      )
      assert.doesNotMatch(
        tutorialPagesSource,
        /PackageOpen/,
      )
    },
  )

  await check(
    'Input UI: 편집 중 빈 값과 전체 선택을 허용하고 blur에서 확정',
    () => {
      assert.match(
        positiveIntegerInputSource,
        /draftValue/,
      )
      assert.match(
        positiveIntegerInputSource,
        /input\.select\(\)/,
      )
      assert.match(
        positiveIntegerInputSource,
        /nextDraftValue !== ''/,
      )
      assert.match(
        positiveIntegerInputSource,
        /onBlur=\{handleBlur\}/,
      )
    },
  )

  await check(
    'Disclosure UI: 화면 상태만 접고 history를 만들지 않음',
    () => {
      assert.match(
        sectionSource,
        /aria-expanded=\{!collapsed\}/,
      )
      assert.match(
        sectionSource,
        /hidden=\{collapsible && collapsed\}/,
      )
      assert.match(
        mealPlanPageSource,
        /today-table\.planner\.sections\.v1/,
      )
      assert.match(
        recipePageSource,
        /hidden=\{!ingredientsExpanded\}/,
      )
      assert.doesNotMatch(
        sectionSource,
        /history\.(pushState|replaceState)/,
      )
      assert.match(sectionSource, /collapsed \? '보기' : '접기'/)
      assert.match(
        recipePageSource,
        /stepsExpanded\s*\?\s*'접기'\s*:\s*'조리 순서 보기'/,
      )
      assert.match(
        recipePageSource,
        /hidden=\{!stepsExpanded\}/,
      )
    },
  )

  await check(
    'Planner 저장 안내: 카드 강조와 안내를 2.8초에 함께 종료',
    () => {
      assert.match(
        mealPlanPageSource,
        /setSavedMealFeedback\(null\)[\s\S]*setHighlightedMealPlanId\(null\)/,
      )
      assert.match(
        mealPlanPageSource,
        /\}, 2800\)/,
      )
      assert.match(
        mealPlanPageSource,
        /onChange=\{\(event\) => \{\s*clearSavedMealConfirmation\(\)/,
      )
    },
  )

  await check(
    'UX Writing: 장보기 문맥을 재료로 통일',
    () => {
      assert.match(
        shoppingPageSource,
        /못 산 재료/,
      )
      assert.match(
        shoppingPageSource,
        /구매할 재료/,
      )
      assert.doesNotMatch(
        shoppingPageSource,
        /필요한 품목/,
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
        normalizePositiveIntegerDraft('', options),
        '',
      )
      assert.equal(
        normalizePositiveIntegerDraft('06', options),
        '6',
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
      assert.match(
        inventoryPageSource,
        /이 재료로 만들 메뉴 찾기/,
      )
      assert.match(
        inventoryPageSource,
        /저장된 레시피에서 찾기/,
      )
      assert.match(
        inventoryPageSource,
        /onOpenRecommendations/,
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

      const juiceSuggestions =
        createMeasurementSuggestions(
          {
            name: '배즙',
            amount: 120,
            unit: 'ml',
          },
          ['paper-cup'],
        )

      assert.equal(juiceSuggestions.length, 1)
      assert.equal(
        juiceSuggestions[0].measurement,
        '약 반 컵',
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
    'Measurement: 선택한 도구 조합이 실제 추천 계량값을 결정',
    () => {
      const suggestionText = (
        name,
        amount,
        unit,
        tools,
      ) =>
        createMeasurementSuggestions(
          { name, amount, unit },
          tools,
        ).map(
          (suggestion) =>
            `${suggestion.toolLabel}:${suggestion.measurement}`,
        )

      assert.deepEqual(
        suggestionText(
          '간장',
          30,
          'ml',
          ['rice-spoon'],
        ),
        ['밥숟가락:약 2.5스푼'],
      )
      assert.deepEqual(
        suggestionText(
          '물',
          200,
          'ml',
          ['paper-cup'],
        ),
        ['종이컵:1컵'],
      )
      assert.deepEqual(
        suggestionText(
          '다진 마늘',
          10,
          'ml',
          ['measuring-spoon'],
        ),
        ['계량스푼:2작은술'],
      )
      assert.deepEqual(
        suggestionText(
          '돼지고기',
          400,
          'g',
          ['scale'],
        ),
        ['전자저울:400g'],
      )
      assert.deepEqual(
        suggestionText(
          '육수',
          1000,
          'ml',
          [
            'measuring-cup',
            'measuring-spoon',
          ],
        ),
        ['계량컵:5컵 (200ml 기준)'],
      )
      assert.deepEqual(
        suggestionText(
          '양파',
          1,
          '개',
          ['scale'],
        ),
        [],
      )
      assert.deepEqual(
        suggestionText(
          '소금',
          1,
          '한 꼬집',
          ['measuring-spoon'],
        ),
        [],
      )
      assert.deepEqual(
        suggestionText(
          '물',
          200,
          'ml',
          [],
        ),
        [],
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
    'Inventory 비교: 명시된 생활 단위 환산만 적용하고 다른 단위는 안전하게 분리',
    () => {
      const ingredients = [
        {
          id: 'onion',
          name: '양파',
          quantity: 300,
          unit: 'g',
        },
        {
          id: 'pork',
          name: '돼지고기',
          quantity: 400,
          unit: 'g',
        },
      ]
      const missing = calculateMissingIngredients(
        ingredients,
        [
          {
            id: 'inventory-onion',
            name: '양파',
            quantity: 1,
            unit: '개',
            location: 'fridge',
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
          },
          {
            id: 'inventory-pork',
            name: '돼지고기',
            quantity: 1,
            unit: '팩',
            location: 'fridge',
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
          },
        ],
      )

      assert.deepEqual(
        missing.map((ingredient) => [
          ingredient.name,
          ingredient.quantity,
          ingredient.unit,
        ]),
        [
          ['양파', 150, 'g'],
          ['돼지고기', 400, 'g'],
        ],
      )
    },
  )

  await check(
    'Recommendation 정합성: 저장 레시피만 수량·단위로 비교하고 API 표현 제거',
    () => {
      const comparisonRecipes = [
        {
          id: 'kimchi-stew-example',
          name: '김치찌개',
          ingredients: [
            {
              id: 'kimchi',
              name: '김치',
              quantity: 1,
              unit: '포기',
            },
            {
              id: 'tofu',
              name: '두부',
              quantity: 1,
              unit: '모',
            },
          ],
        },
        {
          id: 'braised-tofu-example',
          name: '두부조림',
          ingredients: [
            {
              id: 'tofu-2',
              name: '두부',
              quantity: 1,
              unit: '모',
            },
            {
              id: 'soy-sauce',
              name: '간장',
              quantity: 2,
              unit: '큰술',
            },
          ],
        },
        {
          id: 'egg-rice-example',
          name: '계란볶음밥',
          ingredients: [
            {
              id: 'egg',
              name: '계란',
              quantity: 2,
              unit: '개',
            },
            {
              id: 'rice',
              name: '밥',
              quantity: 2,
              unit: '공기',
            },
          ],
        },
      ]
      const comparisonInventory = [
        {
          id: 'inventory-kimchi-example',
          name: '김치',
          quantity: 1,
          unit: '포기',
        },
        {
          id: 'inventory-tofu-example',
          name: '두부',
          quantity: 1,
          unit: '모',
        },
        {
          id: 'inventory-egg-example',
          name: '계란',
          quantity: 1,
          unit: '개',
        },
      ]
      const results = recommendRecipes(
        comparisonRecipes,
        comparisonInventory,
      )

      assert.deepEqual(
        results.map((result) => ({
          name: result.recipe.name,
          missing: result.missingIngredientCount,
        })),
        [
          { name: '김치찌개', missing: 0 },
          { name: '두부조림', missing: 1 },
          { name: '계란볶음밥', missing: 2 },
        ],
      )
      assert.deepEqual(recommendRecipes([], []), [])
      assert.equal(
        recommendRecipes(
          [comparisonRecipes[1]],
          [
            {
              id: 'legacy-tofu-grams',
              name: '두부',
              quantity: 300,
              unit: 'g',
            },
          ],
        )[0].missingIngredientCount,
        1,
      )

      const blockSource = readFileSync(
        'src/blocks/RecipeRecommendationBlock.tsx',
        'utf8',
      )
      const recipeHookSource = readFileSync(
        'src/hooks/useRecipes.ts',
        'utf8',
      )

      assert.match(
        blockSource,
        /저장된 레시피에서 찾기/,
      )
      assert.match(
        blockSource,
        /이 기능은 API를 호출하지 않고/,
      )
      const recipePageSource = readFileSync(
        'src/pages/RecipePage.tsx',
        'utf8',
      )
      assert.match(
        recipePageSource,
        /추가 재료가 적은 순으로 보여드릴게요/,
      )
      assert.match(
        recipePageSource,
        /showInventoryRecommendations/,
      )
      assert.doesNotMatch(
        blockSource,
        /냉장고 기반 추천|지금 있는 재료로 메뉴를 골라드려요/,
      )
      assert.match(
        recipeHookSource,
        /mergeRecipeCatalog\([\s\S]*builtInRecipes[\s\S]*importedRecipes[\s\S]*aiMealPlanTrialRecipes/,
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
    'Feedback 검증: 유형·길이·선택 연락처 규칙',
    () => {
      const valid = validateFeedbackPayload(
        createTestFeedbackPayload(),
      )
      const withoutCategory =
        validateFeedbackPayload(
          createTestFeedbackPayload({
            category: '',
          }),
        )
      const tooShort = validateFeedbackPayload(
        createTestFeedbackPayload({
          message: '짧음',
        }),
      )
      const maximumLength =
        validateFeedbackPayload(
          createTestFeedbackPayload({
            category: 'positive',
            message: '가'.repeat(
              FEEDBACK_MESSAGE_MAX_LENGTH,
            ),
          }),
        )
      const tooLong = validateFeedbackPayload(
        createTestFeedbackPayload({
          message: '가'.repeat(
            FEEDBACK_MESSAGE_MAX_LENGTH + 1,
          ),
        }),
      )

      assert.equal(valid.ok, true)
      assert.equal(
        valid.ok ? valid.data.contact : null,
        undefined,
      )
      assert.equal(withoutCategory.ok, false)
      assert.equal(tooShort.ok, false)
      assert.equal(maximumLength.ok, true)
      assert.equal(tooLong.ok, false)
    },
  )

  await check(
    'Feedback 개인정보: 허용하지 않은 저장 데이터 필드를 거부',
    () => {
      const withInventory =
        validateFeedbackPayload(
          createTestFeedbackPayload({
            inventoryItems: [
              { name: '양파', quantity: 2 },
            ],
          }),
        )
      const withLocalStorage =
        validateFeedbackPayload(
          createTestFeedbackPayload({
            localStorage: {
              shopping: ['대파'],
            },
          }),
        )
      const clientSource = readFileSync(
        'src/services/feedbackClient.ts',
        'utf8',
      )

      assert.equal(withInventory.ok, false)
      assert.equal(withLocalStorage.ok, false)
      assert.doesNotMatch(
        clientSource,
        /localStorage|inventoryItems|mealPlans|shoppingItems/,
      )
      assert.match(clientSource, /appVersion/)
      assert.match(clientSource, /userAgent/)
      assert.match(clientSource, /displayMode/)
    },
  )

  await check(
    'Feedback 보안: HTML·script 문자를 안전하게 escape',
    () => {
      assert.equal(
        escapeFeedbackText(
          '<script>alert("x")</script>',
        ),
        '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
      )
    },
  )

  await check(
    'Feedback API: JSON 검증·성공·연속 중복 방지',
    async () => {
      let deliveryCount = 0
      const payload = createTestFeedbackPayload({
        message:
          '<script>화면이 불편합니다.</script>',
      })
      const headers = {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.0.2.10',
        'user-agent': 'feedback-core-test',
      }
      const delivery = async (feedback) => {
        deliveryCount += 1
        assert.equal(
          feedback.message,
          payload.message,
        )
      }
      const first = await handleFeedback(
        new Request(
          'https://example.com/api/feedback',
          {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          },
        ),
        {},
        delivery,
      )
      const duplicate = await handleFeedback(
        new Request(
          'https://example.com/api/feedback',
          {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          },
        ),
        {},
        delivery,
      )
      const duplicateBody =
        await duplicate.json()
      const unsupported = await handleFeedback(
        new Request(
          'https://example.com/api/feedback',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
              'x-forwarded-for': '192.0.2.11',
            },
            body: 'text',
          },
        ),
        {},
        delivery,
      )

      assert.equal(first.status, 200)
      assert.equal(duplicate.status, 200)
      assert.equal(duplicateBody.duplicate, true)
      assert.equal(deliveryCount, 1)
      assert.equal(unsupported.status, 415)
    },
  )

  await check(
    'Feedback API: 수신 설정 없음·rate limit을 안전하게 처리',
    async () => {
      const notConfigured =
        await handleFeedback(
          new Request(
            'https://example.com/api/feedback',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                'x-forwarded-for':
                  '192.0.2.20',
                'user-agent':
                  'feedback-not-configured',
              },
              body: JSON.stringify(
                createTestFeedbackPayload(),
              ),
            },
          ),
          {},
        )

      assert.equal(notConfigured.status, 503)

      const statuses = []

      for (let index = 0; index < 6; index += 1) {
        const response = await handleFeedback(
          new Request(
            'https://example.com/api/feedback',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                'x-forwarded-for':
                  '192.0.2.30',
                'user-agent':
                  'feedback-rate-test',
              },
              body: JSON.stringify(
                createTestFeedbackPayload({
                  message: `서로 다른 테스트 의견 ${index}`,
                }),
              ),
            },
          ),
          {},
          async () => undefined,
        )
        statuses.push(response.status)
      }

      assert.deepEqual(statuses.slice(0, 5), [
        200,
        200,
        200,
        200,
        200,
      ])
      assert.equal(statuses[5], 429)
    },
  )

  await check(
    'Feedback UI: 전송 상태·성공 초기화·실패 내용 유지 구조',
    () => {
      const feedbackPage = readFileSync(
        'src/pages/FeedbackPage.tsx',
        'utf8',
      )

      assert.match(feedbackPage, /maxLength=\{\s*FEEDBACK_MESSAGE_MAX_LENGTH/)
      assert.match(feedbackPage, /보내는 중…/)
      assert.match(
        feedbackPage,
        /setCategory\(''\)[\s\S]*setMessage\(''\)[\s\S]*setContact\(''\)/,
      )
      assert.match(
        feedbackPage,
        /catch \{[\s\S]*setSubmissionState\('error'\)/,
      )
      assert.doesNotMatch(
        feedbackPage,
        /catch \{[\s\S]*setMessage\(''\)/,
      )
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
    'Shopping 구매: 못 산 재료를 보존하고 다음 목록으로 복원',
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
    'Shopping 리마인드: 명시적으로 못 산 재료만 재진입 시 표시',
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
        inventoryResult.shoppingItems
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
      assert.equal(reminderItems.length, 1)
      assert.equal(reminderItems[0].name, '사과')
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
        partialItem?.reminderStatus,
        'none',
      )
      assert.equal(
        plannedItem?.purchaseStatus,
        'planned',
      )
      assert.equal(
        plannedItem?.reminderStatus,
        'none',
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
        ['shopping-apple'],
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
        'partial',
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
    'Shopping 리마인드: 4개 이상은 3개와 나머지 개수로 축약',
    () => {
      const reminders = [
        '대파',
        '양파',
        '두부',
        '달걀',
        '우유',
      ]
      const compact = createShoppingReminderPreview(
        reminders,
        false,
      )
      const expanded = createShoppingReminderPreview(
        reminders,
        true,
      )
      const short = createShoppingReminderPreview(
        reminders.slice(0, 3),
        false,
      )

      assert.deepEqual(compact.visibleItems, [
        '대파',
        '양파',
        '두부',
      ])
      assert.equal(compact.hiddenCount, 2)
      assert.equal(compact.canToggle, true)
      assert.equal(compact.isExpanded, false)
      assert.deepEqual(expanded.visibleItems, reminders)
      assert.equal(expanded.hiddenCount, 0)
      assert.equal(expanded.isExpanded, true)
      assert.equal(short.canToggle, false)
      assert.equal(short.visibleItems.length, 3)
    },
  )

  await check(
    'Design QA: 냉장고 반영은 일반 구매 예정 재료를 리마인드로 바꾸지 않음',
    () => {
      const shoppingPage = readFileSync(
        'src/pages/ShoppingPage.tsx',
        'utf8',
      )

      assert.doesNotMatch(
        shoppingPage,
        /markItemIdsForReminder\s*\(/,
      )
      assert.match(
        shoppingPage,
        /createShoppingReminderPreview/,
      )
      assert.match(shoppingPage, /모두 보기/)
      assert.match(shoppingPage, /외 \{/)
    },
  )

  await check(
    'Design QA: 장보기·냉장고 사용자 문구는 재료로 통일',
    () => {
      const shoppingPage = readFileSync(
        'src/pages/ShoppingPage.tsx',
        'utf8',
      )
      const inventoryPage = readFileSync(
        'src/pages/InventoryPage.tsx',
        'utf8',
      )

      assert.doesNotMatch(shoppingPage, /품목/)
      assert.doesNotMatch(inventoryPage, /품목/)
      assert.match(
        shoppingPage,
        /구매한 재료를 냉장고에 넣기/,
      )
    },
  )

  await check(
    'Planner 저장 안내: 카드 강조와 문구를 2.8초에 함께 종료',
    () => {
      const mealPlanPage = readFileSync(
        'src/pages/MealPlanPage.tsx',
        'utf8',
      )

      assert.match(
        mealPlanPage,
        /setSavedMealFeedback\(null\)[\s\S]*setHighlightedMealPlanId\(null\)[\s\S]*2?800/,
      )
      assert.match(
        mealPlanPage,
        /clearSavedMealConfirmation\(\)[\s\S]*setMealName\(event\.target\.value\)/,
      )
    },
  )

  await check(
    'AI 실패 안내: 무료 체험 미사용 문구를 한 번만 표시',
    () => {
      const mealPlanPage = readFileSync(
        'src/pages/MealPlanPage.tsx',
        'utf8',
      )
      const failureDialogSource =
        mealPlanPage.slice(
          mealPlanPage.indexOf(
            'className="ai-trial-failure-dialog"',
          ),
          mealPlanPage.indexOf(
            '{feedback ?',
          ),
        )

      assert.doesNotMatch(
        failureDialogSource,
        /ai-trial-failure-note/,
      )
      assert.doesNotMatch(
        failureDialogSource,
        /무료 체험/,
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
    'AI 식단 체크박스: 실제 input·시각 박스·체크 아이콘을 하나씩만 렌더링',
    () => {
      const checkboxSource = mealPlanPageSource.slice(
        mealPlanPageSource.indexOf(
          'className="ai-trial-checkbox"',
        ),
        mealPlanPageSource.indexOf(
          '{includesChildren ?',
        ),
      )
      const checkboxCss = appCssSource.slice(
        appCssSource.indexOf('.ai-trial-checkbox {'),
        appCssSource.indexOf(
          '.ai-trial-form .meal-editor__actions',
        ),
      )

      assert.equal(
        checkboxSource.match(/type="checkbox"/g)
          ?.length,
        1,
      )
      assert.equal(
        checkboxSource.match(
          /ai-trial-checkbox__visual/g,
        )?.length,
        1,
      )
      assert.equal(
        checkboxSource.match(/<Check\b/g)?.length,
        1,
      )
      assert.match(checkboxCss, /appearance:\s*none/)
      assert.match(
        checkboxCss,
        /-webkit-appearance:\s*none/,
      )
      assert.doesNotMatch(
        checkboxCss,
        /accent-color/,
      )
      assert.match(checkboxCss, /min-height:\s*44px/)
      assert.match(
        checkboxCss,
        /input\[type='checkbox'\]:focus-visible/,
      )
      assert.match(
        checkboxCss,
        /input\[type='checkbox'\]:checked[\s\S]*svg/,
      )
    },
  )

  await check(
    'AI 메뉴명: 문장형 이름 보정·차단과 표준 음식명 허용',
    () => {
      assert.equal(
        normalizeAiMenuName(
          '간장 돼지불고기와 밥',
        ),
        '간장불고기',
      )
      assert.equal(
        normalizeAiMenuName(
          '소고기 미역국과 밥',
        ),
        '소고기미역국',
      )
      assert.equal(
        normalizeAiMenuName(
          '돼지고기 김치없는 볶음밥',
        ),
        '돼지고기볶음밥',
      )
      assert.equal(
        normalizeAiMenuName('제육볶음'),
        '제육볶음',
      )
      assert.equal(
        normalizeAiMenuName('계란볶음밥'),
        '계란볶음밥',
      )
      assert.equal(
        normalizeAiMenuName(
          '소고기국과채소',
        ),
        null,
      )
      assert.equal(
        normalizeAiMenuName(
          '아주길고자연스럽지않은가족저녁요리',
        ),
        null,
      )

      const draftApiSource = readFileSync(
        'api/ai/meal-plan-trial.ts',
        'utf8',
      )

      assert.match(
        draftApiSource,
        /maxLength: 12/,
      )
      assert.match(
        draftApiSource,
        /표준 음식명만 2~12자/,
      )
      assert.match(
        draftApiSource,
        /summary와 recommendationReason에 분리/,
      )
    },
  )

  await check(
    'AI 재료 단위: 생활 단위 보정과 실사용 분수 반올림',
    () => {
      const normalize = (name, quantity, unit = 'g') =>
        normalizeAiIngredientUnit({
          name,
          quantity,
          unit,
        })

      assert.deepEqual(normalize('밥', 800), {
        name: '밥',
        quantity: 4,
        unit: '공기',
      })
      assert.deepEqual(normalize('양파', 300), {
        name: '양파',
        quantity: 2,
        unit: '개',
      })
      assert.deepEqual(
        normalize('양파', 1.5, '개'),
        {
          name: '양파',
          quantity: 2,
          unit: '개',
        },
      )
      assert.deepEqual(normalize('감자', 300), {
        name: '감자',
        quantity: 2,
        unit: '개',
      })
      assert.deepEqual(normalize('당근', 120), {
        name: '당근',
        quantity: 1,
        unit: '개',
      })
      assert.deepEqual(normalize('대파', 100), {
        name: '대파',
        quantity: 1,
        unit: '대',
      })
      assert.deepEqual(normalize('달걀', 240), {
        name: '달걀',
        quantity: 4,
        unit: '개',
      })
      assert.deepEqual(normalize('두부', 600), {
        name: '두부',
        quantity: 2,
        unit: '모',
      })
      assert.deepEqual(normalize('돼지고기', 413), {
        name: '돼지고기',
        quantity: 413,
        unit: 'g',
      })
      assert.deepEqual(normalize('물', 700), {
        name: '물',
        quantity: 700,
        unit: 'ml',
      })
      assert.deepEqual(normalize('간장', 30), {
        name: '간장',
        quantity: 2,
        unit: '큰술',
      })
      assert.deepEqual(normalize('식용유', 15, 'ml'), {
        name: '식용유',
        quantity: 1,
        unit: '큰술',
      })
      assert.deepEqual(normalize('다진 마늘', 10), {
        name: '다진 마늘',
        quantity: 2,
        unit: '작은술',
      })
      assert.deepEqual(normalize('소금', 2), {
        name: '소금',
        quantity: 1,
        unit: '한 꼬집',
      })
      assert.deepEqual(normalize('후추', 1), {
        name: '후추',
        quantity: 1,
        unit: '약간',
      })
      assert.deepEqual(normalize('김', 6), {
        name: '김',
        quantity: 2,
        unit: '장',
      })
      assert.deepEqual(normalize('참치', 300), {
        name: '참치',
        quantity: 2,
        unit: '캔',
      })
      assert.deepEqual(
        normalize('양파', 0.83, '개'),
        {
          name: '양파',
          quantity: 1,
          unit: '개',
        },
      )
      const baseIngredient = {
        name: '감자',
        quantity: 300,
        unit: 'g',
      }

      normalizeAiIngredientUnit(baseIngredient)
      assert.deepEqual(baseIngredient, {
        name: '감자',
        quantity: 300,
        unit: 'g',
      })

      const detailApiSource = readFileSync(
        'api/ai/meal-plan-recipe-detail.ts',
        'utf8',
      )
      const trialEngineSource = readFileSync(
        'src/services/aiMealPlanTrialEngine.ts',
        'utf8',
      )

      assert.match(
        detailApiSource,
        /밥은 공기/,
      )
      assert.match(
        detailApiSource,
        /1 1\/2개, 0\.83개, 1\.25개/,
      )
      assert.match(
        trialEngineSource,
        /normalizeAiIngredientUnit\(\{/,
      )
    },
  )

  await check(
    'Real Cooking 단위: 대표 재료 30개를 생활·조리·감각 단위로 표시',
    () => {
      const cases = [
        ['배추김치', 600, 'g', '약 1/4포기'],
        ['두부', 300, 'g', '1모'],
        ['대파', 60, 'g', '1/2대'],
        ['대파', 120, 'g', '1대'],
        ['팽이버섯', 100, 'g', '1봉'],
        ['손질 고등어', 600, 'g', '4쪽'],
        ['손질 오징어', 500, 'g', '2마리'],
        ['청양고추', 10, 'g', '2개'],
        ['칵테일 새우', 100, 'g', '약 15개'],
        ['따뜻한 밥', 800, 'g', '4공기'],
        ['통마늘', 40, 'g', '10쪽'],
        ['당근', 38, 'g', '1/2개'],
        ['쪽파', 25, 'g', '한 줌'],
        ['레몬', 0.5, '개', '반 개'],
        ['간 무', 80, 'g', '1토막'],
        ['달걀지단', 80, 'g', '2개'],
        ['다진 당근', 38, 'g', '1/2개'],
        ['양파', 150, 'g', '1개'],
        ['감자', 300, 'g', '2개'],
        ['애호박', 150, 'g', '1/2개'],
        ['깻잎', 20, 'g', '10장'],
        ['김', 6, 'g', '2장'],
        ['식빵', 60, 'g', '2장'],
        ['라면', 240, 'g', '2봉지'],
        ['우동면', 400, 'g', '2봉'],
        ['참치캔', 300, 'g', '2캔'],
        ['소금', 2, 'g', '한 꼬집'],
        ['후춧가루', 1, 'g', '약간'],
        ['참치액', 12.5, 'ml', '약 3작은술'],
        ['참기름', 3.75, 'ml', '약 1/2큰술'],
      ]
      const banned =
        /1 1\/2|12 2\/1|3¾|0\.83|NaN|undefined/

      assert.equal(cases.length, 30)

      for (const [
        name,
        quantity,
        unit,
        expected,
      ] of cases) {
        const presentation =
          createIngredientUnitPresentation({
            name,
            quantity,
            unit,
          })

        assert.equal(
          presentation.displayText,
          expected,
          name,
        )
        assert.doesNotMatch(
          presentation.displayText,
          banned,
        )
      }
    },
  )

  await check(
    'Real Cooking 단위: 3·5인분에서도 혼합분수 없이 읽기 쉬운 수량 유지',
    () => {
      const baseIngredients = [
        ['대파', 120, 'g'],
        ['당근', 76, 'g'],
        ['참치액', 10, 'ml'],
        ['참기름', 15, 'ml'],
        ['밥', 800, 'g'],
      ]
      const banned =
        /1 1\/2|12 2\/1|3¾|0\.83|NaN|undefined/

      for (const servings of [3, 5]) {
        for (const [
          name,
          quantity,
          unit,
        ] of baseIngredients) {
          const presentation =
            createIngredientUnitPresentation({
              name,
              quantity:
                quantity * (servings / 4),
              unit,
            })

          assert.doesNotMatch(
            presentation.displayText,
            banned,
          )
        }
      }
    },
  )

  await check(
    '식단 장보기 저장: 기존 목록을 보존하고 같은 기간의 부족분만 새 batch로 추가',
    () => {
      const currentItems = [
        {
          id: 'manual-1',
          name: '우유',
          completed: false,
          source: 'manual',
          createdAt: '2026-07-30T00:00:00.000Z',
          updatedAt: '2026-07-30T00:00:00.000Z',
        },
        {
          id: 'old-range',
          name: '양파',
          quantity: 1,
          unit: '개',
          completed: false,
          source: 'meal',
          sourceId:
            'meal-plan-range:2026-07-30:week',
          createdAt: '2026-07-30T00:00:00.000Z',
          updatedAt: '2026-07-30T00:00:00.000Z',
        },
        {
          id: 'other-range',
          name: '두부',
          quantity: 1,
          unit: '모',
          completed: false,
          source: 'meal',
          sourceId:
            'meal-plan-range:2026-08-06:week',
          createdAt: '2026-07-30T00:00:00.000Z',
          updatedAt: '2026-07-30T00:00:00.000Z',
        },
      ]
      const sourceId =
        'meal-plan-range:2026-07-30:week'
      const first = replaceMealPlanRangeShoppingItems(
        currentItems,
        sourceId,
        [
          {
            id: 'ingredient-1',
            name: '양파',
            quantity: 2,
            unit: '개',
          },
        ],
      )
      const second = replaceMealPlanRangeShoppingItems(
        first.items,
        sourceId,
        [
          {
            id: 'ingredient-1',
            name: '양파',
            quantity: 2,
            unit: '개',
          },
        ],
      )

      assert.equal(first.generatedItems.length, 1)
      assert.equal(
        first.items.filter(
          (item) => item.sourceId === sourceId,
        ).length,
        2,
      )
      assert.equal(
        first.items
          .filter(
            (item) => item.sourceId === sourceId,
          )
          .reduce(
            (sum, item) =>
              sum + (item.quantity ?? 0),
            0,
          ),
        2,
      )
      assert.ok(
        first.items.some(
          (item) => item.id === 'old-range',
        ),
      )
      assert.ok(
        first.items.some(
          (item) => item.id === 'manual-1',
        ),
      )
      assert.ok(
        first.items.some(
          (item) => item.id === 'other-range',
        ),
      )
      assert.equal(
        second.items.filter(
          (item) => item.sourceId === sourceId,
        ).length,
        2,
      )
      assert.equal(second.generatedItems.length, 0)
      assert.equal(
        replaceMealPlanRangeShoppingItems(
          second.items,
          sourceId,
          [],
        ).generatedItems.length,
        0,
      )

      const missedItem = {
        ...currentItems[1],
        purchaseStatus: 'not-purchased',
        reminderStatus: 'pending',
      }
      const replacementWithReminder =
        replaceMealShoppingSourceItems(
          [currentItems[0], missedItem],
          sourceId,
          [
            {
              id: 'ingredient-reminder',
              name: '양파',
              quantity: 2,
              unit: '개',
            },
          ],
        )

      assert.equal(
        replacementWithReminder.items.filter(
          (item) => item.name === '양파',
        ).length,
        1,
      )
      assert.equal(
        replacementWithReminder.items.find(
          (item) => item.name === '양파',
        )?.purchaseStatus,
        'not-purchased',
      )

      const shoppingHandler =
        mealPlanPageSource.slice(
          mealPlanPageSource.indexOf(
            'function handleCreateShoppingList',
          ),
          mealPlanPageSource.indexOf(
            'function handleGenerateAiTrial',
          ),
        )

      assert.match(
        shoppingHandler,
        /if \(itemCount === 0\)/,
      )
      assert.match(
        shoppingHandler,
        /장보기 목록을 저장하지 못했어요/,
      )
      assert.ok(
        shoppingHandler.indexOf(
          'if (itemCount === 0)',
        ) <
          shoppingHandler.indexOf(
            '장보기 목록을 만들었어요',
          ),
      )
    },
  )

  await check(
    '장보기 상태 모델: 구매·못 삼·planned와 새 batch를 보존하고 냉장고 전송은 멱등',
    () => {
      const timestamp = '2026-08-01T00:00:00.000Z'
      const sourceA = Array.from(
        { length: 10 },
        (_, index) => ({
          id: `source-a-${index + 1}`,
          name: `재료A${index + 1}`,
          quantity: 1,
          unit: '개',
          completed: false,
          source: 'meal',
          sourceId: 'meal-plan-range:a',
          sourceKind: 'meal_plan',
          sourceRecipeName: '레시피 A',
          sourceMealDate: '2026-08-01',
          batchId: 'batch-a',
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      )
      let shopping = updateShoppingPurchase(
        sourceA,
        sourceA.slice(0, 4).map((item) => item.id),
        {
          mode: 'single',
          purchasedQuantity: 4,
        },
        timestamp,
      )

      shopping = updateShoppingPurchase(
        shopping,
        sourceA.slice(4, 6).map((item) => item.id),
        {
          mode: 'single',
          purchasedQuantity: 0,
          notPurchased: true,
        },
        timestamp,
      )

      let nextInventoryId = 0
      const firstTransfer =
        mergeCompletedShoppingIntoInventory(
          [],
          shopping,
          {
            createId: () =>
              `inventory-${++nextInventoryId}`,
            createApplicationId: () =>
              `transfer-${++nextInventoryId}`,
            now: timestamp,
          },
        )

      assert.equal(
        firstTransfer.inventoryItems.length,
        4,
      )
      assert.equal(
        getShoppingReminderItems(
          firstTransfer.shoppingItems,
        ).length,
        2,
      )
      assert.equal(
        firstTransfer.shoppingItems.filter(
          (item) =>
            item.purchaseStatus === 'planned',
        ).length,
        4,
      )

      const sourceB =
        replaceMealPlanRangeShoppingItems(
          firstTransfer.shoppingItems,
          'meal-plan-range:b',
          Array.from(
            { length: 3 },
            (_, index) => ({
              id: `ingredient-b-${index + 1}`,
              name: `재료B${index + 1}`,
              quantity: 1,
              unit: '개',
            }),
          ),
          {
            sourceKind: 'meal_plan',
            sourceRecipeName: '레시피 B',
            sourceMealDate: '2026-08-08',
            batchId: 'batch-b',
          },
        )

      assert.equal(
        getShoppingReminderItems(
          sourceB.items,
        ).length,
        2,
      )
      assert.equal(
        sourceB.generatedItems.length,
        3,
      )
      assert.ok(
        sourceB.generatedItems.every(
          (item) =>
            item.batchId === 'batch-b' &&
            item.sourceRecipeName === '레시피 B',
        ),
      )

      const purchasedB = updateShoppingPurchase(
        sourceB.items,
        sourceB.generatedItems.map(
          (item) => item.id,
        ),
        {
          mode: 'single',
          purchasedQuantity: 3,
        },
        timestamp,
      )
      const secondTransfer =
        mergeCompletedShoppingIntoInventory(
          firstTransfer.inventoryItems,
          purchasedB,
          {
            createId: () =>
              `inventory-${++nextInventoryId}`,
            createApplicationId: () =>
              `transfer-${++nextInventoryId}`,
            now: timestamp,
          },
        )
      const repeatedTransfer =
        mergeCompletedShoppingIntoInventory(
          secondTransfer.inventoryItems,
          secondTransfer.shoppingItems,
          {
            createId: () =>
              `inventory-${++nextInventoryId}`,
            createApplicationId: () =>
              `transfer-${++nextInventoryId}`,
            now: timestamp,
          },
        )

      assert.equal(
        secondTransfer.inventoryItems.length,
        7,
      )
      assert.equal(
        repeatedTransfer.inventoryItems.length,
        7,
      )
      assert.equal(
        repeatedTransfer.appliedShoppingItemIds
          .length,
        0,
      )
      assert.equal(
        getShoppingReminderItems(
          JSON.parse(
            JSON.stringify(
              secondTransfer.shoppingItems,
            ),
          ),
        ).length,
        2,
      )
    },
  )

  await check(
    '하단 레시피 탭과 냉장고: 목록 기본 진입과 Refrigerator 아이콘 유지',
    () => {
      const appSource = readFileSync(
        'src/App.tsx',
        'utf8',
      )
      const bottomNavigationSource = readFileSync(
        'src/components/BottomNavigation.tsx',
        'utf8',
      )

      assert.match(
        appSource,
        /case 'recipes':[\s\S]*<RecipePage/,
      )
      assert.match(
        bottomNavigationSource,
        /page: 'recipes'[\s\S]*label: '레시피'/,
      )
      assert.match(
        bottomNavigationSource,
        /import \{[\s\S]*Refrigerator[\s\S]*\} from 'lucide-react'/,
      )
      assert.match(
        bottomNavigationSource,
        /label: '냉장고',[\s\S]*icon: Refrigerator/,
      )
      assert.doesNotMatch(
        bottomNavigationSource,
        /label: '냉장고',[\s\S]*icon: PackageOpen/,
      )
    },
  )

  await check(
    'Recipe 이미지: 정확한 ID·표준 메뉴명·명시적 별칭만 매칭',
    () => {
      const exactId = resolveRecipeImage(
        'kimchi-stew',
        '다른 이름',
      )
      const exactName = resolveRecipeImage(
        'ai-trial-1',
        '카레',
      )
      const alias = resolveRecipeImage(
        'ai-trial-2',
        '카레라이스',
      )
      const ambiguous = resolveRecipeImage(
        'ai-trial-3',
        '연어 채소 덮밥',
      )
      const unknown = resolveRecipeImage(
        'ai-trial-4',
        '새로운 가족 메뉴',
      )

      assert.equal(exactId?.match, 'id')
      assert.equal(exactId?.imageKey, 'kimchi-stew')
      assert.equal(exactName?.match, 'name')
      assert.equal(exactName?.imageKey, 'curry')
      assert.equal(alias?.match, 'alias')
      assert.equal(alias?.imageKey, 'curry')
      assert.equal(ambiguous, null)
      assert.equal(unknown, null)
    },
  )

  await check(
    'AI 메뉴 이미지: 7개 순서 독립 exact 매칭과 미매칭 placeholder 유지',
    () => {
      const menuNames = [
        '김치찌개',
        '고등어구이',
        '소고기미역국',
        '닭갈비',
        '계란볶음밥',
        '카레',
        '두부조림',
      ]
      const firstPass = menuNames.map((name, index) =>
        resolveRecipeImage(`ai-menu-${index}`, name),
      )
      const reorderedPass = [...menuNames]
        .reverse()
        .map((name, index) =>
          resolveRecipeImage(
            `reordered-ai-menu-${index}`,
            name,
          ),
        )
        .reverse()

      assert.deepEqual(
        firstPass.map((result) => result?.imageKey),
        [
          'kimchi-stew',
          'grilled-mackerel',
          'beef-seaweed-soup',
          'chicken-galbi',
          'egg-fried-rice',
          'curry',
          'braised-tofu',
        ],
      )
      assert.deepEqual(
        reorderedPass.map(
          (result) => result?.imageKey,
        ),
        firstPass.map(
          (result) => result?.imageKey,
        ),
      )
      assert.ok(
        firstPass.every(
          (result) =>
            result &&
            Object.values(recipeImages).includes(
              result.src,
            ),
        ),
      )
      assert.equal(
        resolveRecipeImage(
          'unknown-id',
          '연어 채소 덮밥',
        ),
        null,
      )
      assert.match(
        mealPlanPageSource,
        /ai-trial-recipe-card__image--placeholder/,
      )
      assert.match(
        recipePageSource.slice(
          recipePageSource.indexOf(
            'function RecipePhoto',
          ),
          recipePageSource.indexOf(
            'function RecipePage',
          ),
        ),
        /data-image-match="placeholder"/,
      )
      assert.match(
        appCssSource,
        /\.ai-trial-recipe-card__image[\s\S]*object-fit:\s*cover/,
      )
      assert.doesNotMatch(
        `${mealPlanPageSource}${recipePageSource}${homePageSource}`,
        /음식 사진 준비 중|사진 준비 중/,
      )
      assert.match(
        `${mealPlanPageSource}${recipePageSource}${homePageSource}`,
        /대표 사진 없음/,
      )
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
        '1/2',
      )
      assert.equal(formatRecipeAmount(1.5, '개'), '2')
      assert.equal(formatRecipeAmount(1.25, '개'), '1')
      assert.equal(formatRecipeAmount(1, '약간'), '')
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
      const inventoryRecommendation =
        readNavigationState(
          null,
          '?page=recipes&fromInventory=1',
        )

      assert.equal(restored.recipeId, 'kimchi-stew')
      assert.equal(direct.page, 'recipes')
      assert.equal(direct.recipeId, 'curry')
      assert.equal(
        inventoryRecommendation
          .showInventoryRecommendations,
        true,
      )
      assert.equal(
        createNavigationUrl(
          inventoryRecommendation,
          'https://example.com/',
        ),
        '/?page=recipes&fromInventory=1',
      )
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
        {
          kind: 'back-and-replace',
          delta: -1,
        },
      )
      assert.deepEqual(
        planTopLevelNavigation(
          recipeDetail,
          'inventory',
        ),
        {
          kind: 'back-and-replace',
          delta: -2,
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
          'PIPELINE_TIMEOUT',
        )
      const invalid =
        getAiMealPlanTrialFailureState(
          'SCHEMA_VALIDATION_FAILED',
        )

      assert.equal(timeout.trialConsumed, false)
      assert.equal(timeout.canRetry, true)
      assert.match(timeout.title, /완성/)
      assert.equal(invalid.trialConsumed, false)
      assert.equal(invalid.canRetry, true)
      assert.match(invalid.title, /완성/)
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
      assert.deepEqual(
        body.days.map((day) => day.name),
        aiTestMenuNames,
      )
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
              name: aiTestMenuNames[index],
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
    'AI 상세 생성 상태: recipeId별 loading·error·retry·success 독립',
    () => {
      let states = {}

      states = updateRecipeDetailGenerationState(
        states,
        'recipe-day-1',
        'loading',
      )
      states = updateRecipeDetailGenerationState(
        states,
        'recipe-day-2',
        'loading',
      )
      states = updateRecipeDetailGenerationState(
        states,
        'recipe-day-2',
        'error',
        '시간이 오래 걸리고 있어요.',
      )

      assert.equal(
        states['recipe-day-1'].status,
        'loading',
      )
      assert.equal(
        states['recipe-day-2'].status,
        'error',
      )

      states = updateRecipeDetailGenerationState(
        states,
        'recipe-day-2',
        'loading',
      )
      states = updateRecipeDetailGenerationState(
        states,
        'recipe-day-2',
        'success',
      )

      assert.equal(
        states['recipe-day-1'].status,
        'loading',
      )
      assert.equal(
        states['recipe-day-2'].status,
        'success',
      )
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
              name: aiTestMenuNames[index],
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
          false,
        )
      const finalized =
        completeStoredAiMealPlanTrial(
          completed,
          '2026-08-03T00:02:00.000Z',
        )

      assert.equal(response.status, 200)
      assert.equal(
        detailBody.recipe.steps.length,
        8,
      )
      assert.equal(completed?.status, 'draft')
      assert.equal(
        completed?.usedAt,
        undefined,
      )
      assert.equal(finalized, null)
      assert.equal(
        completed?.response.recipes.length,
        1,
      )
      assert.ok(
        completed.response
          .weeklyShoppingIngredients.length > 0,
      )

      let sequentialTrial = completed

      for (const dayIndex of [
        1, 2, 3, 4, 5, 6,
      ]) {
        const nextDetailRequest = {
          day: sequentialTrial.response.days[dayIndex],
          householdSize: 4,
          includesChildren: false,
          spicePreference: 'mild',
        }
        const validation =
          validateAiMealPlanRecipeDetailRequest(
            nextDetailRequest,
          )

        assert.equal(validation.ok, true)

        const nextResponse =
          await handleAiMealPlanRecipeDetail(
            new Request(
              'http://localhost/api/ai/meal-plan-recipe-detail',
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json',
                },
                body: JSON.stringify(
                  nextDetailRequest,
                ),
              },
            ),
            {
              NODE_ENV: 'development',
              HOMEOS_AI_MOCK: 'true',
            },
          )
        const nextBody = await nextResponse.json()

        assert.equal(nextResponse.status, 200)
        sequentialTrial =
          addRecipeToStoredAiMealPlanTrial(
            sequentialTrial,
            nextBody.recipe,
            'ai',
            nextBody.meta,
            `2026-08-03T00:0${dayIndex + 2}:00.000Z`,
            false,
          )
      }

      const finalizedTrial =
        completeStoredAiMealPlanTrial(
          sequentialTrial,
          '2026-08-03T00:09:00.000Z',
        )

      assert.equal(
        sequentialTrial.response.recipes.length,
        7,
      )
      assert.equal(
        sequentialTrial.status,
        'draft',
      )
      assert.equal(
        sequentialTrial.usedAt,
        undefined,
      )
      assert.equal(
        finalizedTrial.status,
        'completed',
      )
      assert.equal(
        finalizedTrial.usedAt,
        '2026-08-03T00:09:00.000Z',
      )
      assert.deepEqual(
        sequentialTrial.response.recipes.map(
          (recipe) => recipe.name,
        ),
        aiTestMenuNames,
      )
      assert.equal(
        'dayLabel' in
          sequentialTrial.response.days[1],
        false,
      )
      assert.equal(
        sequentialTrial.response.plans[1].name,
        sequentialTrial.response.days[1].name,
      )
    },
  )

  await check(
    'Final Polish: 미구매 진입점·다시 살 재료 그룹·자연스러운 문구',
    () => {
      const shoppingPage = readFileSync(
        'src/pages/ShoppingPage.tsx',
        'utf8',
      )

      assert.match(
        shoppingPage,
        /shopping-item__more/,
      )
      assert.match(
        shoppingPage,
        /재료나 오른쪽 더보기 버튼을 눌러 실제[\s\S]*이번에 못 산 재료로[\s\S]*남길 수 있어요/,
      )
      assert.match(shoppingPage, /title="다시 살 재료"/)
      assert.match(
        shoppingPage,
        /이번 장보기에 포함/,
      )
      assert.match(
        shoppingPage,
        /이번 목록에서 제외/,
      )
      assert.match(
        shoppingPage,
        /이번에는 못 샀어요/,
      )
      assert.match(
        shoppingPage,
        /다음 장보기에 다시 알려드려요/,
      )
    },
  )

  await check(
    'Final Polish: 구매 단위와 요약은 현재 재료 표시 단위를 사용',
    () => {
      const shoppingPage = readFileSync(
        'src/pages/ShoppingPage.tsx',
        'utf8',
      )

      assert.match(
        shoppingPage,
        /label=\{`실제 구매 수량 \(\$\{selectedPurchaseUnit\}\)`\}/,
      )
      assert.match(
        shoppingPage,
        /formatShoppingQuantity\(\s*selectedPurchaseItem\.name,\s*effectivePurchasedQuantity,\s*selectedPurchaseUnit/,
      )
      assert.doesNotMatch(
        shoppingPage,
        /총 \{effectivePurchasedQuantity\}\s*\{selectedPurchaseUnit\}/,
      )
    },
  )

  await check(
    'Final Polish: 최근 14일 메뉴 제외와 조리 유형 다양성',
    () => {
      const recentNames =
        getRecentMealPlanMenuNames(
          [
            {
              date: '2026-07-30',
              name: '감자조림',
            },
            {
              date: '2026-07-20',
              name: '두부조림',
            },
            {
              date: '2026-07-10',
              name: '오래된 메뉴',
            },
          ],
          '2026-07-31',
        )

      assert.deepEqual(recentNames, [
        '감자조림',
        '두부조림',
      ])
      assert.equal(
        classifyAiMealCookingType('소고기미역국'),
        'soup-stew',
      )
      assert.equal(
        classifyAiMealCookingType('김치볶음밥'),
        'rice-noodle',
      )

      const request = {
        startDate: '2026-07-31',
        householdSize: 4,
        includesChildren: false,
        spicePreference: 'mild',
        weekdayMaxMinutes: 40,
        inventoryItems: [],
        recentMenuNames: ['감자조림'],
      }
      const menuNames = [
        '감자조림',
        '된장찌개',
        '제육볶음',
        '고등어구이',
        '김치볶음밥',
        '달걀찜',
        '애호박전',
      ]
      const output = {
        days: menuNames.map((name, index) => ({
          day: index + 1,
          name,
          summary: '가족 저녁 메뉴예요.',
          recommendationReason:
            '가족 조건을 반영했어요.',
          servings: 4,
          prepMinutes: 10,
          cookMinutes: 25,
          mainIngredientNames: [
            `주재료 ${index + 1}`,
          ],
          missingIngredientNames: [],
          constraintCompliance:
            '제외 조건을 모두 지켰어요.',
        })),
      }
      const recentDuplicate =
        parseAiMealPlanDraftOutputResult(
          output,
          request,
        )

      assert.equal(recentDuplicate.ok, false)
      assert.equal(
        recentDuplicate.reason,
        'RECENT_MENU_DUPLICATE',
      )

      const tooManyBraises = {
        days: [
          '감자조림',
          '두부조림',
          '연근조림',
          '된장찌개',
          '제육볶음',
          '고등어구이',
          '김치볶음밥',
        ].map((name, index) => ({
          ...output.days[index],
          name,
        })),
      }
      const diversityFailure =
        parseAiMealPlanDraftOutputResult(
          tooManyBraises,
          {
            ...request,
            recentMenuNames: [],
          },
        )

      assert.equal(diversityFailure.ok, false)
      assert.equal(
        diversityFailure.reason,
        'DIVERSITY_VIOLATION',
      )
    },
  )

  await check(
    'Final Polish: 정확한 사진이 없으면 축소된 단일 음식 아이콘 상태 사용',
    () => {
      const recipePage = readFileSync(
        'src/pages/RecipePage.tsx',
        'utf8',
      )
      const homePage = readFileSync(
        'src/pages/HomePage.tsx',
        'utf8',
      )
      const mealPlanPage = readFileSync(
        'src/pages/MealPlanPage.tsx',
        'utf8',
      )
      const recipeCss = readFileSync(
        'src/pages/RecipePage.css',
        'utf8',
      )

      assert.match(recipePage, /recipe-photo--empty/)
      assert.match(
        recipePage,
        /대표 사진이 아직 없어요/,
      )
      assert.match(
        recipePage,
        /레시피는 정상적으로 이용할 수 있습니다/,
      )
      assert.match(
        homePage,
        /home-hero__visual--empty/,
      )
      assert.match(
        homePage,
        /home-hero__shopping-link[\s\S]*장보기 목록 보기/,
      )
      assert.match(
        mealPlanPage,
        /ai-trial-recipe-card__image--placeholder/,
      )
      assert.match(
        mealPlanPage,
        /레시피는 정상적으로 이용할 수 있습니다/,
      )
      assert.match(
        recipeCss,
        /\.recipe-photo--empty[\s\S]*height: 80px/,
      )
      assert.doesNotMatch(
        recipePage,
        /오늘식탁 · 대표 사진 없음/,
      )
    },
  )

  await check(
    'Final Polish: 재료 수량 색상과 하단 safe-area 토큰 통일',
    () => {
      const recipeCss = readFileSync(
        'src/pages/RecipePage.css',
        'utf8',
      )
      const appCss = readFileSync(
        'src/App.css',
        'utf8',
      )
      const uiCss = readFileSync(
        'src/components/ui/ui.css',
        'utf8',
      )
      const themeCss = readFileSync(
        'src/styles/theme.css',
        'utf8',
      )

      assert.match(
        recipeCss,
        /\.recipe-ingredient-list \.ui-number \{[\s\S]*color: var\(--color-ingredient-quantity\)/,
      )
      assert.match(
        themeCss,
        /--color-ingredient-quantity: var\(--color-primary-dark\)/,
      )
      assert.match(
        themeCss,
        /--bottom-nav-height: 88px/,
      )
      assert.match(
        appCss,
        /var\(--bottom-nav-height\)[\s\S]*env\(safe-area-inset-bottom, 0px\)[\s\S]*var\(--space-6\)/,
      )
      assert.match(
        uiCss,
        /\.ui-dialog__footer \{[\s\S]*env\(safe-area-inset-bottom, 0px\)/,
      )
    },
  )

  await check(
    'AI 7일 체험 Phase 1: 평일 조리시간 초과를 안전하게 사용자 상한으로 정규화',
    () => {
      const request = {
        startDate: '2026-08-03',
        householdSize: 4,
        includesChildren: false,
        spicePreference: 'mild',
        weekdayMaxMinutes: 40,
        inventoryItems: [],
      }
      const result = parseAiMealPlanDraftOutputResult(
        {
          days: Array.from(
            { length: 7 },
            (_, index) => ({
              day: index + 1,
              name: aiTestMenuNames[index],
              summary: '가족 저녁 메뉴예요.',
              recommendationReason:
                '가족 조건을 반영했어요.',
              servings: 4,
              prepMinutes: 10,
              cookMinutes: index === 0 ? 55 : 25,
              mainIngredientNames: [
                `주재료 ${index + 1}`,
              ],
              missingIngredientNames: [],
              constraintCompliance:
                '제외 조건을 모두 지켰어요.',
            }),
          ),
        },
        request,
      )

      assert.equal(result.ok, true)
      assert.equal(result.data.days[0].cookMinutes, 40)
    },
  )
  await check(
    'Release blocker: AI pipeline traces every stage and completes only after seven details',
    () => {
      const mealPlanPage = readFileSync(
        'src/pages/MealPlanPage.tsx',
        'utf8',
      )
      const trialHook = readFileSync(
        'src/hooks/useAiMealPlanTrial.ts',
        'utf8',
      )

      assert.match(
        mealPlanPage,
        /for \(const day of trial\.response\.days\)/,
      )
      assert.match(
        mealPlanPage,
        /savedCount !==[\s\S]*detailedTrial\.response\.days\.length/,
      )
      assert.match(
        mealPlanPage,
        /beginStage\('PLANNER_SAVE'\)[\s\S]*beginStage\('SHOPPING_PREPARE'\)[\s\S]*beginStage\('TRIAL_COMPLETE'\)/,
      )
      assert.match(
        mealPlanPage,
        /if \(plannerApplied\)[\s\S]*replaceAllMealPlans\(previousMealPlans\)[\s\S]*replaceAllShoppingItems/,
      )
      assert.match(
        trialHook,
        /traceId: request\.traceId/,
      )
      assert.equal(
        mapAiMealPlanPipelineErrorCode(
          'OPENAI_TIMEOUT',
          'NETWORK_ERROR',
        ),
        'OPENAI_TIMEOUT',
      )
      assert.equal(
        createAiMealPlanPipelineError(
          { code: 'AI_NOT_CONFIGURED' },
          'DRAFT_GENERATION',
          'NETWORK_ERROR',
          'failed',
        ).code,
        'API_ENV_MISSING',
      )
    },
  )

  await check(
    'Release blocker: shopping keeps 2 planned and 2 reminders while adding a separate 3-item batch',
    () => {
      const currentItems = [
        {
          id: 'planned-onion',
          name: '양파',
          quantity: 2,
          unit: '개',
          completed: false,
          source: 'meal',
          sourceId: 'existing-plan',
          batchId: 'batch-a',
          purchaseStatus: 'planned',
          reminderStatus: 'none',
          createdAt: '2026-07-31T00:00:00.000Z',
          updatedAt: '2026-07-31T00:00:00.000Z',
        },
        {
          id: 'planned-tofu',
          name: '두부',
          quantity: 1,
          unit: '모',
          completed: false,
          source: 'meal',
          sourceId: 'existing-plan',
          batchId: 'batch-a',
          purchaseStatus: 'planned',
          reminderStatus: 'none',
          createdAt: '2026-07-31T00:00:00.000Z',
          updatedAt: '2026-07-31T00:00:00.000Z',
        },
        {
          id: 'missed-leek',
          name: '대파',
          quantity: 1,
          unit: '대',
          completed: false,
          source: 'meal',
          sourceId: 'older-plan',
          batchId: 'batch-reminder',
          purchaseStatus: 'not-purchased',
          reminderStatus: 'pending',
          inventoryAppliedQuantity: 0,
          createdAt: '2026-07-30T00:00:00.000Z',
          updatedAt: '2026-07-30T00:00:00.000Z',
        },
        {
          id: 'missed-carrot',
          name: '당근',
          quantity: 1,
          unit: '개',
          completed: false,
          source: 'meal',
          sourceId: 'older-plan',
          batchId: 'batch-reminder',
          purchaseStatus: 'not-purchased',
          reminderStatus: 'pending',
          inventoryAppliedQuantity: 0,
          createdAt: '2026-07-30T00:00:00.000Z',
          updatedAt: '2026-07-30T00:00:00.000Z',
        },
      ]
      const before = structuredClone(currentItems)
      const result =
        replaceMealPlanRangeShoppingItems(
          currentItems,
          'new-week-plan',
          [
            {
              id: 'potato',
              name: '감자',
              quantity: 2,
              unit: '개',
            },
            {
              id: 'meat',
              name: '고기',
              quantity: 500,
              unit: 'g',
            },
            {
              id: 'soy-sauce',
              name: '간장',
              quantity: 3,
              unit: '큰술',
            },
          ],
          {
            batchId: 'batch-b',
            sourceKind: 'meal_plan',
          },
        )

      assert.equal(result.items.length, 7)
      assert.deepEqual(
        result.items.slice(0, 4),
        before,
      )
      assert.equal(result.generatedItems.length, 3)
      assert.ok(
        result.generatedItems.every(
          (item) =>
            item.batchId === 'batch-b' &&
            item.sourceId === 'new-week-plan',
        ),
      )
      assert.equal(
        result.items.filter(
          (item) =>
            item.purchaseStatus ===
              'not-purchased' &&
            item.reminderStatus === 'pending',
        ).length,
        2,
      )
    },
  )

  await check(
    'Release blocker: reminder actions keep one primary action and an accessible 44px overflow menu',
    () => {
      const shoppingPage = readFileSync(
        'src/pages/ShoppingPage.tsx',
        'utf8',
      )
      const uiCss = readFileSync(
        'src/components/ui/ui.css',
        'utf8',
      )

      assert.match(
        shoppingPage,
        /shopping-reminder__more-actions/,
      )
      assert.match(
        shoppingPage,
        /다시 살 재료 추가 동작 열기/,
      )
      assert.match(
        shoppingPage,
        /shopping-reminder-actions-sheet/,
      )
      assert.match(
        uiCss,
        /\.shopping-reminder__more-actions[\s\S]*width: 44px[\s\S]*height: 44px/,
      )
      assert.match(
        uiCss,
        /\.shopping-reminder__item-actions[\s\S]*\.ui-button:nth-child\(2\)[\s\S]*display: inline-flex/,
      )
    },
  )

  await check(
    'Release blocker: tutorial preference persists and the final CTA stays inside safe-area',
    () => {
      const appSource = readFileSync(
        'src/App.tsx',
        'utf8',
      )
      const uiCss = readFileSync(
        'src/components/ui/ui.css',
        'utf8',
      )

      assert.match(
        appSource,
        /isReplay[\s\S]*doNotShowAgain[\s\S]*shouldNotShowAgain/,
      )
      assert.match(
        uiCss,
        /\.first-run-tutorial \{[\s\S]*grid-template-rows: auto minmax\(0, 1fr\) auto[\s\S]*100dvh/,
      )
      assert.match(
        uiCss,
        /\.first-run-tutorial \.ui-dialog__footer[\s\S]*safe-area-inset-bottom/,
      )
      assert.match(
        uiCss,
        /\.first-run-tutorial__actions \.ui-button[\s\S]*min-height: 48px[\s\S]*white-space: nowrap/,
      )
    },
  )

  await check(
    'Release blocker: standalone PWA uses one exit guard while browser mode keeps normal history',
    () => {
      const topLevel = createNavigationState({
        page: 'shopping',
      })
      const detail = createNavigationState({
        page: 'recipes',
        recipeId: 'kimchi-stew',
        index: 1,
      })
      const guard =
        createPwaExitGuardState(topLevel)

      assert.equal(
        isTopLevelNavigationState(topLevel),
        true,
      )
      assert.equal(
        isTopLevelNavigationState(detail),
        false,
      )
      assert.equal(isPwaExitGuardState(guard), true)
      assert.equal(
        isPwaExitGuardState(topLevel),
        false,
      )
      assert.equal(
        shouldUsePwaBackExit(true, false),
        true,
      )
      assert.equal(
        shouldUsePwaBackExit(false, false),
        false,
      )

      const appSource = readFileSync(
        'src/App.tsx',
        'utf8',
      )

      assert.match(
        appSource,
        /한 번 더 누르면 오늘식탁을 종료해요/,
      )
      assert.match(
        appSource,
        /PWA_BACK_EXIT_TIMEOUT_MS = 2_000/,
      )
      assert.doesNotMatch(
        appSource,
        /window\.close\(/,
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

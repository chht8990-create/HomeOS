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
    'S7.1 정책 페이지: 개인정보처리방침·이용약관 공개 경로와 필수 내용을 제공',
    () => {
      const privacy = readFileSync(
        'src/pages/PrivacyPage.tsx',
        'utf8',
      )
      const terms = readFileSync(
        'src/pages/TermsPage.tsx',
        'utf8',
      )
      const app = readFileSync('src/App.tsx', 'utf8')
      const settings = readFileSync(
        'src/pages/SettingsPage.tsx',
        'utf8',
      )
      const feedback = readFileSync(
        'src/pages/FeedbackPage.tsx',
        'utf8',
      )
      const contact = readFileSync(
        'src/config/contact.ts',
        'utf8',
      )
      const playConsoleSetup = readFileSync(
        'PLAY_CONSOLE_SETUP.md',
        'utf8',
      )

      assert.match(privacy, /개인정보처리방침/)
      assert.match(privacy, /Google 로그인과 계정/)
      assert.match(privacy, /냉장고 재료/)
      assert.match(privacy, /OpenAI/)
      assert.match(privacy, /Trial·Premium/)
      assert.match(privacy, /데이터의 열람·정정·삭제/)
      assert.match(terms, /AI 추천과 조리 정보/)
      assert.match(terms, /Trial과 Premium/)
      assert.match(terms, /조리할 책임은 사용자/)
      assert.match(settings, /개인정보처리방침/)
      assert.match(settings, /이용약관/)
      assert.match(contact, /todaytable\.help@gmail\.com/)
      assert.match(privacy, /OFFICIAL_SUPPORT_MAILTO/)
      assert.match(terms, /OFFICIAL_SUPPORT_MAILTO/)
      assert.match(settings, /OFFICIAL_SUPPORT_MAILTO/)
      assert.match(feedback, /OFFICIAL_SUPPORT_MAILTO/)
      assert.match(
        playConsoleSetup,
        /todaytable\.help@gmail\.com/,
      )
      assert.doesNotMatch(
        [
          privacy,
          terms,
          settings,
          feedback,
          contact,
          playConsoleSetup,
        ].join('\n'),
        /support@example\.com/,
      )
      assert.match(app, /currentPage !== 'privacy'/)
      assert.match(app, /currentPage !== 'terms'/)
    },
  )

  await check(
    'P3 Android TWA: package·버전·서명키·Production Asset Links',
    () => {
      const webManifest = JSON.parse(
        readFileSync('public/manifest.webmanifest', 'utf8'),
      )
      const twaManifest = JSON.parse(
        readFileSync('android/twa-manifest.json', 'utf8'),
      )
      const assetLinks = JSON.parse(
        readFileSync(
          'android/assetlinks.template.json',
          'utf8',
        ),
      )
      const productionAssetLinks = JSON.parse(
        readFileSync(
          'public/.well-known/assetlinks.json',
          'utf8',
        ),
      )
      const androidBuild = readFileSync(
        'android/app/build.gradle',
        'utf8',
      )
      const releaseBuildScript = readFileSync(
        'android/build-release.ps1',
        'utf8',
      )
      const gitIgnore = readFileSync('.gitignore', 'utf8')
      const vercelConfig = JSON.parse(
        readFileSync('vercel.json', 'utf8'),
      )

      assert.equal(webManifest.name, '오늘식탁')
      assert.equal(webManifest.short_name, '오늘식탁')
      assert.equal(webManifest.start_url, '/')
      assert.equal(webManifest.scope, '/')
      assert.equal(webManifest.display, 'standalone')
      assert.equal(twaManifest.packageId, 'com.todaytable.app')
      assert.equal(twaManifest.host, 'home-os-one.vercel.app')
      assert.equal(twaManifest.appVersion, '1.0.2')
      assert.equal(twaManifest.appVersionCode, 2)
      assert.equal(twaManifest.minSdkVersion, 23)
      assert.equal(
        twaManifest.features.playBilling.enabled,
        true,
      )
      assert.match(
        androidBuild,
        /applicationId "com\.todaytable\.app"/,
      )
      assert.match(
        androidBuild,
        /com\.google\.androidbrowserhelper:billing:/,
      )
      assert.equal(
        assetLinks[0].relation[0],
        'delegate_permission/common.handle_all_urls',
      )
      assert.equal(
        assetLinks[0].target.package_name,
        'com.todaytable.app',
      )
      assert.equal(
        assetLinks[0].target.sha256_cert_fingerprints[0],
        'CA:7F:E3:E3:CE:FF:34:5A:A8:09:B6:42:01:71:FE:0D:E1:B3:CC:36:24:D0:82:B6:58:08:50:79:81:9A:73:10',
      )
      assert.equal(
        assetLinks[0].target.sha256_cert_fingerprints[1],
        '38:E7:F1:42:FA:82:88:38:B5:2E:FF:B8:41:2D:AE:B5:91:5E:49:6B:4C:E5:B3:20:B3:3B:BD:2A:FE:75:35:3B',
      )
      assert.deepEqual(productionAssetLinks, assetLinks)
      assert.doesNotMatch(
        JSON.stringify(productionAssetLinks),
        /REPLACE_WITH_/,
      )
      assert.equal(twaManifest.fingerprints.length, 2)
      assert.equal(
        twaManifest.fingerprints[0].name,
        'todaytable-upload',
      )
      assert.equal(
        twaManifest.fingerprints[0].value,
        assetLinks[0].target.sha256_cert_fingerprints[0],
      )
      assert.equal(
        twaManifest.fingerprints[1].name,
        'play-app-signing',
      )
      assert.equal(
        twaManifest.fingerprints[1].value,
        assetLinks[0].target.sha256_cert_fingerprints[1],
      )
      assert.match(androidBuild, /signingConfigs \{/)
      assert.match(
        androidBuild,
        /keyAlias 'todaytable-upload'/,
      )
      assert.match(
        androidBuild,
        /TODAYTABLE_UPLOAD_KEYSTORE/,
      )
      assert.match(
        releaseBuildScript,
        /Import-Clixml/,
      )
      assert.match(
        releaseBuildScript,
        /bundleRelease/,
      )
      assert.match(gitIgnore, /android\/\*\.jks/)
      assert.match(gitIgnore, /android\/\*\*\/\*\.aab/)
      const assetLinksHeaders = vercelConfig.headers.find(
        (entry) =>
          entry.source === '/.well-known/assetlinks.json',
      )
      assert.ok(assetLinksHeaders)
      assert.ok(
        assetLinksHeaders.headers.some(
          (header) =>
            header.key === 'Content-Type' &&
            header.value === 'application/json; charset=utf-8',
        ),
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
        /CACHE_REVISION = 's7-rc1'/,
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
  const {
    formatInventoryQuantity,
    isValidInventoryQuantity,
    parseInventoryQuantity,
    parseStoredInventoryItems,
    serializeInventoryItems,
  } = await vite.ssrLoadModule(
    '/src/services/inventoryQuantityEngine.ts',
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
    getAiInventoryQuantity,
    normalizeAiRecipeRecommendations,
    parseAiRecipeRecommendationOutput,
    validateAiRecipeRecommendationRequest,
  } = await vite.ssrLoadModule(
    '/src/services/aiRecipeRecommendationEngine.ts',
  )
  const {
    correctKnownAiText,
    polishAiMenuTitle,
  } = await vite.ssrLoadModule(
    '/src/services/aiTextQualityEngine.ts',
  )
  const {
    excludeWaterIngredients,
    isWaterIngredientName,
    coalesceStoredShoppingIngredientAliases,
    normalizeShoppingIngredientDisplayName,
    normalizeShoppingIngredientMatchName,
  } = await vite.ssrLoadModule(
    '/src/services/shoppingIngredientPolicy.ts',
  )
  const {
    AI_RECIPE_STORAGE_KEY,
    convertAiRecommendationToRecipe,
    createAiRecommendationFingerprint,
    findMatchingRecipeForAiRecommendation,
    parseStoredAiRecipes,
    persistAiRecommendationToStorage,
    recalculateAiRecommendationForInventory,
    resolveAiRecipePersistence,
  } = await vite.ssrLoadModule(
    '/src/services/aiRecipePersistenceEngine.ts',
  )
  const {
    handleAiRecipeRecommendation,
    mapOpenAiError,
    parseOpenAiErrorDetails,
  } = await vite.ssrLoadModule(
    '/api/ai/recipe-recommendation.ts',
  )
  const {
    compactAiRecommendationOutputForTests,
    expandCompactAiRecommendationOutput,
    parseCompactAiRecommendationText,
  } = await vite.ssrLoadModule(
    '/src/server/compactAiRecommendationEngine.ts',
  )
  const {
    requestAiRecipeRecommendations,
  } = await vite.ssrLoadModule(
    '/src/services/aiRecipeRecommendationClient.ts',
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
    createManualIngredientShoppingItems,
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
  const { createPlannerShoppingChange } =
    await vite.ssrLoadModule(
      '/src/services/mealPlanIntegrationEngine.ts',
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
  const {
    createAnonymousAuthSession,
    createGoogleSignInPath,
    isAuthenticatedSession,
    normalizeAuthReturnTo,
    parseAuthSession,
  } = await vite.ssrLoadModule(
    '/src/services/authEngine.ts',
  )
  const {
    ACCOUNT_SYNC_METADATA_STORAGE_KEY,
    chooseInitialAccountSyncStrategy,
    classifyAccountStorageKey,
    resolveLatestAccountSyncRecord,
  } = await vite.ssrLoadModule(
    '/src/services/accountSyncEngine.ts',
  )
  const {
    AI_TRIAL_DURATION_DAYS,
    canGenerateMealPlan,
    canGenerateRecipe,
    canUseAI,
    createInitialAiAccessUsage,
    createTrialAiAccessUsage,
    getRemainingTrialDays,
    getSubscriptionStatus,
    parseAiAccessUsage,
    recordAiGeneration,
    resolveAiAccessUsage,
  } = await vite.ssrLoadModule(
    '/src/services/aiAccessEngine.ts',
  )
  const {
    AI_ACCESS_STORAGE_KEY,
    createLocalAiAccessService,
    initializeAiAccessUsage,
  } = await vite.ssrLoadModule(
    '/src/services/aiAccessStorage.ts',
  )
  const {
    createServerEntitlement,
    recordServerAiGeneration,
    resolveServerEntitlement,
    startTrialAfterGoogleLogin,
  } = await vite.ssrLoadModule(
    '/src/server/entitlementEngine.ts',
  )
  const {
    SERVER_SESSION_COOKIE_NAME,
    SERVER_SESSION_DURATION_MS,
    SERVER_SESSION_ROTATION_MS,
    createExpiredSessionCookie,
    createServerSession,
    createSessionCookie,
    hashSessionToken,
    isServerSessionActive,
    readSessionToken,
    shouldRotateServerSession,
  } = await vite.ssrLoadModule(
    '/src/server/sessionEngine.ts',
  )
  const {
    establishVerifiedGoogleSession,
    handleAuthLogin,
  } = await vite.ssrLoadModule(
    '/src/server/serverApiEngine.ts',
  )
  const { handleAuthLogout } =
    await vite.ssrLoadModule('/api/auth/logout.ts')
  const { handleAuthSession } =
    await vite.ssrLoadModule('/api/auth/session.ts')
  const { handleAccountSync } =
    await vite.ssrLoadModule('/api/account/sync.ts')
  const { handleEntitlement } =
    await vite.ssrLoadModule('/api/entitlement.ts')
  const {
    handleAdminRoute,
    resolveAdminApiAction,
  } = await vite.ssrLoadModule('/api/admin.ts')
  const {
    constantTimeEqual,
    createOAuthTransaction,
    createPkceCodeChallenge,
    openOAuthTransaction,
    sealOAuthTransaction,
  } = await vite.ssrLoadModule(
    '/src/server/oauthStateEngine.ts',
  )
  const {
    createGoogleAuthorizationUrl,
    exchangeGoogleAuthorizationCode,
    parseGoogleOAuthConfig,
  } = await vite.ssrLoadModule(
    '/src/server/googleOAuthEngine.ts',
  )
  const {
    clearGoogleJwksCacheForTests,
    verifyGoogleIdToken,
  } = await vite.ssrLoadModule(
    '/src/server/googleIdTokenEngine.ts',
  )
  const { handleGoogleAuthRoute } =
    await vite.ssrLoadModule(
      '/src/server/googleAuthApiEngine.ts',
    )
  const {
    applyVerifiedPurchaseToEntitlement,
    createAiCacheKey,
    createAiUsageEvent,
    estimateAiCostUsd,
    isPremiumBillingState,
    parseGooglePlaySubscription,
    reconcileGooglePlayEntitlement,
  } = await vite.ssrLoadModule(
    '/src/server/businessEngine.ts',
  )
  const {
    parseBillingRestoreRequest,
    parseBillingVerificationRequest,
    parseGooglePlayBillingConfig,
    verifyGooglePlaySubscription,
  } = await vite.ssrLoadModule(
    '/src/server/googlePlayBillingEngine.ts',
  )
  const {
    applyAccountSyncSnapshot,
    captureAccountSyncSnapshot,
    restoreAccountStorageFromServer,
    syncAccountStorage,
  } = await vite.ssrLoadModule(
    '/src/services/accountSyncClient.ts',
  )
  const {
    ACCOUNT_SYNC_DEBOUNCE_MS,
    ACCOUNT_SYNC_MUTATION_EVENTS,
    createAccountSyncScheduler,
  } = await vite.ssrLoadModule(
    '/src/services/accountSyncScheduler.ts',
  )
  const {
    addRecordDeletionTombstones,
    mergeAccountSyncSnapshots,
    parseAccountSyncSnapshot,
  } = await vite.ssrLoadModule(
    '/src/services/accountSnapshotEngine.ts',
  )
  const {
    resetAuthSessionCache,
    restoreAuthSession,
  } = await vite.ssrLoadModule(
    '/src/services/authClient.ts',
  )
  const {
    deactivateAccountStorage,
    getAccountStorageNamespaceState,
    persistCurrentAccountStorage,
    prepareAccountStorageForIdentity,
  } = await vite.ssrLoadModule(
    '/src/services/accountStorageNamespace.ts',
  )

  const createAccountSyncTestStorage = (
    initialEntries = [],
  ) => {
    const values = new Map(initialEntries)

    return {
      values,
      storage: {
        get length() {
          return values.size
        },
        key(index) {
          return [...values.keys()][index] ?? null
        },
        getItem(key) {
          return values.get(key) ?? null
        },
        setItem(key, value) {
          values.set(key, value)
        },
        removeItem(key) {
          values.delete(key)
        },
      },
    }
  }

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
    'Inventory: 목록은 재료명과 정확한 저장 수량을 구분해 표시',
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
      assert.equal(formatInventoryQuantity(0.25), '0.25')
      assert.match(
        inventoryPageSource,
        /formatInventoryQuantity\(item\.quantity\)/,
      )
      assert.match(
        inventoryPageSource,
        /inventory-item__quantity ui-number/,
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
    'S6.0 Inventory: 임의 소수를 유한한 양수로 저장하고 그대로 복원',
    () => {
      const inventoryItems = [
        {
          id: 'fractional-cabbage',
          name: '양배추',
          quantity: 0.25,
          unit: '통',
          location: 'fridge',
          createdAt: '2026-08-03T00:00:00.000Z',
          updatedAt: '2026-08-03T00:00:00.000Z',
        },
        {
          id: 'fractional-tofu',
          name: '두부',
          quantity: 0.5,
          unit: '모',
          location: 'fridge',
          createdAt: '2026-08-03T00:00:00.000Z',
          updatedAt: '2026-08-03T00:00:00.000Z',
        },
      ]
      const restored = parseStoredInventoryItems(
        serializeInventoryItems(inventoryItems),
      )

      assert.equal(restored[0].quantity, 0.25)
      assert.equal(restored[1].quantity, 0.5)
      assert.equal(parseInventoryQuantity('0.3'), 0.3)
      assert.equal(parseInventoryQuantity('1.75'), 1.75)
      assert.equal(parseInventoryQuantity(''), null)
      assert.equal(parseInventoryQuantity('0'), null)
      assert.equal(parseInventoryQuantity('-0.5'), null)
      assert.equal(parseInventoryQuantity('NaN'), null)
      assert.equal(parseInventoryQuantity('Infinity'), null)
      assert.equal(isValidInventoryQuantity(0.25), true)
      assert.equal(isValidInventoryQuantity(Infinity), false)

      const inventoryPage = readFileSync(
        'src/pages/InventoryPage.tsx',
        'utf8',
      )

      assert.match(inventoryPage, /step="any"/)
      assert.match(inventoryPage, /inputMode="decimal"/)
      assert.doesNotMatch(inventoryPage, /step="0\.1"/)
    },
  )

  await check(
    'S6.0 Inventory: 소수 재고를 AI·Recipe·Shopping·Planner에서 손실 없이 계산',
    () => {
      const inventoryItems = [
        {
          id: 'fractional-cabbage',
          name: '양배추',
          quantity: 0.25,
          unit: '통',
          location: 'fridge',
          createdAt: '2026-08-03T00:00:00.000Z',
          updatedAt: '2026-08-03T00:00:00.000Z',
        },
      ]
      const recipeIngredient = {
        id: 'recipe-cabbage',
        name: '양배추',
        quantity: 1,
        unit: '통',
      }
      const validation =
        validateAiRecipeRecommendationRequest({
          inventoryItems: [
            {
              name: '양배추',
              quantity: 0.25,
              unit: '통',
            },
          ],
          servings: 2,
        })

      assert.equal(validation.ok, true)
      assert.equal(
        validation.ok
          ? validation.data.inventoryItems[0].quantity
          : null,
        0.25,
      )
      assert.equal(
        calculateMissingIngredients(
          [recipeIngredient],
          inventoryItems,
        )[0].quantity,
        0.75,
      )

      const plannerShopping =
        createMealPlanShoppingIngredients(
          [
            {
              id: 'fractional-plan',
              date: '2026-08-03',
              type: 'dinner',
              status: 'planned',
              name: '양배추 요리',
              recipeId: 'fractional-recipe',
              servings: 2,
              createdAt: '2026-08-03T00:00:00.000Z',
              updatedAt: '2026-08-03T00:00:00.000Z',
            },
          ],
          [
            {
              id: 'fractional-recipe',
              name: '양배추 요리',
              servings: 2,
              ingredients: [recipeIngredient],
            },
          ],
          inventoryItems,
          '2026-08-03',
          'today',
        )

      assert.equal(
        plannerShopping.ingredients[0].quantity,
        0.75,
      )
    },
  )

  await check(
    'S6.0 Account Sync: 소수 재고 snapshot을 다른 저장소에 그대로 복원',
    () => {
      const value = serializeInventoryItems([
        {
          id: 'sync-cabbage',
          name: '양배추',
          quantity: 0.25,
          unit: '통',
          location: 'fridge',
          createdAt: '2026-08-03T00:00:00.000Z',
          updatedAt: '2026-08-03T00:00:00.000Z',
        },
      ])
      const sourceValues = new Map([
        ['homeos.inventory', value],
      ])
      const targetValues = new Map()
      const createStorage = (values) => ({
        get length() {
          return values.size
        },
        key(index) {
          return [...values.keys()][index] ?? null
        },
        getItem(key) {
          return values.get(key) ?? null
        },
        setItem(key, nextValue) {
          values.set(key, nextValue)
        },
        removeItem(key) {
          values.delete(key)
        },
      })
      const snapshot = captureAccountSyncSnapshot(
        createStorage(sourceValues),
        '2026-08-03T01:00:00.000Z',
      )

      assert.equal(
        applyAccountSyncSnapshot(
          createStorage(targetValues),
          snapshot,
        ),
        true,
      )
      assert.equal(
        parseStoredInventoryItems(
          targetValues.get('homeos.inventory'),
        )[0].quantity,
        0.25,
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
      const privacy = readNavigationState(
        null,
        '',
        '/privacy',
      )
      const terms = readNavigationState(
        null,
        '',
        '/terms/',
      )

      assert.equal(restored.recipeId, 'kimchi-stew')
      assert.equal(direct.page, 'recipes')
      assert.equal(direct.recipeId, 'curry')
      assert.equal(
        inventoryRecommendation
          .showInventoryRecommendations,
        true,
      )
      assert.equal(privacy.page, 'privacy')
      assert.equal(terms.page, 'terms')
      assert.equal(
        createNavigationUrl(
          privacy,
          'https://example.com/?page=recipes',
        ),
        '/privacy',
      )
      assert.equal(
        createNavigationUrl(
          terms,
          'https://example.com/privacy',
        ),
        '/terms',
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
    'Sprint S4.1: compact AI 응답을 기존 Recipe 계약으로 손실 없이 복원',
    () => {
      const recommendation = {
        title: '두부 김치찌개',
        summary: '김치와 두부를 활용한 따뜻한 찌개예요.',
        servings: 2,
        estimatedMinutes: 30,
        ...createTestAiDetails(['김치', '두부'], 30),
        ingredients: [
          {
            name: '김치',
            quantity: 0.5,
            unit: '포기',
            available: true,
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
        ],
        missingIngredients: [],
      }
      const full = { recommendations: [recommendation] }
      const compact =
        compactAiRecommendationOutputForTests(full)
      const expanded =
        expandCompactAiRecommendationOutput(compact)
      const parsedCompact =
        parseCompactAiRecommendationText(
          JSON.stringify(compact),
        )

      assert.deepEqual(expanded, full)
      assert.deepEqual(parsedCompact, full)
      assert.equal(
        parseAiRecipeRecommendationOutput(expanded)?.[0]
          .title,
        '두부 김치찌개',
      )
      assert.ok(
        JSON.stringify(compact).length <
          JSON.stringify(full).length * 0.75,
      )
      assert.equal(
        parseCompactAiRecommendationText('{"r":['),
        null,
      )
      assert.equal(
        parseAiRecipeRecommendationOutput(
          parseCompactAiRecommendationText(
            JSON.stringify({ r: [{ n: '불완전' }] }),
          ),
        ),
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
    'R1.2 AI units: 김치 포기와 두부 모를 g 기준으로 환산해 보유·부족을 동일 판정',
    () => {
      const ingredientNames = ['배추김치', '두부']
      const recommendation = {
        title: '두부 김치찌개',
        summary: '김치와 두부를 활용한 찌개',
        servings: 2,
        estimatedMinutes: 30,
        ingredients: [
          {
            name: '배추김치',
            quantity: 300,
            unit: 'g',
            available: false,
            group: 'main',
            note: null,
            optional: false,
            substitute: [],
          },
          {
            name: '두부',
            quantity: 300,
            unit: 'g',
            available: false,
            group: 'main',
            note: null,
            optional: false,
            substitute: [],
          },
        ],
        missingIngredients: [],
        ...createTestAiDetails(ingredientNames, 30),
      }
      const inventoryItems = [
        { name: '김치', quantity: 0.5, unit: '포기' },
        { name: '두부', quantity: 1, unit: '모' },
      ]
      const [normalized] = normalizeAiRecipeRecommendations(
        [recommendation],
        { inventoryItems, servings: 2 },
      )
      const recalculated =
        recalculateAiRecommendationForInventory(
          normalized,
          inventoryItems,
        )

      assert.equal(
        getAiInventoryQuantity(
          inventoryItems,
          '배추김치',
          'g',
        ),
        1200,
      )
      assert.equal(
        getAiInventoryQuantity(
          [{ name: '묵은지', quantity: 0.25, unit: '포기' }],
          '김치',
          'g',
        ),
        600,
      )
      assert.equal(
        getAiInventoryQuantity(
          inventoryItems,
          '두부',
          'g',
        ),
        300,
      )
      assert.deepEqual(
        normalized.ingredients.map(
          (ingredient) => ingredient.available,
        ),
        [true, true],
      )
      assert.deepEqual(normalized.missingIngredients, [])
      assert.deepEqual(recalculated.missingIngredients, [])
    },
  )

  await check(
    'R1.2 AI units: 여러 재고 합산과 환산 불가 단위의 안전한 exact fallback',
    () => {
      assert.equal(
        getAiInventoryQuantity(
          [
            { name: '두부', quantity: 0.5, unit: '모' },
            { name: '두부', quantity: 150, unit: 'g' },
          ],
          '두부',
          'g',
        ),
        300,
      )
      assert.equal(
        getAiInventoryQuantity(
          [
            {
              name: '특수 재료',
              quantity: 2,
              unit: '묶음',
            },
          ],
          '특수 재료',
          '묶음',
        ),
        2,
      )
      assert.equal(
        getAiInventoryQuantity(
          [
            {
              name: '특수 재료',
              quantity: 2,
              unit: '묶음',
            },
          ],
          '특수 재료',
          'g',
        ),
        0,
      )
    },
  )

  await check(
    'S5.1: 물만 부족 재료에서 제외하고 조미료와 문구는 보존',
    async () => {
      assert.equal(isWaterIngredientName('물'), true)
      assert.equal(isWaterIngredientName(' 생 수 '), true)
      assert.equal(isWaterIngredientName('식수'), true)
      assert.equal(isWaterIngredientName('소금'), false)
      assert.equal(isWaterIngredientName('후추'), false)
      assert.equal(isWaterIngredientName('설탕'), false)
      assert.equal(isWaterIngredientName('간장'), false)
      assert.equal(isWaterIngredientName('식용유'), false)
      assert.equal(isWaterIngredientName('참기름'), false)
      assert.equal(isWaterIngredientName('고추가루'), false)
      assert.deepEqual(
        excludeWaterIngredients([
          { name: '물' },
          { name: '후추' },
          { name: '생수' },
        ]),
        [{ name: '후추' }],
      )

      const ingredientNames = [
        '감자',
        '물',
        '후추',
        '소금',
        '설탕',
      ]
      const recommendation = {
        title: '감자양파 계란국',
        summary: '감자와 양파를 끓인 뒤 게란을 풀어요.',
        servings: 2,
        estimatedMinutes: 25,
        ingredients: ingredientNames.map((name) => ({
          name,
          quantity: name === '물' ? 600 : 1,
          unit: name === '물' ? 'ml' : name === '감자' ? '개' : 'g',
          available: false,
          group: name === '감자' ? 'main' : 'seasoning',
          note: null,
          optional: false,
          substitute: [],
        })),
        missingIngredients: [],
        ...createTestAiDetails(ingredientNames, 25),
      }
      recommendation.steps[0].instruction =
        '게란을 잘 풀어요.'

      const [normalized] =
        normalizeAiRecipeRecommendations(
          [recommendation],
          {
            inventoryItems: [
              {
                name: '감자',
                quantity: 1,
                unit: '개',
              },
            ],
            servings: 2,
          },
        )

      assert.equal(normalized.title, '감자 양파 계란국')
      assert.match(normalized.summary, /계란/)
      assert.doesNotMatch(normalized.summary, /게란/)
      assert.match(normalized.steps[0].instruction, /계란/)
      assert.deepEqual(
        normalized.missingIngredients.map(
          (ingredient) => ingredient.name,
        ),
        ['후추', '소금', '설탕'],
      )
      assert.equal(
        recalculateAiRecommendationForInventory(
          normalized,
          [],
        ).missingIngredients.some((ingredient) =>
          isWaterIngredientName(ingredient.name),
        ),
        false,
      )
      assert.equal(
        polishAiMenuTitle('감자양파 계란국'),
        '감자 양파 계란국',
      )
      assert.equal(
        correctKnownAiText('게란을 풀어요.'),
        '계란을 풀어요.',
      )
      const aiCardSource = readFileSync(
        'src/blocks/RecipeRecommendationBlock.tsx',
        'utf8',
      )
      assert.match(
        aiCardSource,
        /isWaterIngredientName\(\s*ingredient\.name/,
      )
      assert.match(aiCardSource, /장보기 제외/)

      const originalWindow = globalThis.window
      globalThis.window = {
        setTimeout,
        clearTimeout,
      }

      try {
        const clientResult =
          await requestAiRecipeRecommendations(
            {
              inventoryItems: [
                {
                  name: 'S5.1 감자',
                  quantity: 1,
                  unit: '개',
                },
              ],
              servings: 2,
            },
            async () =>
              Response.json({
                recommendations: [recommendation],
                meta: { maxRecommendations: 3 },
              }),
          )

        assert.equal(
          clientResult.recommendations[0]
            .missingIngredients.some((ingredient) =>
              isWaterIngredientName(ingredient.name),
            ),
          false,
        )
      } finally {
        globalThis.window = originalWindow
      }
    },
  )

  await check(
    'S5.2: Case 5 카드 부족 재료와 장보기를 일치시키고 후추 계열을 중복 방지',
    () => {
      assert.equal(
        normalizeShoppingIngredientMatchName(
          '후춧가루',
        ),
        '후추',
      )
      assert.equal(
        normalizeShoppingIngredientMatchName(
          ' 후추 가루 ',
        ),
        '후추',
      )
      assert.equal(
        normalizeShoppingIngredientDisplayName(
          '후춧가루',
        ),
        '후추',
      )

      const ingredientDefinitions = [
        ['닭가슴살', 300, 'g', 'main'],
        ['브로콜리', 1, '송이', 'main'],
        ['버섯', 200, 'g', 'main'],
        ['간장', 30, 'ml', 'seasoning'],
        ['다진 마늘', 10, 'g', 'seasoning'],
        ['식용유', 15, 'ml', 'seasoning'],
        ['소금', 2, 'g', 'seasoning'],
        ['후추', 1, 'g', 'seasoning'],
        ['후춧가루', 1, 'g', 'seasoning'],
      ]
      const ingredientNames =
        ingredientDefinitions.map(([name]) => name)
      const recommendation = {
        title: '닭가슴살 브로콜리 버섯 간장북음',
        summary: '닭가슴살과 채소를 간장 양념에 북은 한 끼',
        servings: 2,
        estimatedMinutes: 30,
        ingredients: ingredientDefinitions.map(
          ([name, quantity, unit, group]) => ({
            name,
            quantity,
            unit,
            available: false,
            group,
            note: null,
            optional: false,
            substitute: [],
          }),
        ),
        missingIngredients: [],
        ...createTestAiDetails(ingredientNames, 30),
      }
      const [normalized] =
        normalizeAiRecipeRecommendations(
          [recommendation],
          {
            inventoryItems: [
              { name: '닭가슴살', quantity: 300, unit: 'g' },
              { name: '브로콜리', quantity: 1, unit: '송이' },
              { name: '버섯', quantity: 200, unit: 'g' },
            ],
            servings: 2,
          },
        )
      const cardMissingNames =
        normalized.missingIngredients.map(
          (ingredient) => ingredient.name,
        )
      const shoppingItems =
        createManualIngredientShoppingItems(
          normalized.missingIngredients.map(
            (ingredient, index) => ({
              id: `s5-2-${index}`,
              ...ingredient,
            }),
          ),
        )
      const shoppingNames = shoppingItems.map(
        (item) => item.name,
      )

      assert.deepEqual(cardMissingNames, [
        '간장',
        '다진 마늘',
        '식용유',
        '소금',
        '후추',
      ])
      assert.deepEqual(shoppingNames, cardMissingNames)
      const pepperShoppingItems =
        createManualIngredientShoppingItems([
          {
            id: 'pepper-1',
            name: '후추',
            quantity: 1,
            unit: 'g',
          },
          {
            id: 'pepper-2',
            name: '후춧가루',
            quantity: 1,
            unit: 'g',
          },
        ])
      assert.deepEqual(
        pepperShoppingItems.map((item) => item.name),
        ['후추'],
      )
      const coalescedLegacyPepper =
        coalesceStoredShoppingIngredientAliases([
          {
            id: 'legacy-pepper',
            name: '후추',
            quantity: 1,
            unit: 'g',
            completed: false,
            source: 'manual',
            sourceKind: 'manual',
            purchaseStatus: 'planned',
            createdAt: '2026-08-03T00:00:00.000Z',
            updatedAt: '2026-08-03T00:00:00.000Z',
          },
          {
            id: 'legacy-pepper-powder',
            name: '후춧가루',
            quantity: 1,
            unit: 'g',
            completed: false,
            source: 'manual',
            sourceKind: 'manual',
            purchaseStatus: 'planned',
            createdAt: '2026-08-03T00:00:01.000Z',
            updatedAt: '2026-08-03T00:00:01.000Z',
          },
        ])
      assert.equal(coalescedLegacyPepper.length, 1)
      assert.equal(coalescedLegacyPepper[0].name, '후추')
      assert.equal(coalescedLegacyPepper[0].quantity, 1)

      const protectedPurchasedPepper =
        coalesceStoredShoppingIngredientAliases([
          {
            ...coalescedLegacyPepper[0],
            id: 'purchased-pepper',
            purchaseStatus: 'completed',
            completed: true,
            purchasedTotalQuantity: 1,
          },
          {
            ...coalescedLegacyPepper[0],
            id: 'planned-pepper-powder',
            name: '후춧가루',
          },
        ])
      assert.equal(protectedPurchasedPepper.length, 2)
      assert.equal(
        normalized.ingredients.filter(
          (ingredient) =>
            normalizeShoppingIngredientMatchName(
              ingredient.name,
            ) === '후추',
        ).length,
        1,
      )
      assert.equal(
        shoppingNames.includes('후춧가루'),
        false,
      )

      const recommendationBlockSource = readFileSync(
        'src/blocks/RecipeRecommendationBlock.tsx',
        'utf8',
      )
      assert.match(
        recommendationBlockSource,
        /setAiRecommendations\(\(current\)/,
      )
      assert.match(
        recommendationBlockSource,
        /currentRecommendation\.missingIngredients\.map/,
      )
      assert.match(
        recommendationBlockSource,
        /ai-recommendation:\$\{createAiRecommendationFingerprint\(currentRecommendation\)\}/,
      )
      assert.match(
        recommendationBlockSource,
        /const addedItemCount = addMealItems\(/,
      )
      assert.match(
        recommendationBlockSource,
        /addedIngredientNames/,
      )
    },
  )

  await check(
    'AI recipe persistence: full recipe conversion, fingerprint deduplication, and user edit protection',
    () => {
      const recommendation = {
        title: '두부 달걀 볶음',
        summary: '냉장고 재료로 빠르게 만드는 한 끼',
        servings: 2,
        estimatedMinutes: 25,
        ingredients: [
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
        ],
        missingIngredients: [
          { name: '계란', quantity: 2, unit: '개' },
        ],
        ...createTestAiDetails(['계란', '두부'], 25),
      }
      const created = convertAiRecommendationToRecipe(
        recommendation,
        '2026-08-02T00:00:00.000Z',
      )

      assert.equal(created.source, 'ai')
      assert.equal(
        created.fingerprint,
        createAiRecommendationFingerprint(recommendation),
      )
      assert.equal(created.steps.length, 8)
      assert.equal(
        created.ingredientGroups.mainIngredients.length,
        2,
      )
      assert.equal(parseStoredAiRecipes([created]).length, 1)

      const matchingExistingRecipe = {
        ...created,
        id: 'existing-custom-recipe',
        source: undefined,
        fingerprint: undefined,
      }
      assert.equal(
        findMatchingRecipeForAiRecommendation(
          recommendation,
          [matchingExistingRecipe],
        ).id,
        matchingExistingRecipe.id,
      )

      const userEditedRecipe = {
        ...created,
        description: '사용자가 수정한 설명',
      }
      const duplicateResult = resolveAiRecipePersistence(
        recommendation,
        [userEditedRecipe],
      )

      assert.equal(duplicateResult.created, false)
      assert.equal(
        duplicateResult.recipe.description,
        '사용자가 수정한 설명',
      )

      const storedValues = new Map()
      const storage = {
        getItem(key) {
          return storedValues.get(key) ?? null
        },
        setItem(key, value) {
          storedValues.set(key, value)
        },
      }
      const firstSave = persistAiRecommendationToStorage(
        storage,
        recommendation,
        [],
        '2026-08-02T00:00:00.000Z',
      )
      const secondSave = persistAiRecommendationToStorage(
        storage,
        recommendation,
        firstSave.storedRecipes,
        '2026-08-02T01:00:00.000Z',
      )

      assert.equal(firstSave.created, true)
      assert.equal(secondSave.created, false)
      assert.equal(secondSave.storedRecipes.length, 1)
    },
  )

  await check(
    'AI recipe integration: recipeId-first Planner link and latest inventory shopping recalculation',
    () => {
      const recommendation = {
        title: '두부 달걀 볶음',
        summary: '냉장고 재료로 빠르게 만드는 한 끼',
        servings: 2,
        estimatedMinutes: 25,
        ingredients: [
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
            available: false,
            group: 'main',
            note: null,
            optional: false,
            substitute: [],
          },
        ],
        missingIngredients: [
          { name: '계란', quantity: 2, unit: '개' },
          { name: '두부', quantity: 1, unit: '모' },
        ],
        ...createTestAiDetails(['계란', '두부'], 25),
      }
      const savedRecipe =
        convertAiRecommendationToRecipe(recommendation)
      const recalculated =
        recalculateAiRecommendationForInventory(
          recommendation,
          [
            { name: '달걀', quantity: 1, unit: '개' },
            { name: '두부', quantity: 1, unit: '모' },
          ],
        )

      assert.deepEqual(recalculated.missingIngredients, [
        { name: '계란', quantity: 1, unit: '개' },
      ])

      const plannedMeal = {
        id: '2026-08-02-dinner',
        date: '2026-08-02',
        type: 'dinner',
        status: 'planned',
        name: savedRecipe.name,
        recipeId: savedRecipe.id,
        servings: 2,
        source: 'manual',
        createdAt: '2026-08-02T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      }
      const sameNameWrongRecipe = {
        id: 'same-name-wrong-recipe',
        name: savedRecipe.name,
        ingredients: [
          {
            id: 'wrong-ingredient',
            name: '설탕',
            quantity: 100,
            unit: 'g',
          },
        ],
      }
      const change = createPlannerShoppingChange(
        [plannedMeal],
        {
          date: plannedMeal.date,
          type: plannedMeal.type,
          name: plannedMeal.name,
          recipeId: plannedMeal.recipeId,
        },
        [sameNameWrongRecipe, savedRecipe],
      )

      assert.equal(change.sourceRecipeId, savedRecipe.id)
      assert.deepEqual(
        change.ingredients.map((ingredient) => ingredient.name),
        ['계란', '두부'],
      )
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
    'AI endpoint: server timeout aborts before the Vercel limit',
    async () => {
      const originalFetch = globalThis.fetch
      const originalSetTimeout = globalThis.setTimeout
      const originalClearTimeout = globalThis.clearTimeout
      const observedDelays = []
      let fetchCount = 0

      globalThis.setTimeout = (callback, delay) => {
        observedDelays.push(delay)
        queueMicrotask(callback)
        return 1
      }
      globalThis.clearTimeout = () => {}
      globalThis.fetch = async (_url, init) => {
        fetchCount += 1

        return new Promise((_, reject) => {
          const rejectAsAborted = () =>
            reject(
              new DOMException(
                'The operation was aborted.',
                'AbortError',
              ),
            )

          if (init?.signal?.aborted) {
            rejectAsAborted()
            return
          }

          init?.signal?.addEventListener(
            'abort',
            rejectAsAborted,
            { once: true },
          )
        })
      }

      try {
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
                      name: 'timeout test ingredient',
                      quantity: 1,
                      unit: 'item',
                    },
                  ],
                  servings: 2,
                }),
              },
            ),
            {
              OPENAI_API_KEY: 'sk-test-not-a-real-key',
              OPENAI_MODEL: 'gpt-5.6-luna',
              NODE_ENV: 'production',
            },
          )
        const body = await response.json()

        assert.equal(response.status, 504)
        assert.equal(body.code, 'AI_TIMEOUT')
        assert.deepEqual(observedDelays, [20_000])
        assert.equal(fetchCount, 2)
      } finally {
        globalThis.fetch = originalFetch
        globalThis.setTimeout = originalSetTimeout
        globalThis.clearTimeout = originalClearTimeout
      }
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
    'Sprint S1 QA: 동일 AI 추천은 진행 중·30초 캐시에서 한 번만 호출',
    async () => {
      const originalWindow = globalThis.window
      globalThis.window = {
        setTimeout,
        clearTimeout,
      }
      let fetchCount = 0
      const request = {
        inventoryItems: [
          {
            name: 'S1 중복 방지 계란',
            quantity: 2,
            unit: '개',
          },
        ],
        servings: 2,
      }
      const fetcher = async (_url, options) => {
        fetchCount += 1
        return handleAiRecipeRecommendation(
          new Request(
            'http://localhost/api/ai/recipe-recommendation',
            options,
          ),
          {
            HOMEOS_AI_MOCK: 'true',
            NODE_ENV: 'development',
          },
        )
      }

      try {
        const [first, second] = await Promise.all([
          requestAiRecipeRecommendations(
            request,
            fetcher,
          ),
          requestAiRecipeRecommendations(
            request,
            fetcher,
          ),
        ])
        const cached =
          await requestAiRecipeRecommendations(
            request,
            fetcher,
          )

        assert.equal(fetchCount, 1)
        assert.equal(first.recommendations.length, 3)
        assert.deepEqual(second, first)
        assert.deepEqual(cached, first)
      } finally {
        globalThis.window = originalWindow
      }
    },
  )

  await check(
    'Sprint S1 QA: 오프라인 연결 실패를 사용자 오류로 변환하고 재호출 상태를 정리',
    async () => {
      const originalWindow = globalThis.window
      globalThis.window = {
        setTimeout,
        clearTimeout,
      }
      const request = {
        inventoryItems: [
          {
            name: 'S1 오프라인 두부',
            quantity: 1,
            unit: '모',
          },
        ],
        servings: 2,
      }

      try {
        await assert.rejects(
          requestAiRecipeRecommendations(
            request,
            async () => {
              throw new TypeError('offline')
            },
          ),
          (error) =>
            error?.code === 'AI_REQUEST_FAILED',
        )

        const recovered =
          await requestAiRecipeRecommendations(
            request,
            async (_url, options) =>
              handleAiRecipeRecommendation(
                new Request(
                  'http://localhost/api/ai/recipe-recommendation',
                  options,
                ),
                {
                  HOMEOS_AI_MOCK: 'true',
                  NODE_ENV: 'development',
                },
              ),
          )

        assert.equal(
          recovered.recommendations.length,
          3,
        )
      } finally {
        globalThis.window = originalWindow
      }
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
    'S5.1 식단 장보기: 냉장고 차감 유지·물만 제외',
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
          isWaterIngredientName(ingredient.name),
        ),
        false,
      )

      const policyRecipe = {
        id: 's5-1-shopping-policy',
        name: 'S5.1 장보기 정책 테스트',
        servings: 2,
        ingredients: [
          { id: 'water', name: '물', quantity: 600, unit: 'ml' },
          { id: 'pepper', name: '후추', quantity: 1, unit: 'g' },
          { id: 'salt', name: '소금', quantity: 5, unit: 'g' },
          { id: 'sugar', name: '설탕', quantity: 5, unit: 'g' },
        ],
      }
      const policyPlan = {
        id: 's5-1-plan',
        date: '2026-08-01',
        type: 'dinner',
        status: 'planned',
        name: policyRecipe.name,
        recipeId: policyRecipe.id,
        servings: 2,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      }
      const policyResult =
        createMealPlanShoppingIngredients(
          [policyPlan],
          [policyRecipe],
          [],
          '2026-08-01',
          'today',
        )

      assert.deepEqual(
        policyResult.ingredients.map(
          (ingredient) => ingredient.name,
        ),
        ['후추', '소금', '설탕'],
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

  await check(
    'Auth foundation: Google sub와 내부 user id를 분리하고 세션을 안전하게 파싱',
    () => {
      const now = '2026-07-31T00:00:00.000Z'
      const session = parseAuthSession({
        status: 'authenticated',
        deviceId: 'device-internal-id',
        expiresAt: '2026-08-01T00:00:00.000Z',
        user: {
          id: 'user-internal-id',
          provider: 'google',
          providerSubject: 'google-subject-id',
          email: 'user@example.com',
          emailVerified: true,
          displayName: '오늘식탁 사용자',
          createdAt: now,
          updatedAt: now,
        },
      })

      assert.equal(
        isAuthenticatedSession(session),
        true,
      )
      assert.equal(
        session.status === 'authenticated'
          ? session.user.id
          : null,
        'user-internal-id',
      )
      assert.equal(
        session.status === 'authenticated'
          ? session.user.providerSubject
          : null,
        'google-subject-id',
      )
      const apiSession = parseAuthSession({
        authenticated: true,
        deviceId: 'device-internal-id',
        expiresAt: '2026-08-01T00:00:00.000Z',
        user: {
          id: 'user-internal-id',
          provider: 'google',
          email: 'user@example.com',
          emailVerified: true,
          displayName: '오늘식탁 사용자',
          createdAt: now,
          updatedAt: now,
        },
      })
      assert.equal(
        apiSession.status,
        'authenticated',
      )
      assert.deepEqual(
        parseAuthSession({ authenticated: false }),
        createAnonymousAuthSession(),
      )
      assert.deepEqual(
        parseAuthSession({ status: 'authenticated' }),
        createAnonymousAuthSession(),
      )
    },
  )

  await check(
    'Auth foundation: 외부 return URL을 거부하고 앱 내부 로그인 경로만 생성',
    () => {
      assert.equal(
        normalizeAuthReturnTo(
          'https://example.com/redirect',
        ),
        '/',
      )
      assert.equal(
        normalizeAuthReturnTo('//example.com'),
        '/',
      )
      assert.equal(
        createGoogleSignInPath('/meal-plan'),
        '/api/auth/google/start?returnTo=%2Fmeal-plan',
      )
    },
  )

  await check(
    'Auth integration: OAuth transaction을 암호화하고 state·nonce·PKCE S256을 구성',
    async () => {
      const config = parseGoogleOAuthConfig({
        GOOGLE_OAUTH_CLIENT_ID:
          'client-id.apps.googleusercontent.com',
        GOOGLE_OAUTH_CLIENT_SECRET:
          'server-client-secret',
        GOOGLE_OAUTH_REDIRECT_URI:
          'https://today-table.test/api/auth/login',
        AUTH_COOKIE_SECRET:
          '0123456789abcdef0123456789abcdef',
      })

      assert.ok(config)

      const transaction = createOAuthTransaction(
        {
          redirectUri: config.redirectUri,
          returnTo: '/settings',
        },
        new Date(
          '2026-07-31T00:00:00.000Z',
        ),
      )
      const sealed = await sealOAuthTransaction(
        transaction,
        config.cookieSecret,
      )
      const opened = await openOAuthTransaction(
        sealed,
        config.cookieSecret,
        new Date(
          '2026-07-31T00:05:00.000Z',
        ),
      )
      const challenge =
        await createPkceCodeChallenge(
          transaction.codeVerifier,
        )
      const authorizationUrl = new URL(
        await createGoogleAuthorizationUrl(
          config,
          transaction,
        ),
      )

      assert.deepEqual(opened, transaction)
      assert.equal(
        constantTimeEqual(
          transaction.state,
          transaction.state,
        ),
        true,
      )
      assert.equal(
        constantTimeEqual(
          transaction.state,
          `${transaction.state}x`,
        ),
        false,
      )
      assert.equal(
        authorizationUrl.searchParams.get(
          'response_type',
        ),
        'code',
      )
      assert.equal(
        authorizationUrl.searchParams.get(
          'state',
        ),
        transaction.state,
      )
      assert.equal(
        authorizationUrl.searchParams.get(
          'nonce',
        ),
        transaction.nonce,
      )
      assert.equal(
        authorizationUrl.searchParams.get(
          'code_challenge',
        ),
        challenge,
      )
      assert.equal(
        authorizationUrl.searchParams.get(
          'code_challenge_method',
        ),
        'S256',
      )
      assert.equal(
        await openOAuthTransaction(
          `${sealed}tampered`,
          config.cookieSecret,
        ),
        null,
      )
      const tokenResponse =
        await exchangeGoogleAuthorizationCode({
          code: 'authorization-code',
          transaction,
          config,
          fetcher: async (url, request) => {
            assert.equal(
              String(url),
              'https://oauth2.googleapis.com/token',
            )
            const body = new URLSearchParams(
              request.body,
            )
            assert.equal(
              body.get('code_verifier'),
              transaction.codeVerifier,
            )
            assert.equal(
              body.get('redirect_uri'),
              config.redirectUri,
            )

            return Response.json({
              id_token: 'header.payload.signature',
            })
          },
        })

      assert.equal(
        tokenResponse.idToken,
        'header.payload.signature',
      )
    },
  )

  await check(
    'Auth integration: Google JWK 서명과 iss·aud·exp·nonce·email_verified를 검증',
    async () => {
      clearGoogleJwksCacheForTests()
      const keyPair =
        await crypto.subtle.generateKey(
          {
            name: 'RSASSA-PKCS1-v1_5',
            modulusLength: 2048,
            publicExponent: new Uint8Array([
              1, 0, 1,
            ]),
            hash: 'SHA-256',
          },
          true,
          ['sign', 'verify'],
        )
      const publicJwk =
        await crypto.subtle.exportKey(
          'jwk',
          keyPair.publicKey,
        )
      const encodePart = (value) =>
        Buffer.from(
          JSON.stringify(value),
        ).toString('base64url')
      const header = encodePart({
        alg: 'RS256',
        kid: 'google-test-key',
        typ: 'JWT',
      })
      const claims = encodePart({
        iss: 'https://accounts.google.com',
        sub: 'google-subject-123',
        aud: 'client-id.apps.googleusercontent.com',
        exp: 1785463200,
        iat: 1785456000,
        nonce: 'expected-nonce',
        email: 'tester@example.com',
        email_verified: true,
        name: '테스트 사용자',
      })
      const signingInput = `${header}.${claims}`
      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        keyPair.privateKey,
        new TextEncoder().encode(signingInput),
      )
      const idToken = `${signingInput}.${Buffer.from(
        signature,
      ).toString('base64url')}`
      const jwksFetcher = async () =>
        new Response(
          JSON.stringify({
            keys: [
              {
                ...publicJwk,
                kid: 'google-test-key',
                alg: 'RS256',
                use: 'sig',
              },
            ],
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'max-age=3600',
            },
          },
        )
      const verified = await verifyGoogleIdToken(
        idToken,
        {
          clientId:
            'client-id.apps.googleusercontent.com',
          nonce: 'expected-nonce',
          now: new Date(
            '2026-07-31T00:00:00.000Z',
          ),
          fetcher: jwksFetcher,
        },
      )

      assert.equal(
        verified.identity.subject,
        'google-subject-123',
      )
      assert.equal(
        verified.identity.emailVerified,
        true,
      )
      await assert.rejects(
        verifyGoogleIdToken(idToken, {
          clientId:
            'client-id.apps.googleusercontent.com',
          nonce: 'wrong-nonce',
          now: new Date(
            '2026-07-31T00:00:00.000Z',
          ),
          fetcher: jwksFetcher,
        }),
        /GOOGLE_ID_TOKEN_CLAIMS_INVALID/,
      )
    },
  )

  await check(
    'Auth integration: login endpoint는 서버 설정 전 닫히고 설정 후 Google code flow로 이동',
    async () => {
      const unconfigured =
        await handleGoogleAuthRoute(
          new Request(
            'https://today-table.test/api/auth/login',
          ),
          {},
          null,
        )
      const configured =
        await handleGoogleAuthRoute(
          new Request(
            'https://today-table.test/api/auth/login?returnTo=%2Fsettings',
          ),
          {
            GOOGLE_OAUTH_CLIENT_ID:
              'client-id.apps.googleusercontent.com',
            GOOGLE_OAUTH_CLIENT_SECRET:
              'server-client-secret',
            GOOGLE_OAUTH_REDIRECT_URI:
              'https://today-table.test/api/auth/login',
            AUTH_COOKIE_SECRET:
              '0123456789abcdef0123456789abcdef',
          },
          {},
          {
            now: () =>
              new Date(
                '2026-07-31T00:00:00.000Z',
              ),
          },
        )
      const location = new URL(
        configured.headers.get('location'),
      )
      const setCookie =
        configured.headers.get('set-cookie')

      assert.equal(unconfigured.status, 503)
      assert.equal(configured.status, 302)
      assert.equal(
        location.origin,
        'https://accounts.google.com',
      )
      assert.equal(
        location.searchParams.get(
          'redirect_uri',
        ),
        'https://today-table.test/api/auth/login',
      )
      assert.match(setCookie, /HttpOnly/)
      assert.match(setCookie, /Secure/)
      assert.match(setCookie, /SameSite=Lax/)
    },
  )

  await check(
    'Auth integration: sub 기준 재로그인·기기 변경·세션 복원·로그아웃에도 Trial을 재발급하지 않음',
    async () => {
      const users = new Map()
      const devices = new Map()
      const sessions = new Map()
      const entitlements = new Map()
      let idSequence = 0
      const repository = {
        async findUserById(userId) {
          return users.get(userId) ?? null
        },
        async findUserByGoogleSubject(subject) {
          return (
            [...users.values()].find(
              (user) =>
                user.googleSubject === subject,
            ) ?? null
          )
        },
        async saveUser(user) {
          const existing =
            [...users.values()].find(
              (candidate) =>
                candidate.googleSubject ===
                user.googleSubject,
            )
          const saved = existing
            ? {
                ...user,
                id: existing.id,
                createdAt: existing.createdAt,
              }
            : user
          users.set(saved.id, saved)
          return saved
        },
        async findDevice(userId, deviceKey) {
          return (
            [...devices.values()].find(
              (device) =>
                device.userId === userId &&
                device.deviceKey === deviceKey,
            ) ?? null
          )
        },
        async saveDevice(device) {
          devices.set(device.id, device)
          return device
        },
        async findSessionByTokenHash(tokenHash) {
          return (
            [...sessions.values()].find(
              (session) =>
                session.tokenHash === tokenHash,
            ) ?? null
          )
        },
        async saveSession(session) {
          sessions.set(session.id, session)
          return session
        },
        async revokeSession(sessionId, revokedAt) {
          const session = sessions.get(sessionId)

          if (session) {
            sessions.set(sessionId, {
              ...session,
              revokedAt,
            })
          }
        },
        async findEntitlement(userId) {
          return entitlements.get(userId) ?? null
        },
        async saveEntitlement(
          entitlement,
          expectedVersion,
        ) {
          const current = entitlements.get(
            entitlement.userId,
          )

          if (
            (current?.version ?? null) !==
            expectedVersion
          ) {
            throw new Error(
              'ENTITLEMENT_VERSION_CONFLICT',
            )
          }

          entitlements.set(
            entitlement.userId,
            entitlement,
          )
          return entitlement
        },
        async findAccountSnapshot() {
          return null
        },
        async saveAccountSnapshot(snapshot) {
          return snapshot
        },
      }
      const dependencies = {
        repository,
        async verifyGoogleAuthorizationCode() {
          throw new Error('not used')
        },
        now: () =>
          new Date(
            '2026-07-31T00:00:00.000Z',
          ),
        createId(prefix) {
          idSequence += 1
          return `${prefix}-${idSequence}`
        },
      }
      const identity = {
        subject: 'google-subject-123',
        email: 'tester@example.com',
        emailVerified: true,
        displayName: '테스트 사용자',
      }
      const first =
        await establishVerifiedGoogleSession(
          {
            identity,
            deviceKey:
              'device-key-aaaaaaaaaaaaaaaaaaaaa',
          },
          dependencies,
        )
      const second =
        await establishVerifiedGoogleSession(
          {
            identity,
            deviceKey:
              'device-key-bbbbbbbbbbbbbbbbbbbbb',
          },
          dependencies,
        )
      const trial = entitlements.get(
        first.user.id,
      )
      const sessionResponse =
        await handleAuthSession(
          new Request(
            'https://today-table.test/api/auth/session',
            {
              headers: {
                Cookie: `${SERVER_SESSION_COOKIE_NAME}=${second.token}`,
              },
            },
          ),
          dependencies,
        )
      const sessionPayload =
        await sessionResponse.json()
      const logoutResponse =
        await handleAuthLogout(
          new Request(
            'https://today-table.test/api/auth/logout',
            {
              method: 'POST',
              headers: {
                Cookie: `${SERVER_SESSION_COOKIE_NAME}=${second.token}`,
              },
            },
          ),
          dependencies,
        )

      assert.equal(users.size, 1)
      assert.equal(devices.size, 2)
      assert.equal(
        first.user.id,
        second.user.id,
      )
      assert.equal(trial.plan, 'TRIAL')
      assert.equal(
        trial.trialStartedAt,
        '2026-07-31T00:00:00.000Z',
      )
      assert.equal(
        trial.trialConsumedAt,
        trial.trialStartedAt,
      )
      assert.equal(sessionResponse.status, 200)
      assert.equal(
        sessionPayload.authenticated,
        true,
      )
      assert.equal(
        sessionPayload.deviceId,
        second.session.deviceId,
      )
      assert.equal(logoutResponse.status, 200)
      assert.ok(
        sessions.get(second.session.id).revokedAt,
      )
    },
  )

  await check(
    'Account sync integration: 계정 데이터만 snapshot으로 병합하고 tombstone을 적용',
    () => {
      const values = new Map([
        [
          'homeos.inventory',
          JSON.stringify([
            {
              id: 'onion',
              updatedAt:
                '2026-07-31T00:00:00.000Z',
            },
          ]),
        ],
        [
          'today-table.tutorial-settings.v1',
          '{"completed":true}',
        ],
        [
          'today-table.ai-access.v1',
          '{"plan":"PREMIUM"}',
        ],
        [
          AI_RECIPE_STORAGE_KEY,
          JSON.stringify([
            {
              id: 'ai-recipe-sync',
              updatedAt:
                '2026-07-31T00:30:00.000Z',
            },
          ]),
        ],
      ])
      const storage = {
        get length() {
          return values.size
        },
        key(index) {
          return [...values.keys()][index] ?? null
        },
        getItem(key) {
          return values.get(key) ?? null
        },
        setItem(key, value) {
          values.set(key, value)
        },
        removeItem(key) {
          values.delete(key)
        },
      }
      const local = captureAccountSyncSnapshot(
        storage,
        '2026-07-31T01:00:00.000Z',
      )
      const remote = {
        formatVersion: '1.0',
        capturedAt:
          '2026-07-30T00:00:00.000Z',
        entries: [
          {
            key: 'homeos.inventory',
            value: JSON.stringify([
              {
                id: 'potato',
                updatedAt:
                  '2026-07-30T12:00:00.000Z',
              },
            ]),
            updatedAt:
              '2026-07-30T12:00:00.000Z',
            deletedAt: null,
          },
          {
            key: 'homeos.shopping.items',
            value: '[]',
            updatedAt:
              '2026-07-30T00:00:00.000Z',
            deletedAt: null,
          },
          {
            key: 'homeos.mealPlan.items',
            value: null,
            updatedAt:
              '2026-07-29T00:00:00.000Z',
            deletedAt:
              '2026-07-31T02:00:00.000Z',
          },
        ],
      }
      const merged = mergeAccountSyncSnapshots(
        local,
        remote,
        '2026-07-31T03:00:00.000Z',
      )

      assert.equal(
        local.entries.some(
          (entry) =>
            entry.key ===
            'today-table.tutorial-settings.v1',
        ),
        false,
      )
      assert.equal(
        local.entries.some(
          (entry) =>
            entry.key ===
            'today-table.ai-access.v1',
        ),
        false,
      )
      assert.equal(
        local.entries.some(
          (entry) =>
            entry.key === AI_RECIPE_STORAGE_KEY,
        ),
        true,
      )
      assert.ok(parseAccountSyncSnapshot(merged))
      assert.equal(
        JSON.parse(
          merged.entries.find(
            (entry) =>
              entry.key === 'homeos.inventory',
          ).value,
        ).length,
        2,
      )
      values.set('homeos.mealPlan.items', '[]')
      assert.equal(
        applyAccountSyncSnapshot(
          storage,
          merged,
        ),
        true,
      )
      assert.equal(
        values.has('homeos.mealPlan.items'),
        false,
      )
      assert.equal(
        values.get('homeos.shopping.items'),
        '[]',
      )
    },
  )

  await check(
    'P4.2 Account Sync: rapid edits debounce to one upload with the final value',
    async () => {
      const { storage, values } =
        createAccountSyncTestStorage()
      const scheduledTimers = new Map()
      let timerSequence = 0
      const uploadedQuantities = []
      const scheduler = createAccountSyncScheduler({
        setTimer(callback, delay) {
          const timerId = ++timerSequence
          scheduledTimers.set(timerId, {
            callback,
            delay,
          })
          return timerId
        },
        clearTimer(timerId) {
          scheduledTimers.delete(timerId)
        },
        sync: async (identity) => {
          uploadedQuantities.push(
            JSON.parse(
              identity.storage.getItem(
                'homeos.inventory',
              ),
            )[0].quantity,
          )
          return {
            changed: false,
            revision: uploadedQuantities.length,
            changedKeys: [],
            pendingLocalChanges: false,
          }
        },
      })

      scheduler.setIdentity({
        storage,
        userId: 'user-a',
        deviceId: 'device-a',
      })

      ;[0.8, 0.9, 1].forEach(
        (quantity, index) => {
          values.set(
            'homeos.inventory',
            JSON.stringify([
              {
                id: 'inventory-onion',
                name: 'onion',
                quantity,
                unit: 'item',
                updatedAt: `2026-08-03T09:00:0${index}.000Z`,
              },
            ]),
          )
          scheduler.schedule()
        },
      )

      assert.equal(ACCOUNT_SYNC_DEBOUNCE_MS, 750)
      assert.equal(scheduledTimers.size, 1)
      assert.equal(
        [...scheduledTimers.values()][0].delay,
        ACCOUNT_SYNC_DEBOUNCE_MS,
      )

      await scheduler.flush()

      assert.deepEqual(uploadedQuantities, [1])
      assert.equal(scheduler.getState().pending, false)

      scheduler.schedule()
      await scheduler.flush()
      assert.deepEqual(uploadedQuantities, [1])
    },
  )

  await check(
    'P4.2 Account Sync: an edit during upload creates exactly one follow-up sync',
    async () => {
      const { storage, values } =
        createAccountSyncTestStorage([
          [
            'homeos.inventory',
            JSON.stringify([
              {
                id: 'inventory-onion',
                quantity: 0.5,
                updatedAt:
                  '2026-08-03T09:10:00.000Z',
              },
            ]),
          ],
        ])
      let resolveFirstSync
      const uploadedQuantities = []
      const scheduler = createAccountSyncScheduler({
        sync: async (identity) => {
          uploadedQuantities.push(
            JSON.parse(
              identity.storage.getItem(
                'homeos.inventory',
              ),
            )[0].quantity,
          )

          if (uploadedQuantities.length === 1) {
            await new Promise((resolve) => {
              resolveFirstSync = resolve
            })
          }

          return {
            changed: false,
            revision: uploadedQuantities.length,
            changedKeys: [],
            pendingLocalChanges: false,
          }
        },
      })

      scheduler.setIdentity({
        storage,
        userId: 'user-a',
        deviceId: 'device-a',
      })

      const firstSync = scheduler.flush({ force: true })
      await Promise.resolve()
      values.set(
        'homeos.inventory',
        JSON.stringify([
          {
            id: 'inventory-onion',
            quantity: 0.75,
            updatedAt:
              '2026-08-03T09:11:00.000Z',
          },
        ]),
      )
      scheduler.schedule()
      resolveFirstSync()
      await firstSync

      assert.equal(scheduler.getState().pending, true)
      await scheduler.flush()

      assert.deepEqual(uploadedQuantities, [0.5, 0.75])
      assert.equal(scheduler.getState().pending, false)
    },
  )

  await check(
    'P4.2 Account Sync: offline and failed uploads remain pending until retry succeeds',
    async () => {
      const { storage, values } =
        createAccountSyncTestStorage([
          [
            'homeos.inventory',
            '[{"id":"inventory-onion","quantity":0.75,"updatedAt":"2026-08-03T09:20:00.000Z"}]',
          ],
        ])
      let online = false
      let shouldFail = true
      let syncCalls = 0
      const scheduler = createAccountSyncScheduler({
        isOnline: () => online,
        sync: async () => {
          syncCalls += 1

          if (shouldFail) {
            throw new Error('ACCOUNT_SYNC_FAILED')
          }

          return {
            changed: false,
            revision: 2,
            changedKeys: [],
            pendingLocalChanges: false,
          }
        },
      })

      scheduler.setIdentity({
        storage,
        userId: 'user-a',
        deviceId: 'device-a',
      })
      scheduler.schedule()

      assert.equal(syncCalls, 0)
      assert.equal(scheduler.getState().pending, true)
      assert.equal(
        JSON.parse(
          values.get(ACCOUNT_SYNC_METADATA_STORAGE_KEY),
        ).pendingChanges,
        1,
      )

      online = true
      await assert.rejects(
        scheduler.flush(),
        /ACCOUNT_SYNC_FAILED/,
      )
      assert.equal(scheduler.getState().pending, true)

      shouldFail = false
      await scheduler.flush()

      assert.equal(syncCalls, 2)
      assert.equal(scheduler.getState().pending, false)
    },
  )

  await check(
    'P4.2 Account Sync: logout and account changes cancel or block the previous identity',
    async () => {
      const { storage } = createAccountSyncTestStorage([
        [
          ACCOUNT_SYNC_METADATA_STORAGE_KEY,
          JSON.stringify({
            formatVersion: '1.0',
            userId: 'user-a',
            deviceId: 'device-a',
            serverRevision: 7,
            lastSyncedAt:
              '2026-08-03T09:30:00.000Z',
            pendingChanges: 1,
            syncedKeys: {},
            deletedKeys: [],
            syncedValueHashes: {},
          }),
        ],
      ])
      let syncCalls = 0
      const scheduler = createAccountSyncScheduler({
        sync: async () => {
          syncCalls += 1
          return {
            changed: false,
            revision: 8,
            changedKeys: [],
            pendingLocalChanges: false,
          }
        },
      })

      scheduler.setIdentity({
        storage,
        userId: 'user-b',
        deviceId: 'device-b',
      })

      assert.equal(
        scheduler.getState().blockedByAccountMismatch,
        true,
      )
      await assert.rejects(
        scheduler.flush(),
        /ACCOUNT_SYNC_USER_MISMATCH/,
      )
      assert.equal(syncCalls, 0)

      scheduler.cancel()
      assert.deepEqual(scheduler.getState(), {
        hasIdentity: false,
        pending: false,
        inFlight: false,
        blockedByAccountMismatch: false,
      })
    },
  )

  await check(
    'P4.2 Account Sync: an in-flight local edit survives the server response and stays pending',
    async () => {
      const { storage, values } =
        createAccountSyncTestStorage([
          [
            'homeos.inventory',
            '[{"id":"inventory-onion","quantity":0.5,"updatedAt":"2026-08-03T09:40:00.000Z"}]',
          ],
        ])
      let requestSnapshot
      let releaseResponse
      const fetcher = async (_url, init) => {
        requestSnapshot = JSON.parse(init.body).snapshot
        await new Promise((resolve) => {
          releaseResponse = resolve
        })
        return new Response(
          JSON.stringify({
            revision: 11,
            snapshot: requestSnapshot,
            syncedAt:
              '2026-08-03T09:40:30.000Z',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
      }

      const syncPromise = syncAccountStorage({
        storage,
        userId: 'user-a',
        deviceId: 'device-a',
        fetcher,
      })
      await Promise.resolve()
      values.set(
        'homeos.inventory',
        '[{"id":"inventory-onion","quantity":0.75,"updatedAt":"2026-08-03T09:41:00.000Z"}]',
      )
      releaseResponse()

      const result = await syncPromise

      assert.equal(result.pendingLocalChanges, true)
      assert.equal(
        JSON.parse(values.get('homeos.inventory'))[0]
          .quantity,
        0.75,
      )
    },
  )

  await check(
    'P4.2 Account Sync: all account snapshot domains use the common scheduler',
    () => {
      ;[
        'homeos:inventory-changed',
        'homeos:shopping-changed',
        'homeos:meal-plan-changed',
        'homeos:recipes-changed',
        'today-table:ai-recipes-changed',
        'today-table:measurement-tools-changed',
      ].forEach((eventName) => {
        assert.ok(
          ACCOUNT_SYNC_MUTATION_EVENTS.includes(eventName),
          `${eventName} must schedule account sync`,
        )
      })
    },
  )

  await check(
    'P4.4 Account Sync: a revision-based deletion becomes a record tombstone and cannot be resurrected',
    () => {
      const remoteSnapshot = {
        formatVersion: '1.0',
        capturedAt: '2026-08-03T10:00:00.000Z',
        entries: [
          {
            key: 'homeos.inventory',
            value: JSON.stringify([
              {
                id: 'old-onion',
                quantity: 1,
                updatedAt:
                  '2026-08-03T10:00:00.000Z',
              },
              {
                id: 'old-potato',
                quantity: 1,
                updatedAt:
                  '2026-08-03T10:00:00.000Z',
              },
              {
                id: 'old-carrot',
                quantity: 1,
                updatedAt:
                  '2026-08-03T10:00:00.000Z',
              },
            ]),
            updatedAt:
              '2026-08-03T10:00:00.000Z',
            deletedAt: null,
          },
        ],
      }
      const localAfterDelete = {
        formatVersion: '1.0',
        capturedAt: '2026-08-03T10:05:00.000Z',
        entries: [
          {
            key: 'homeos.inventory',
            value: JSON.stringify([
              {
                id: 'new-kimchi',
                quantity: 1,
                updatedAt:
                  '2026-08-03T10:05:00.000Z',
              },
              {
                id: 'new-tofu',
                quantity: 1,
                updatedAt:
                  '2026-08-03T10:05:00.000Z',
              },
            ]),
            updatedAt:
              '2026-08-03T10:05:00.000Z',
            deletedAt: null,
          },
        ],
      }
      const deletionAware =
        addRecordDeletionTombstones(
          localAfterDelete,
          remoteSnapshot,
          '2026-08-03T10:05:30.000Z',
        )
      const deletedRecords = JSON.parse(
        deletionAware.entries[0].value,
      ).filter((record) => record.deletedAt)

      assert.equal(deletedRecords.length, 3)
      assert.deepEqual(
        deletedRecords.map((record) => record.id).sort(),
        ['old-carrot', 'old-onion', 'old-potato'],
      )

      const serverSnapshot = mergeAccountSyncSnapshots(
        deletionAware,
        remoteSnapshot,
        '2026-08-03T10:05:30.000Z',
      )
      const staleDeviceResult =
        mergeAccountSyncSnapshots(
          remoteSnapshot,
          serverSnapshot,
          '2026-08-03T10:06:00.000Z',
        )
      const { storage, values } =
        createAccountSyncTestStorage([
          ['homeos.inventory', remoteSnapshot.entries[0].value],
        ])

      applyAccountSyncSnapshot(storage, staleDeviceResult)

      assert.deepEqual(
        JSON.parse(values.get('homeos.inventory'))
          .map((record) => record.id)
          .sort(),
        ['new-kimchi', 'new-tofu'],
      )
    },
  )

  await check(
    'P4.4 Account Sync: delete POST persists to the server and stays deleted on another device and relaunch',
    async () => {
      const initialRecords = [
        {
          id: 'old-onion',
          quantity: 1,
          updatedAt: '2026-08-03T11:00:00.000Z',
        },
        {
          id: 'old-potato',
          quantity: 1,
          updatedAt: '2026-08-03T11:00:00.000Z',
        },
        {
          id: 'old-carrot',
          quantity: 1,
          updatedAt: '2026-08-03T11:00:00.000Z',
        },
      ]
      let serverRevision = 1
      let serverSnapshot = {
        formatVersion: '1.0',
        capturedAt: '2026-08-03T11:00:00.000Z',
        entries: [
          {
            key: 'homeos.inventory',
            value: JSON.stringify(initialRecords),
            updatedAt:
              '2026-08-03T11:00:00.000Z',
            deletedAt: null,
          },
        ],
      }
      let serverClock = 0
      const fetcher = async (_url, init) => {
        const request = JSON.parse(init.body)
        const serverNow = `2026-08-03T11:0${++serverClock}:00.000Z`
        const localSnapshot =
          request.baseRevision === serverRevision
            ? addRecordDeletionTombstones(
                request.snapshot,
                serverSnapshot,
                serverNow,
              )
            : request.snapshot

        serverSnapshot = mergeAccountSyncSnapshots(
          localSnapshot,
          serverSnapshot,
          serverNow,
        )
        serverRevision += 1

        return new Response(
          JSON.stringify({
            revision: serverRevision,
            snapshot: serverSnapshot,
            syncedAt: serverNow,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
      }
      const deviceA = createAccountSyncTestStorage([
        [
          'homeos.inventory',
          JSON.stringify(initialRecords),
        ],
      ])

      await syncAccountStorage({
        storage: deviceA.storage,
        userId: 'user-delete-sync',
        deviceId: 'device-a',
        fetcher,
      })
      deviceA.values.set(
        'homeos.inventory',
        JSON.stringify([
          {
            id: 'new-kimchi',
            quantity: 1,
            updatedAt:
              '2026-08-03T11:03:00.000Z',
          },
          {
            id: 'new-tofu',
            quantity: 1,
            updatedAt:
              '2026-08-03T11:03:00.000Z',
          },
        ]),
      )

      await syncAccountStorage({
        storage: deviceA.storage,
        userId: 'user-delete-sync',
        deviceId: 'device-a',
        fetcher,
      })

      const serverRecords = JSON.parse(
        serverSnapshot.entries[0].value,
      )
      assert.equal(
        serverRecords.filter((record) => record.deletedAt)
          .length,
        3,
      )

      const deviceB = createAccountSyncTestStorage([
        [
          'homeos.inventory',
          JSON.stringify(initialRecords),
        ],
      ])
      await syncAccountStorage({
        storage: deviceB.storage,
        userId: 'user-delete-sync',
        deviceId: 'device-b',
        fetcher,
      })

      assert.deepEqual(
        JSON.parse(
          deviceB.values.get('homeos.inventory'),
        )
          .map((record) => record.id)
          .sort(),
        ['new-kimchi', 'new-tofu'],
      )

      const relaunchedDevice =
        createAccountSyncTestStorage()
      await syncAccountStorage({
        storage: relaunchedDevice.storage,
        userId: 'user-delete-sync',
        deviceId: 'device-b-relaunched',
        fetcher,
      })

      assert.deepEqual(
        JSON.parse(
          relaunchedDevice.values.get(
            'homeos.inventory',
          ),
        )
          .map((record) => record.id)
          .sort(),
        ['new-kimchi', 'new-tofu'],
      )
      assert.equal(serverRevision, 5)
    },
  )

  await check(
    'P4.4 Account Sync: record tombstones cover inventory, shopping, Planner, and Recipe arrays',
    () => {
      ;[
        'homeos.inventory',
        'homeos.shopping.items',
        'homeos.mealPlan.items',
        'homeos.recipes.imported',
        'today-table.aiRecipes.v1',
      ].forEach((key) => {
        const local = {
          formatVersion: '1.0',
          capturedAt: '2026-08-03T12:01:00.000Z',
          entries: [
            {
              key,
              value: '[]',
              updatedAt:
                '2026-08-03T12:01:00.000Z',
              deletedAt: null,
            },
          ],
        }
        const remote = {
          formatVersion: '1.0',
          capturedAt: '2026-08-03T12:00:00.000Z',
          entries: [
            {
              key,
              value:
                '[{"id":"record-1","updatedAt":"2026-08-03T12:00:00.000Z"}]',
              updatedAt:
                '2026-08-03T12:00:00.000Z',
              deletedAt: null,
            },
          ],
        }
        const result = addRecordDeletionTombstones(
          local,
          remote,
          '2026-08-03T12:02:00.000Z',
        )
        const records = JSON.parse(
          result.entries[0].value,
        )

        assert.equal(records.length, 1)
        assert.equal(records[0].id, 'record-1')
        assert.equal(
          records[0].deletedAt,
          '2026-08-03T12:02:00.000Z',
        )
      })
    },
  )

  await check(
    'R1.2 Account isolation: 계정 A와 B의 활성 저장소를 같은 브라우저에서 분리',
    () => {
      const inventoryA = JSON.stringify([
        {
          id: 'inventory-a-onion',
          name: '양파',
          quantity: 0.5,
          unit: '개',
          updatedAt: '2026-08-03T10:00:00.000Z',
        },
      ])
      const inventoryB = JSON.stringify([
        {
          id: 'inventory-b-potato',
          name: '감자',
          quantity: 1,
          unit: '개',
          updatedAt: '2026-08-03T10:01:00.000Z',
        },
      ])
      const shoppingA =
        '[{"id":"shopping-a","name":"대파","updatedAt":"2026-08-03T10:00:00.000Z"}]'
      const mealPlanA =
        '[{"id":"meal-a","date":"2026-08-04","type":"dinner","updatedAt":"2026-08-03T10:00:00.000Z"}]'
      const { storage } = createAccountSyncTestStorage([
        ['homeos.inventory', inventoryA],
        ['homeos.shopping.items', shoppingA],
        ['homeos.mealPlan.items', mealPlanA],
        [
          ACCOUNT_SYNC_METADATA_STORAGE_KEY,
          JSON.stringify({ userId: 'user-a' }),
        ],
      ])

      const preparedA = prepareAccountStorageForIdentity(
        storage,
        'user-a',
      )
      assert.equal(preparedA.migratedLegacy, true)
      assert.equal(storage.getItem('homeos.inventory'), inventoryA)

      const removedA = deactivateAccountStorage(
        storage,
        'user-a',
      )
      assert.ok(removedA.includes('homeos.inventory'))
      assert.equal(storage.getItem('homeos.inventory'), null)

      const preparedB = prepareAccountStorageForIdentity(
        storage,
        'user-b',
      )
      assert.equal(preparedB.hasNamespace, false)
      assert.equal(storage.getItem('homeos.inventory'), null)
      assert.equal(storage.getItem('homeos.shopping.items'), null)
      assert.equal(storage.getItem('homeos.mealPlan.items'), null)
      storage.setItem('homeos.inventory', inventoryB)
      assert.equal(
        persistCurrentAccountStorage(storage, 'user-b'),
        true,
      )

      deactivateAccountStorage(storage, 'user-b')
      prepareAccountStorageForIdentity(storage, 'user-a')
      assert.equal(storage.getItem('homeos.inventory'), inventoryA)
      assert.equal(storage.getItem('homeos.shopping.items'), shoppingA)
      assert.equal(storage.getItem('homeos.mealPlan.items'), mealPlanA)
      assert.notEqual(storage.getItem('homeos.inventory'), inventoryB)
      deactivateAccountStorage(storage, 'user-a')
    },
  )

  await check(
    'R1.2 Account isolation: 소유자가 다르거나 없는 legacy 데이터는 신규 계정에 자동 업로드하지 않음',
    () => {
      const legacyInventory =
        '[{"id":"legacy-kimchi","name":"김치"}]'
      const mismatch = createAccountSyncTestStorage([
        ['homeos.inventory', legacyInventory],
        [
          ACCOUNT_SYNC_METADATA_STORAGE_KEY,
          JSON.stringify({ userId: 'user-a' }),
        ],
      ])

      const preparedB = prepareAccountStorageForIdentity(
        mismatch.storage,
        'user-b',
      )
      assert.equal(preparedB.quarantinedLegacy, true)
      assert.equal(
        mismatch.storage.getItem('homeos.inventory'),
        null,
      )
      assert.equal(
        getAccountStorageNamespaceState(
          mismatch.storage,
          'user-b',
        ).namespaceKeys.length,
        0,
      )

      deactivateAccountStorage(mismatch.storage, 'user-b')
      const restoredA = prepareAccountStorageForIdentity(
        mismatch.storage,
        'user-a',
      )
      assert.equal(restoredA.migratedLegacy, true)
      assert.equal(
        mismatch.storage.getItem('homeos.inventory'),
        legacyInventory,
      )
      deactivateAccountStorage(mismatch.storage, 'user-a')
      const restoredAAgain = prepareAccountStorageForIdentity(
        mismatch.storage,
        'user-a',
      )
      assert.equal(restoredAAgain.migratedLegacy, false)
      deactivateAccountStorage(mismatch.storage, 'user-a')

      const unowned = createAccountSyncTestStorage([
        ['homeos.inventory', legacyInventory],
      ])
      prepareAccountStorageForIdentity(
        unowned.storage,
        'user-b',
      )
      assert.equal(
        unowned.storage.getItem('homeos.inventory'),
        null,
      )
      assert.ok(
        getAccountStorageNamespaceState(
          unowned.storage,
          'user-b',
        ).quarantineKeys.length > 0,
      )
      deactivateAccountStorage(unowned.storage, 'user-b')
    },
  )

  await check(
    'R1.2 Account isolation: 로그인 복원은 서버 snapshot GET을 먼저 적용',
    async () => {
      const { storage } = createAccountSyncTestStorage()
      const remoteInventory = JSON.stringify([
        {
          id: 'remote-tofu',
          name: '두부',
          quantity: 1,
          unit: '모',
          updatedAt: '2026-08-03T10:05:00.000Z',
        },
      ])
      const methods = []

      prepareAccountStorageForIdentity(storage, 'user-server')
      const result = await restoreAccountStorageFromServer({
        storage,
        userId: 'user-server',
        fetcher: async (_url, init) => {
          methods.push(init.method)
          return new Response(
            JSON.stringify({
              revision: 4,
              snapshot: {
                formatVersion: '1.0',
                capturedAt: '2026-08-03T10:05:00.000Z',
                entries: [
                  {
                    key: 'homeos.inventory',
                    value: remoteInventory,
                    updatedAt: '2026-08-03T10:05:00.000Z',
                    deletedAt: null,
                  },
                ],
              },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        },
      })

      assert.deepEqual(methods, ['GET'])
      assert.equal(result.hasRemoteSnapshot, true)
      assert.equal(storage.getItem('homeos.inventory'), remoteInventory)
      deactivateAccountStorage(storage, 'user-server')
    },
  )

  await check(
    'R1.2 Account isolation: 인증 복원이 끝나기 전에는 React 화면을 렌더링하지 않음',
    () => {
      const mainSource = readFileSync(
        'src/main.tsx',
        'utf8',
      )
      const restoreIndex = mainSource.indexOf(
        'await restoreAuthSession',
      )
      const renderIndex = mainSource.indexOf(
        'createRoot(',
      )

      assert.ok(restoreIndex >= 0)
      assert.ok(renderIndex > restoreIndex)
      assert.match(
        mainSource,
        /persistCurrentAccountStorage\([\s\S]*session\.user\.id/,
      )
    },
  )

  await check(
    'Auth integration: 오프라인 세션 복원 실패 시 계정 데이터는 격리 보존하고 활성 UI에서는 제거',
    async () => {
      const values = new Map([
        ['homeos.inventory', '[{"id":"onion"}]'],
      ])
      const storage = {
        get length() {
          return values.size
        },
        key(index) {
          return [...values.keys()][index] ?? null
        },
        getItem(key) {
          return values.get(key) ?? null
        },
        setItem(key, value) {
          values.set(key, value)
        },
        removeItem(key) {
          values.delete(key)
        },
      }

      resetAuthSessionCache()
      const session = await restoreAuthSession({
        storage,
        fetcher: async () => {
          throw new TypeError('offline')
        },
      })

      assert.equal(session.status, 'anonymous')
      assert.equal(values.get('homeos.inventory'), undefined)
      assert.ok(
        [...values.entries()].some(
          ([key, value]) =>
            key.startsWith(
              'today-table.account-storage-quarantine.v1.',
            ) && value === '[{"id":"onion"}]',
        ),
      )
    },
  )

  await check(
    'Account sync foundation: 계정 데이터와 기기 전용 LocalStorage를 분리',
    () => {
      assert.equal(
        classifyAccountStorageKey(
          'homeos.inventory',
        ).dataset,
        'inventory',
      )
      assert.equal(
        classifyAccountStorageKey(
          'homeos.meal.2026-07-31.dinner',
        ).dataset,
        'meal',
      )
      assert.equal(
        classifyAccountStorageKey(
          'today-table.tutorial-settings.v1',
        ).scope,
        'device',
      )
      assert.equal(
        classifyAccountStorageKey(
          'unknown.local.key',
        ).scope,
        'unsupported',
      )
      assert.equal(
        ACCOUNT_SYNC_METADATA_STORAGE_KEY,
        'today-table.account-sync.v1',
      )
    },
  )

  await check(
    'Account sync foundation: 최초 병합과 tombstone 최신 우선 규칙',
    () => {
      assert.equal(
        chooseInitialAccountSyncStrategy(true, false),
        'upload-local',
      )
      assert.equal(
        chooseInitialAccountSyncStrategy(false, true),
        'restore-remote',
      )
      assert.equal(
        chooseInitialAccountSyncStrategy(true, true),
        'merge',
      )

      const resolved = resolveLatestAccountSyncRecord(
        {
          id: 'inventory-onion',
          value: { quantity: 2 },
          updatedAt: '2026-07-30T00:00:00.000Z',
        },
        {
          id: 'inventory-onion',
          value: { quantity: 2 },
          updatedAt: '2026-07-29T00:00:00.000Z',
          deletedAt: '2026-07-31T00:00:00.000Z',
        },
      )

      assert.equal(resolved.source, 'remote')
      assert.equal(
        resolved.record.deletedAt,
        '2026-07-31T00:00:00.000Z',
      )
    },
  )

  await check(
    'AI Access: 앱 최초 실행은 FREE이고 서버가 발급한 7일 TRIAL만 만료 처리',
    () => {
      const freeUsage =
        createInitialAiAccessUsage()
      const trialUsage =
        createTrialAiAccessUsage(
          '2026-07-31T00:00:00.000Z',
        )

      assert.equal(AI_TRIAL_DURATION_DAYS, 7)
      assert.equal(freeUsage.plan, 'FREE')
      assert.equal(freeUsage.trialStart, null)
      assert.equal(trialUsage.plan, 'TRIAL')
      assert.equal(
        trialUsage.trialEnd,
        '2026-08-07T00:00:00.000Z',
      )
      assert.equal(
        getRemainingTrialDays(
          trialUsage,
          '2026-07-31T00:00:00.000Z',
        ),
        7,
      )
      assert.equal(
        resolveAiAccessUsage(
          trialUsage,
          '2026-08-07T00:00:00.000Z',
        ).plan,
        'FREE',
      )
    },
  )

  await check(
    'AI Access: FREE·TRIAL·PREMIUM 권한 API를 Billing과 독립 판정',
    () => {
      const trialUsage = createTrialAiAccessUsage(
        '2026-07-31T00:00:00.000Z',
      )
      const freeUsage = {
        ...trialUsage,
        plan: 'FREE',
      }
      const premiumUsage = {
        ...trialUsage,
        plan: 'PREMIUM',
      }

      assert.equal(
        canUseAI(
          trialUsage,
          '2026-08-01T00:00:00.000Z',
        ),
        true,
      )
      assert.equal(
        canGenerateMealPlan(
          freeUsage,
          '2026-08-01T00:00:00.000Z',
        ),
        false,
      )
      assert.equal(
        canGenerateRecipe(
          premiumUsage,
          '2026-08-10T00:00:00.000Z',
        ),
        true,
      )
      assert.equal(
        getSubscriptionStatus(
          premiumUsage,
          '2026-08-10T00:00:00.000Z',
        ).plan,
        'PREMIUM',
      )
    },
  )

  await check(
    'AI Usage: 성공한 생성만 기능별 count와 마지막 생성 시각을 기록',
    () => {
      const usage = createTrialAiAccessUsage(
        '2026-07-31T00:00:00.000Z',
      )
      const firstRecord = recordAiGeneration(
        usage,
        'meal-plan',
        '2026-08-01T12:00:00.000Z',
      )
      const recipeRecord = recordAiGeneration(
        firstRecord.usage,
        'recipe',
        '2026-08-01T12:05:00.000Z',
      )
      const expiredRecord = recordAiGeneration(
        recipeRecord.usage,
        'recommendation',
        '2026-08-08T00:00:00.000Z',
      )

      assert.equal(firstRecord.recorded, true)
      assert.equal(
        firstRecord.usage.mealPlanCount,
        1,
      )
      assert.equal(
        recipeRecord.usage.recipeCount,
        1,
      )
      assert.equal(
        recipeRecord.usage.recommendationCount,
        0,
      )
      assert.equal(
        recipeRecord.usage.lastGenerationAt,
        '2026-08-01T12:05:00.000Z',
      )
      assert.equal(expiredRecord.recorded, false)
      assert.equal(
        expiredRecord.usage.mealPlanCount,
        1,
      )
    },
  )

  await check(
    'AI Access Storage: 새 key만 초기화하고 기존 AI 식단 체험 데이터를 보존',
    () => {
      const values = new Map([
        [
          'today-table.aiMealPlanTrial.v1',
          '{"status":"completed"}',
        ],
        [
          AI_ACCESS_STORAGE_KEY,
          JSON.stringify({
            formatVersion: '1.0',
            trialStart:
              '2026-07-31T00:00:00.000Z',
            trialEnd:
              '2026-08-07T00:00:00.000Z',
            plan: 'TRIAL',
            aiGenerationCount: 2,
            lastGenerationAt:
              '2026-07-31T12:00:00.000Z',
          }),
        ],
      ])
      const storage = {
        getItem(key) {
          return values.get(key) ?? null
        },
        setItem(key, value) {
          values.set(key, value)
        },
      }
      const now = new Date(
        '2026-07-31T00:00:00.000Z',
      )
      const usage = initializeAiAccessUsage(
        storage,
        now,
      )
      const service = createLocalAiAccessService(
        storage,
        {
          now: () => now,
        },
      )

      assert.equal(usage.plan, 'TRIAL')
      assert.equal(usage.formatVersion, '1.1')
      assert.equal(usage.mealPlanCount, 2)
      assert.equal(usage.recipeCount, 0)
      assert.ok(values.has(AI_ACCESS_STORAGE_KEY))
      assert.equal(
        values.get(
          'today-table.aiMealPlanTrial.v1',
        ),
        '{"status":"completed"}',
      )
      assert.equal(service.canUseAI(), true)
      assert.equal(
        service.getRemainingTrialDays(),
        7,
      )
      service.recordGeneration('recommendation')
      assert.equal(
        parseAiAccessUsage(
          JSON.parse(
            values.get(AI_ACCESS_STORAGE_KEY),
          ),
        ).recommendationCount,
        1,
      )

      const blankValues = new Map()
      const blankStorage = {
        getItem(key) {
          return blankValues.get(key) ?? null
        },
        setItem(key, value) {
          blankValues.set(key, value)
        },
      }

      assert.equal(
        initializeAiAccessUsage(
          blankStorage,
          now,
        ).plan,
        'FREE',
      )
    },
  )

  await check(
    'Server Entitlement: Google 로그인 뒤 계정당 Trial을 한 번만 시작',
    () => {
      const base = createServerEntitlement(
        'user-1',
        '2026-07-31T00:00:00.000Z',
      )
      const first = startTrialAfterGoogleLogin(
        base,
        '2026-07-31T00:00:00.000Z',
      )
      const second = startTrialAfterGoogleLogin(
        first.entitlement,
        '2026-08-01T00:00:00.000Z',
      )
      const expired = resolveServerEntitlement(
        first.entitlement,
        '2026-08-07T00:00:00.000Z',
      )

      assert.equal(base.plan, 'FREE')
      assert.equal(first.started, true)
      assert.equal(
        first.entitlement.plan,
        'TRIAL',
      )
      assert.equal(second.started, false)
      assert.equal(
        second.entitlement.trialStartedAt,
        '2026-07-31T00:00:00.000Z',
      )
      assert.equal(expired.plan, 'FREE')
      assert.equal(
        expired.trialConsumedAt,
        '2026-07-31T00:00:00.000Z',
      )
      assert.equal(
        startTrialAfterGoogleLogin(
          expired,
          '2026-08-08T00:00:00.000Z',
        ).started,
        false,
      )
    },
  )

  await check(
    'Server Entitlement: AI 사용량을 식단·레시피·추천으로 독립 기록',
    () => {
      const trial = startTrialAfterGoogleLogin(
        createServerEntitlement(
          'user-1',
          '2026-07-31T00:00:00.000Z',
        ),
        '2026-07-31T00:00:00.000Z',
      ).entitlement
      const mealPlan = recordServerAiGeneration(
        trial,
        'meal-plan',
        '2026-08-01T00:00:00.000Z',
      )
      const recipe = recordServerAiGeneration(
        mealPlan.entitlement,
        'recipe',
        '2026-08-01T00:01:00.000Z',
      )
      const recommendation =
        recordServerAiGeneration(
          recipe.entitlement,
          'recommendation',
          '2026-08-01T00:02:00.000Z',
        )

      assert.equal(mealPlan.recorded, true)
      assert.deepEqual(
        recommendation.entitlement.usage,
        {
          mealPlanCount: 1,
          recipeCount: 1,
          recommendationCount: 1,
          lastGenerationAt:
            '2026-08-01T00:02:00.000Z',
        },
      )
    },
  )

  await check(
    'Server Session: Secure HttpOnly cookie·30일 만료·24시간 회전 정책',
    () => {
      const session = createServerSession(
        {
          id: 'session-1',
          userId: 'user-1',
          deviceId: 'device-1',
          tokenHash: 'hashed-token',
        },
        '2026-07-31T00:00:00.000Z',
      )
      const cookie =
        createSessionCookie('opaque-token')

      assert.equal(
        SERVER_SESSION_COOKIE_NAME,
        '__Host-today_table_session',
      )
      assert.equal(
        SERVER_SESSION_DURATION_MS,
        30 * 24 * 60 * 60 * 1_000,
      )
      assert.equal(
        SERVER_SESSION_ROTATION_MS,
        24 * 60 * 60 * 1_000,
      )
      assert.match(cookie, /HttpOnly/)
      assert.match(cookie, /Secure/)
      assert.match(cookie, /SameSite=Lax/)
      assert.equal(
        readSessionToken(cookie),
        'opaque-token',
      )
      assert.equal(
        isServerSessionActive(
          session,
          '2026-08-01T00:00:00.000Z',
        ),
        true,
      )
      assert.equal(
        shouldRotateServerSession(
          session,
          '2026-08-01T00:00:00.000Z',
        ),
        true,
      )
      assert.match(
        createExpiredSessionCookie(),
        /Max-Age=0/,
      )
    },
  )

  await check(
    'Server API: 다섯 endpoint는 method·anonymous·미설정 경계를 안전하게 응답',
    async () => {
      const loginResponse = await handleAuthLogin(
        new Request(
          'https://today-table.test/api/auth/login',
          { method: 'POST' },
        ),
      )
      const anonymousResponse =
        await handleAuthSession(
          new Request(
            'https://today-table.test/api/auth/session',
          ),
        )
      const logoutResponse =
        await handleAuthLogout(
          new Request(
            'https://today-table.test/api/auth/logout',
            { method: 'POST' },
          ),
        )
      const syncResponse = await handleAccountSync(
        new Request(
          'https://today-table.test/api/account/sync',
        ),
      )
      const entitlementResponse =
        await handleEntitlement(
          new Request(
            'https://today-table.test/api/entitlement',
          ),
        )

      assert.equal(loginResponse.status, 503)
      assert.equal(anonymousResponse.status, 200)
      assert.deepEqual(
        await anonymousResponse.json(),
        {
          authenticated: false,
          user: null,
          entitlement: null,
        },
      )
      assert.equal(logoutResponse.status, 200)
      assert.match(
        logoutResponse.headers.get('set-cookie'),
        /Max-Age=0/,
      )
      assert.equal(syncResponse.status, 503)
      assert.equal(
        entitlementResponse.status,
        503,
      )
    },
  )

  await check(
    'AI Access integration: 앱 시작 초기화와 서버 우선 계정 동기화 경계를 유지',
    () => {
      const mainSource = readFileSync(
        'src/main.tsx',
        'utf8',
      )

      assert.match(
        mainSource,
        /initializeAiAccessUsage\(window\.localStorage\)/,
      )
      assert.equal(
        classifyAccountStorageKey(
          AI_ACCESS_STORAGE_KEY,
        ).conflictStrategy,
        'server-authoritative',
      )
    },
  )

  await check(
    'R5 Billing: verified Google Play subscription grants Premium',
    () => {
      const purchase = parseGooglePlaySubscription(
        {
          subscriptionState:
            'SUBSCRIPTION_STATE_ACTIVE',
          acknowledgementState:
            'ACKNOWLEDGEMENT_STATE_PENDING',
          startTime: '2026-07-31T00:00:00.000Z',
          latestOrderId: 'order-redacted',
          lineItems: [
            {
              productId: 'today_table_premium',
              expiryTime:
                '2026-08-31T00:00:00.000Z',
              offerDetails: {
                basePlanId: 'monthly',
              },
            },
          ],
        },
        {
          purchaseTokenHash: 'hashed-token',
          packageName: 'app.todaytable',
          allowedProductIds: [
            'today_table_premium',
          ],
        },
      )

      assert.ok(purchase)
      assert.equal(purchase.productId, 'today_table_premium')
      assert.equal(purchase.basePlanId, 'monthly')
      assert.equal(
        isPremiumBillingState(
          purchase.state,
          purchase.expiresAt,
          '2026-08-01T00:00:00.000Z',
        ),
        true,
      )

      const entitlement = createServerEntitlement(
        'user-r5',
        '2026-07-31T00:00:00.000Z',
      )
      const applied = applyVerifiedPurchaseToEntitlement(
        entitlement,
        purchase,
        '2026-08-01T00:00:00.000Z',
      )

      assert.equal(applied.granted, true)
      assert.equal(applied.entitlement.plan, 'PREMIUM')
      assert.equal(
        applied.entitlement.source,
        'google-play',
      )
    },
  )

  await check(
    'R5 Billing: validates input and calls subscriptionsv2 server API',
    async () => {
      assert.deepEqual(
        parseBillingVerificationRequest({
          purchaseToken: 'purchase-token-12345',
        }),
        { purchaseToken: 'purchase-token-12345' },
      )
      assert.equal(
        parseBillingVerificationRequest({
          purchaseToken: 'short',
        }),
        null,
      )
      assert.deepEqual(
        parseBillingRestoreRequest({
          purchaseTokens: [
            'purchase-token-12345',
            'purchase-token-12345',
            'purchase-token-67890',
          ],
        }),
        {
          purchaseTokens: [
            'purchase-token-12345',
            'purchase-token-67890',
          ],
        },
      )
      const config = parseGooglePlayBillingConfig({
        GOOGLE_PLAY_PACKAGE_NAME: 'app.todaytable',
        GOOGLE_PLAY_PREMIUM_PRODUCT_IDS:
          'today_table_premium',
        GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL:
          'billing@example.test',
        GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY:
          'private-key-not-used-in-test',
      })

      assert.ok(config)

      const verified = await verifyGooglePlaySubscription(
        'purchase-token-12345',
        config,
        {
          accessToken: 'server-access-token',
          fetcher: async (url, init) => {
            assert.match(
              String(url),
              /purchases\/subscriptionsv2\/tokens/,
            )
            assert.equal(
              new Headers(init?.headers).get(
                'authorization',
              ),
              'Bearer server-access-token',
            )
            return Response.json({
              subscriptionState:
                'SUBSCRIPTION_STATE_ACTIVE',
              acknowledgementState:
                'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
              startTime:
                '2026-07-31T00:00:00.000Z',
              lineItems: [
                {
                  productId: 'today_table_premium',
                  expiryTime:
                    '2026-08-31T00:00:00.000Z',
                },
              ],
            })
          },
        },
      )

      assert.equal(verified.state, 'ACTIVE')
      assert.notEqual(
        verified.purchaseTokenHash,
        'purchase-token-12345',
      )
    },
  )

  await check(
    'R5.1 Billing: 상태별 Premium 권한을 서버에서 재조정',
    () => {
      const base = {
        ...createServerEntitlement(
          'user-r51',
          '2026-08-01T00:00:00.000Z',
        ),
        plan: 'PREMIUM',
        source: 'google-play',
        premiumExpiresAt:
          '2026-09-01T00:00:00.000Z',
      }
      const purchase = {
        purchaseTokenHash: 'token-hash-r51',
        packageName: 'app.todaytable',
        productId: 'today_table_premium',
        basePlanId: 'monthly',
        orderId: null,
        acknowledgementState: 'ACKNOWLEDGED',
        startAt: '2026-08-01T00:00:00.000Z',
        expiresAt: '2026-09-01T00:00:00.000Z',
        linkedPurchaseTokenHash: null,
        testPurchase: true,
      }

      for (const state of [
        'ACTIVE',
        'GRACE_PERIOD',
        'CANCELED',
      ]) {
        assert.equal(
          reconcileGooglePlayEntitlement(
            base,
            [{ ...purchase, state }],
            '2026-08-10T00:00:00.000Z',
          ).plan,
          'PREMIUM',
        )
      }

      for (const state of [
        'EXPIRED',
        'ON_HOLD',
        'PAUSED',
        'PENDING',
      ]) {
        const resolved =
          reconcileGooglePlayEntitlement(
            base,
            [{ ...purchase, state }],
            '2026-08-10T00:00:00.000Z',
          )

        assert.equal(resolved.plan, 'FREE')
        assert.equal(resolved.source, 'none')
      }

      assert.equal(
        reconcileGooglePlayEntitlement(
          base,
          [
            {
              ...purchase,
              state: 'ACTIVE',
              acknowledgementState: 'PENDING',
            },
          ],
          '2026-08-10T00:00:00.000Z',
        ).plan,
        'FREE',
      )

      assert.equal(
        resolveServerEntitlement(
          base,
          '2026-09-01T00:00:00.000Z',
        ).plan,
        'FREE',
      )
    },
  )

  await check(
    'R5.1 Billing: TWA 구매·조회·복원·구독 변경 bridge와 설정 문서',
    () => {
      const client = readFileSync(
        'src/services/googlePlayBillingClient.ts',
        'utf8',
      )
      const settings = readFileSync(
        'src/pages/SettingsPage.tsx',
        'utf8',
      )
      const admin = readFileSync(
        'src/pages/AdminDashboardPage.tsx',
        'utf8',
      )
      const setup = readFileSync(
        'PLAY_CONSOLE_SETUP.md',
        'utf8',
      )

      assert.match(
        client,
        /https:\/\/play\.google\.com\/billing/,
      )
      assert.match(client, /new PaymentRequest/)
      assert.match(client, /listPurchases/)
      assert.match(client, /changeSubscription/)
      assert.match(client, /ReplacementMode/)
      assert.match(settings, /구매 복원/)
      assert.match(admin, /Google Play 구독/)
      assert.match(admin, /summary\.billing\.active/)
      assert.match(setup, /Real-time Developer Notifications/)
      assert.match(
        setup,
        /GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY/,
      )
    },
  )

  await check(
    'R5 Cost Guard: estimates tokens and creates stable cache keys',
    async () => {
      assert.equal(
        estimateAiCostUsd('gpt-5.6-luna', 1_000, 500),
        0.004,
      )
      const left = await createAiCacheKey(
        'mealPlan',
        'gpt-5.6-luna',
        { servings: 4, preference: 'korean' },
      )
      const right = await createAiCacheKey(
        'mealPlan',
        'gpt-5.6-luna',
        { preference: 'korean', servings: 4 },
      )

      assert.equal(left, right)
      const event = createAiUsageEvent({
        id: 'usage-1',
        userId: 'user-1',
        operation: 'recipe',
        model: 'gpt-5.6-luna',
        inputTokens: 1_000,
        outputTokens: 500,
        success: true,
        createdAt: '2026-07-31T00:00:00.000Z',
      })

      assert.equal(event.estimatedCostUsd, 0.004)
      assert.equal(event.cacheHit, false)
    },
  )

  await check(
    'R5 Server wiring: AI operations, admin switch, and Neon schema',
    () => {
      const schema = readFileSync(
        'scripts/server-schema.sql',
        'utf8',
      )
      const mealPlanApi = readFileSync(
        'api/ai/meal-plan-trial.ts',
        'utf8',
      )
      const recipeApi = readFileSync(
        'api/ai/meal-plan-recipe-detail.ts',
        'utf8',
      )
      const recommendationApi = readFileSync(
        'api/ai/recipe-recommendation.ts',
        'utf8',
      )

      assert.match(
        schema,
        /create table if not exists billing_purchases/,
      )
      assert.match(
        schema,
        /create table if not exists ai_usage_events/,
      )
      assert.match(
        schema,
        /create table if not exists ai_result_cache/,
      )
      assert.match(
        schema,
        /create table if not exists runtime_settings/,
      )
      assert.doesNotMatch(schema, /purchase_token text/)
      assert.match(mealPlanApi, /operation: 'mealPlan'/)
      assert.match(recipeApi, /operation: 'recipe'/)
      assert.match(
        recommendationApi,
        /operation: 'recommendation'/,
      )
      assert.ok(existsSync('api/billing/verify.ts'))
      assert.ok(existsSync('api/billing/restore.ts'))
      assert.ok(existsSync('api/admin.ts'))
      assert.equal(
        existsSync('api/admin/dashboard.ts'),
        false,
      )
      assert.equal(
        existsSync('api/admin/ai-switch.ts'),
        false,
      )
    },
  )

  await check(
    'P3.1 Admin API: 단일 함수가 Dashboard와 AI switch의 인증·권한·method를 보존',
    async () => {
      const now = '2026-08-03T00:00:00.000Z'
      const sessionToken = 'admin-session-token-1234567890'
      const tokenHash = await hashSessionToken(sessionToken)
      const session = createServerSession(
        {
          id: 'session-admin',
          userId: 'user-admin',
          deviceId: 'device-admin',
          tokenHash,
        },
        now,
      )
      const user = {
        id: 'user-admin',
        googleSubject: 'google-admin',
        email: null,
        displayName: null,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
        deletedAt: null,
      }
      const entitlement = createServerEntitlement(
        user.id,
        now,
      )
      const identity = {
        repository: {
          async findAuthContextBySessionTokenHash(
            requestedHash,
          ) {
            return requestedHash === tokenHash
              ? { session, user, entitlement }
              : null
          },
        },
        async verifyGoogleAuthorizationCode() {
          throw new Error('not used')
        },
        now: () => new Date(now),
      }
      let runtimeSetting = null
      const summary = {
        generatedAt: now,
        subscribers: 1,
        plans: { FREE: 0, TRIAL: 1, PREMIUM: 0 },
        aiEnabled: true,
        todayAiCalls: 0,
        todayEstimatedCostUsd: 0,
        monthEstimatedCostUsd: 0,
        todayErrors: 0,
        feedbackCount: 0,
        billing: {
          active: 0,
          expired: 0,
          pending: 0,
          canceled: 0,
          onHold: 0,
          paused: 0,
        },
        system: {
          openAi: true,
          database: true,
          oauth: true,
          billing: true,
        },
        users: [],
      }
      const business = {
        async getAdminDashboardSummary() {
          return summary
        },
        async findRuntimeSetting() {
          return runtimeSetting
        },
        async saveRuntimeSetting(setting) {
          runtimeSetting = setting
          return setting
        },
      }
      const createDependencies = (adminUserIds) => ({
        identity,
        business,
        environment: {
          ADMIN_USER_IDS: adminUserIds,
          DATABASE_URL: 'configured',
          OPENAI_API_KEY: 'configured',
          GOOGLE_OAUTH_CLIENT_ID: 'configured',
          GOOGLE_OAUTH_CLIENT_SECRET: 'configured',
          GOOGLE_PLAY_PACKAGE_NAME: 'configured',
          GOOGLE_PLAY_PREMIUM_PRODUCT_IDS: 'configured',
          GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL: 'configured',
          GOOGLE_PLAY_SERVICE_ACCOUNT_PRIVATE_KEY:
            'configured',
        },
        now: () => new Date(now),
      })
      const cookie = `${SERVER_SESSION_COOKIE_NAME}=${sessionToken}`
      const authenticatedHeaders = {
        Cookie: cookie,
      }

      assert.equal(
        resolveAdminApiAction(
          new Request(
            'https://today-table.test/api/admin?action=dashboard',
          ),
        ),
        'dashboard',
      )
      assert.equal(
        resolveAdminApiAction(
          new Request(
            'https://today-table.test/api/admin/ai-switch',
          ),
        ),
        'ai-switch',
      )

      const unknown = await handleAdminRoute(
        new Request(
          'https://today-table.test/api/admin?action=delete-all',
        ),
      )
      assert.equal(unknown.status, 404)
      assert.deepEqual(await unknown.json(), {
        code: 'ADMIN_ACTION_NOT_FOUND',
      })

      const unauthenticated = await handleAdminRoute(
        new Request(
          'https://today-table.test/api/admin?action=dashboard',
        ),
        createDependencies('user-admin'),
      )
      assert.equal(unauthenticated.status, 401)

      const forbidden = await handleAdminRoute(
        new Request(
          'https://today-table.test/api/admin?action=dashboard',
          { headers: authenticatedHeaders },
        ),
        createDependencies('another-user'),
      )
      assert.equal(forbidden.status, 403)

      const dashboard = await handleAdminRoute(
        new Request(
          'https://today-table.test/api/admin?action=dashboard',
          { headers: authenticatedHeaders },
        ),
        createDependencies('user-admin'),
      )
      assert.equal(dashboard.status, 200)
      assert.equal((await dashboard.json()).subscribers, 1)

      const switchRead = await handleAdminRoute(
        new Request(
          'https://today-table.test/api/admin?action=ai-switch',
          { headers: authenticatedHeaders },
        ),
        createDependencies('user-admin'),
      )
      assert.equal(switchRead.status, 200)
      assert.equal((await switchRead.json()).aiEnabled, true)

      const switchUpdate = await handleAdminRoute(
        new Request(
          'https://today-table.test/api/admin?action=ai-switch',
          {
            method: 'PUT',
            headers: {
              ...authenticatedHeaders,
              Origin: 'https://today-table.test',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ enabled: false }),
          },
        ),
        createDependencies('user-admin'),
      )
      assert.equal(switchUpdate.status, 200)
      assert.equal(
        (await switchUpdate.json()).aiEnabled,
        false,
      )

      const switchAfterUpdate = await handleAdminRoute(
        new Request(
          'https://today-table.test/api/admin?action=ai-switch',
          { headers: authenticatedHeaders },
        ),
        createDependencies('user-admin'),
      )
      assert.equal(
        (await switchAfterUpdate.json()).aiEnabled,
        false,
      )

      const invalidMethod = await handleAdminRoute(
        new Request(
          'https://today-table.test/api/admin?action=dashboard',
          { method: 'POST' },
        ),
      )
      assert.equal(invalidMethod.status, 405)
    },
  )

  await check(
    'Sprint S4: auth·runtime setting·usage 저장과 OpenAI latency 설정 최적화',
    () => {
      const identityRepository = readFileSync(
        'src/server/postgresIdentityRepository.ts',
        'utf8',
      )
      const serverApi = readFileSync(
        'src/server/serverApiEngine.ts',
        'utf8',
      )
      const businessGuard = readFileSync(
        'src/server/aiBusinessGuard.ts',
        'utf8',
      )
      const businessRepository = readFileSync(
        'src/server/postgresBusinessRepository.ts',
        'utf8',
      )
      const recommendationApi = readFileSync(
        'api/ai/recipe-recommendation.ts',
        'utf8',
      )
      const recommendationClient = readFileSync(
        'src/services/aiRecipeRecommendationClient.ts',
        'utf8',
      )
      const trialApi = readFileSync(
        'api/ai/meal-plan-trial.ts',
        'utf8',
      )
      const detailApi = readFileSync(
        'api/ai/meal-plan-recipe-detail.ts',
        'utf8',
      )
      const vercelConfig = readFileSync(
        'vercel.json',
        'utf8',
      )

      assert.match(
        identityRepository,
        /findAuthContextBySessionTokenHash/,
      )
      assert.match(identityRepository, /row_to_json\(s\)/)
      assert.match(identityRepository, /row_to_json\(u\)/)
      assert.match(identityRepository, /row_to_json\(e\)/)
      assert.match(
        serverApi,
        /storedContext\.session/,
      )
      assert.match(
        businessGuard,
        /RUNTIME_SETTING_CACHE_TTL_MS = 30_000/,
      )
      assert.match(
        businessGuard,
        /runtimeSettingResultPromise/,
      )
      assert.match(
        businessGuard,
        /saveAiResultCacheWithUsage/,
      )
      assert.match(businessGuard, /await Promise\.all\(/)
      assert.match(
        businessRepository,
        /with saved_cache as/,
      )
      assert.match(
        recommendationApi,
        /SERVER_TIMEOUT_MS = 20_000/,
      )
      assert.match(
        recommendationClient,
        /CLIENT_TIMEOUT_MS = 23_000/,
      )
      assert.match(
        recommendationApi,
        /effort: 'none'/,
      )
      assert.match(
        recommendationApi,
        /MAX_OUTPUT_TOKENS = 3_000/,
      )
      assert.match(
        recommendationApi,
        /today_table_recipe_recommendations_compact_v1/,
      )
      assert.match(
        recommendationApi,
        /parseCompactAiRecommendationText/,
      )
      assert.match(
        recommendationApi,
        /maxItems: 8/,
      )
      assert.match(
        recommendationApi,
        /가장 자연스럽고 실제로 만들어 먹고 싶은 한국 가정식 메뉴 1개/,
      )
      assert.match(
        recommendationApi,
        /요리의 자연스러움, 2\) 실제 가정식 여부, 3\) 사용자가 선택할 가능성, 4\) 재료 활용/,
      )
      assert.match(
        recommendationApi,
        /억지로 모두 한 메뉴에 넣지 마세요/,
      )
      assert.match(
        recommendationApi,
        /곁들임·후식·다음 식사로 남기거나 사용하지 않아도 됩니다/,
      )
      assert.match(
        recommendationApi,
        /RECOMMENDATION_POLICY_VERSION =\s*'s5\.3-naturalness-v1'/,
      )
      assert.doesNotMatch(
        recommendationApi,
        /effort: 'low'/,
      )
      assert.match(trialApi, /SERVER_TIMEOUT_MS = 30_000/)
      assert.match(detailApi, /SERVER_TIMEOUT_MS = 30_000/)
      assert.equal(
        JSON.parse(vercelConfig).functions[
          'api/ai/recipe-recommendation.ts'
        ].maxDuration,
        25,
      )
    },
  )

  await check(
    'Sprint S1: Home AI 진입과 냉장고 분기, 추천 후 연속 행동을 연결',
    () => {
      const app = readFileSync('src/App.tsx', 'utf8')
      const home = readFileSync(
        'src/pages/HomePage.tsx',
        'utf8',
      )
      const homeCss = readFileSync(
        'src/pages/HomePage.css',
        'utf8',
      )
      const inventory = readFileSync(
        'src/pages/InventoryPage.tsx',
        'utf8',
      )
      const mealPlan = readFileSync(
        'src/pages/MealPlanPage.tsx',
        'utf8',
      )
      const recommendation = readFileSync(
        'src/blocks/RecipeRecommendationBlock.tsx',
        'utf8',
      )

      assert.match(home, /오늘 뭐 먹지\?/)
      assert.match(
        home,
        /먼저 냉장고에 있는 재료를 등록해 주세요/,
      )
      assert.match(
        home,
        /냉장고 재료로 오늘 뭐 먹지\?/,
      )
      assert.match(
        home,
        /현재 등록된 냉장고 재료를 최대한 활용해/,
      )
      assert.match(home, /냉장고 재료 등록하기/)
      assert.match(
        home,
        /냉장고 재료로 AI 추천받기/,
      )
      assert.match(
        home,
        /재료 등록 후 AI 추천을 받을 수 있어요/,
      )
      assert.match(
        home,
        /등록 재료 \$\{inventoryItems\.length\}개 기준/,
      )
      assert.match(
        home,
        /const hasInventoryItems = inventoryItems\.length > 0/,
      )
      assert.match(home, /onChangePage\('inventory'\)/)
      assert.match(home, /onStartAiRecommendation\(\)/)
      assert.match(
        home,
        /if \(!hasInventoryItems\) \{[\s\S]*?onChangePage\('inventory'\)[\s\S]*?return[\s\S]*?\}[\s\S]*?onStartAiRecommendation\(\)/,
      )
      assert.match(
        homeCss,
        /\.home-ai-entry__action \{[\s\S]*?min-height: 56px;[\s\S]*?white-space: nowrap;/,
      )
      assert.match(app, /openAiRecommendation/)
      assert.match(mealPlan, /autoStartAi/)
      assert.match(
        recommendation,
        /requestAiRecipeRecommendations/,
      )
      assert.match(recommendation, /레시피 보기/)
      assert.match(recommendation, /장보기에 추가/)
      assert.match(recommendation, /장보기 목록 보기/)
      assert.match(recommendation, /식단에 담기/)
      assert.match(
        inventory,
        /냉장고에 재료를 등록하면 AI가 더 정확하게 추천합니다/,
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

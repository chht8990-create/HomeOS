import type { PageName } from '../components/BottomNavigation'

const APP_HISTORY_MARKER = 'today-table-navigation'
const PWA_EXIT_GUARD_KEY =
  '__todayTablePwaExitGuard'

export type AppOverlay =
  | 'firstRunTutorial'
  | 'mealPlanWelcome'

export type AppNavigationState = {
  marker: typeof APP_HISTORY_MARKER
  index: number
  page: PageName
  recipeId: string | null
  plannerRecipeName: string | null
  openAiTrial: boolean
  showInventoryRecommendations: boolean
  overlay: AppOverlay | null
}

export type TopLevelNavigationPlan =
  | { kind: 'none' }
  | { kind: 'push' }
  | { kind: 'replace' }
  | { kind: 'back'; delta: number }
  | {
      kind: 'back-and-replace'
      delta: number
    }

const pageNames: PageName[] = [
  'today',
  'mealPlan',
  'shopping',
  'inventory',
  'recipes',
  'settings',
  'guide',
  'feedback',
]

const topLevelPageNames: PageName[] = [
  'today',
  'recipes',
  'shopping',
  'inventory',
  'settings',
]

function isPageName(value: unknown): value is PageName {
  return (
    typeof value === 'string' &&
    pageNames.includes(value as PageName)
  )
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.length > 0
    ? value
    : null
}

export function createNavigationState(
  overrides: Partial<AppNavigationState> = {},
): AppNavigationState {
  return {
    marker: APP_HISTORY_MARKER,
    index: 0,
    page: 'today',
    recipeId: null,
    plannerRecipeName: null,
    openAiTrial: false,
    showInventoryRecommendations: false,
    overlay: null,
    ...overrides,
  }
}

export function isAppNavigationState(
  value: unknown,
): value is AppNavigationState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<AppNavigationState>

  return (
    candidate.marker === APP_HISTORY_MARKER &&
    typeof candidate.index === 'number' &&
    Number.isInteger(candidate.index) &&
    candidate.index >= 0 &&
    isPageName(candidate.page) &&
    (candidate.recipeId === null ||
      typeof candidate.recipeId === 'string') &&
    (candidate.plannerRecipeName === null ||
      typeof candidate.plannerRecipeName === 'string') &&
    typeof candidate.openAiTrial === 'boolean' &&
    typeof candidate.showInventoryRecommendations ===
      'boolean' &&
    (candidate.overlay === null ||
      candidate.overlay === 'firstRunTutorial' ||
      candidate.overlay === 'mealPlanWelcome')
  )
}

export function readNavigationState(
  historyState: unknown,
  search: string,
): AppNavigationState {
  if (isAppNavigationState(historyState)) {
    return createNavigationState(historyState)
  }

  const params = new URLSearchParams(search)
  const pageParam = params.get('page')
  const page = isPageName(pageParam)
    ? pageParam
    : 'today'

  return createNavigationState({
    page,
    recipeId:
      page === 'recipes'
        ? optionalString(params.get('recipe'))
        : null,
    plannerRecipeName:
      page === 'mealPlan'
        ? optionalString(params.get('plannerRecipe'))
        : null,
    openAiTrial:
      page === 'mealPlan' &&
      params.get('aiTrial') === '1',
    showInventoryRecommendations:
      page === 'recipes' &&
      params.get('fromInventory') === '1',
  })
}

export function createNavigationUrl(
  state: AppNavigationState,
  currentHref: string,
) {
  const url = new URL(currentHref)

  url.searchParams.delete('page')
  url.searchParams.delete('recipe')
  url.searchParams.delete('plannerRecipe')
  url.searchParams.delete('aiTrial')
  url.searchParams.delete('fromInventory')

  if (state.page !== 'today') {
    url.searchParams.set('page', state.page)
  }

  if (
    state.page === 'recipes' &&
    state.recipeId
  ) {
    url.searchParams.set('recipe', state.recipeId)
  }

  if (
    state.page === 'mealPlan' &&
    state.plannerRecipeName
  ) {
    url.searchParams.set(
      'plannerRecipe',
      state.plannerRecipeName,
    )
  }

  if (
    state.page === 'mealPlan' &&
    state.openAiTrial
  ) {
    url.searchParams.set('aiTrial', '1')
  }

  if (
    state.page === 'recipes' &&
    state.showInventoryRecommendations
  ) {
    url.searchParams.set('fromInventory', '1')
  }

  return `${url.pathname}${url.search}${url.hash}`
}

export function isSameNavigationTarget(
  current: AppNavigationState,
  next: AppNavigationState,
) {
  return (
    current.page === next.page &&
    current.recipeId === next.recipeId &&
    current.plannerRecipeName ===
      next.plannerRecipeName &&
    current.openAiTrial === next.openAiTrial &&
    current.showInventoryRecommendations ===
      next.showInventoryRecommendations &&
    current.overlay === next.overlay
  )
}

export function isTopLevelNavigationState(
  state: AppNavigationState,
) {
  return (
    topLevelPageNames.includes(state.page) &&
    state.recipeId === null &&
    state.plannerRecipeName === null &&
    !state.openAiTrial &&
    !state.showInventoryRecommendations &&
    state.overlay === null
  )
}

export function createPwaExitGuardState(
  state: AppNavigationState,
) {
  return {
    ...state,
    [PWA_EXIT_GUARD_KEY]: true,
  }
}

export function isPwaExitGuardState(
  state: unknown,
) {
  return (
    typeof state === 'object' &&
    state !== null &&
    PWA_EXIT_GUARD_KEY in state &&
    (state as Record<string, unknown>)[
      PWA_EXIT_GUARD_KEY
    ] === true
  )
}

export function shouldUsePwaBackExit(
  displayModeStandalone: boolean,
  navigatorStandalone = false,
) {
  return (
    displayModeStandalone ||
    navigatorStandalone
  )
}

export function planTopLevelNavigation(
  current: AppNavigationState,
  targetPage: PageName,
): TopLevelNavigationPlan {
  const isCurrentTopLevelTarget =
    current.page === targetPage &&
    current.recipeId === null &&
    current.plannerRecipeName === null &&
    !current.openAiTrial &&
    !current.showInventoryRecommendations &&
    current.overlay === null

  if (isCurrentTopLevelTarget) {
    return { kind: 'none' }
  }

  if (
    isTopLevelNavigationState(current) &&
    topLevelPageNames.includes(targetPage)
  ) {
    return { kind: 'replace' }
  }

  if (targetPage === 'today') {
    return current.index > 0
      ? {
          kind: 'back',
          delta: -current.index,
        }
      : { kind: 'replace' }
  }

  if (
    current.page === 'today' &&
    current.index === 0
  ) {
    return { kind: 'push' }
  }

  if (current.index > 0) {
    return {
      kind: 'back-and-replace',
      delta: -current.index,
    }
  }

  if (current.index <= 1) {
    return { kind: 'replace' }
  }

  return {
    kind: 'back-and-replace',
    delta: -(current.index - 1),
  }
}

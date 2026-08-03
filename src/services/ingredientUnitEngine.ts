type IngredientAmount = {
  name: string
  quantity: number
  unit: string
}

export type IngredientMeasurementCategory =
  | 'household-count'
  | 'cooking-measure'
  | 'sensory'
  | 'weight'

export type IngredientUnitPresentation = {
  ingredientName: string
  canonicalIngredientId: string
  baseAmount: number
  baseUnit: string
  displayName: string
  displayAmount: number
  displayUnit: string
  displayText: string
  preparationText?: string
  countSize?: string
  measurementCategory: IngredientMeasurementCategory
}

export type IngredientComparisonValue = {
  key: string
  amount: number
  baseUnit: string
  sourceUnitFactor: number
}

type HouseholdUnitRule = {
  id: string
  matches: (name: string) => boolean
  gramsPerUnit: number
  unit: string
  displayName?: string
  preparationText?: string
  countSize?: string
  format?: (
    rawAmount: number,
    originalAmount: number,
  ) => Pick<
    IngredientUnitPresentation,
    'displayAmount' | 'displayText'
  >
}

function normalizeName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function includesAny(
  value: string,
  candidates: string[],
) {
  return candidates.some((candidate) =>
    value.includes(candidate),
  )
}

function formatNumber(value: number) {
  return Number(value.toFixed(2)).toString()
}

function formatHalfUnit(
  amount: number,
  unit: string,
  useNaturalHalf = false,
) {
  if (amount === 0.5) {
    return useNaturalHalf
      ? `반 ${unit}`
      : `1/2${unit}`
  }

  return `${formatNumber(amount)}${unit}`
}

/**
 * 생활 단위는 자연수와 반 단위만 사용한다. 1.5개 같은
 * 혼합분수는 조리 현장에서 의미가 약해 가까운 자연수로
 * 안내하고, 1개 미만일 때만 반 단위를 유지한다.
 */
function toPracticalCount(value: number) {
  if (value < 0.75) {
    return {
      amount: 0.5,
      approximate: value < 0.4 || value > 0.6,
    }
  }

  const whole = Math.max(1, Math.round(value))

  return {
    amount: whole,
    approximate:
      Math.abs(value - whole) > 0.12,
  }
}

function formatPracticalCount(
  value: number,
  unit: string,
  useNaturalHalf = false,
) {
  const practical = toPracticalCount(value)
  const text = formatHalfUnit(
    practical.amount,
    unit,
    useNaturalHalf,
  )

  return {
    displayAmount: practical.amount,
    displayText: practical.approximate
      ? `약 ${text}`
      : text,
  }
}

function roundLiquid(value: number) {
  return value >= 100
    ? Math.max(1, Math.round(value / 10) * 10)
    : Math.max(1, Math.round(value))
}

function formatCookingMeasure(
  amount: number,
  unit: string,
) {
  if (amount < 0.75) {
    return {
      displayAmount: 0.5,
      displayText: `약 1/2${unit}`,
    }
  }

  const whole = Math.max(1, Math.round(amount))

  return {
    displayAmount: whole,
    displayText:
      Math.abs(amount - whole) > 0.12
        ? `약 ${whole}${unit}`
        : `${whole}${unit}`,
  }
}

const householdUnitRules: HouseholdUnitRule[] = [
  {
    id: 'egg-garnish',
    matches: (name) =>
      includesAny(name, ['달걀지단', '계란지단']),
    gramsPerUnit: 40,
    unit: '개',
    displayName: '달걀',
    preparationText: '얇게 지단을 부쳐 채 썰기',
  },
  {
    id: 'grated-radish',
    matches: (name) =>
      includesAny(name, ['간무', '무간것']),
    gramsPerUnit: 80,
    unit: '토막',
    displayName: '무',
    preparationText: '곱게 갈기',
  },
  {
    id: 'chopped-carrot',
    matches: (name) =>
      includesAny(name, ['다진당근', '당근다진것']),
    gramsPerUnit: 76,
    unit: '개',
    displayName: '당근',
    preparationText: '곱게 다지기',
  },
  {
    id: 'cooked-rice',
    matches: (name) =>
      includesAny(name, ['밥', '공기밥', '쌀밥']) &&
      !includesAny(name, ['볶음밥', '덮밥', '김밥']),
    gramsPerUnit: 200,
    unit: '공기',
    displayName: '밥',
  },
  {
    id: 'baechu-kimchi',
    matches: (name) =>
      name === '김치' ||
      includesAny(name, ['배추김치', '묵은지']),
    gramsPerUnit: 2400,
    unit: '포기',
    format: (rawAmount) => {
      if (rawAmount <= 0.38) {
        return {
          displayAmount: 0.25,
          displayText: '약 1/4포기',
        }
      }

      if (rawAmount <= 0.75) {
        return {
          displayAmount: 0.5,
          displayText: '약 1/2포기',
        }
      }

      return formatPracticalCount(
        rawAmount,
        '포기',
      )
    },
  },
  {
    id: 'tofu',
    matches: (name) => name.includes('두부'),
    gramsPerUnit: 300,
    unit: '모',
  },
  {
    id: 'enoki-mushroom',
    matches: (name) => name.includes('팽이버섯'),
    gramsPerUnit: 100,
    unit: '봉',
  },
  {
    id: 'king-oyster-mushroom',
    matches: (name) =>
      name.includes('새송이버섯'),
    gramsPerUnit: 90,
    unit: '개',
  },
  {
    id: 'shiitake-mushroom',
    matches: (name) => name.includes('표고버섯'),
    gramsPerUnit: 25,
    unit: '개',
  },
  {
    id: 'prepared-mackerel',
    matches: (name) =>
      includesAny(name, ['손질고등어', '고등어']),
    gramsPerUnit: 150,
    unit: '쪽',
    countSize: '손질한 한 쪽 기준',
  },
  {
    id: 'prepared-squid',
    matches: (name) =>
      includesAny(name, ['손질오징어', '오징어']),
    gramsPerUnit: 250,
    unit: '마리',
  },
  {
    id: 'cocktail-shrimp',
    matches: (name) =>
      includesAny(name, ['칵테일새우', '중하']),
    gramsPerUnit: 6.7,
    unit: '개',
    countSize: '중간 크기',
    format: (rawAmount) => {
      const count = Math.max(
        1,
        Math.round(rawAmount),
      )

      return {
        displayAmount: count,
        displayText: `약 ${count}개`,
      }
    },
  },
  {
    id: 'large-shrimp',
    matches: (name) =>
      includesAny(name, ['큰새우', '대하']),
    gramsPerUnit: 25,
    unit: '마리',
  },
  {
    id: 'onion',
    matches: (name) => name.includes('양파'),
    gramsPerUnit: 150,
    unit: '개',
  },
  {
    id: 'sweet-potato',
    matches: (name) => name.includes('고구마'),
    gramsPerUnit: 150,
    unit: '개',
  },
  {
    id: 'potato',
    matches: (name) => name.includes('감자'),
    gramsPerUnit: 150,
    unit: '개',
  },
  {
    id: 'carrot',
    matches: (name) => name.includes('당근'),
    gramsPerUnit: 120,
    unit: '개',
    format: (rawAmount) =>
      rawAmount <= 0.55
        ? {
            displayAmount: 0.5,
            displayText: '1/2개',
          }
        : formatPracticalCount(rawAmount, '개'),
  },
  {
    id: 'egg',
    matches: (name) =>
      includesAny(name, ['달걀', '계란']),
    gramsPerUnit: 60,
    unit: '개',
  },
  {
    id: 'green-onion',
    matches: (name) => name.includes('대파'),
    gramsPerUnit: 120,
    unit: '대',
  },
  {
    id: 'scallion',
    matches: (name) => name.includes('쪽파'),
    gramsPerUnit: 25,
    unit: '줌',
    format: () => ({
      displayAmount: 1,
      displayText: '한 줌',
    }),
  },
  {
    id: 'whole-garlic',
    matches: (name) =>
      includesAny(name, ['통마늘', '마늘']) &&
      !name.includes('다진마늘'),
    gramsPerUnit: 4,
    unit: '쪽',
  },
  {
    id: 'chili-pepper',
    matches: (name) =>
      includesAny(name, [
        '청양고추',
        '풋고추',
        '홍고추',
        '고추',
      ]),
    gramsPerUnit: 5,
    unit: '개',
  },
  {
    id: 'zucchini',
    matches: (name) => name.includes('애호박'),
    gramsPerUnit: 300,
    unit: '개',
  },
  {
    id: 'radish',
    matches: (name) => name.includes('무'),
    gramsPerUnit: 800,
    unit: '개',
  },
  {
    id: 'cabbage',
    matches: (name) => name.includes('배추'),
    gramsPerUnit: 2000,
    unit: '포기',
  },
  {
    id: 'perilla-leaf',
    matches: (name) => name.includes('깻잎'),
    gramsPerUnit: 2,
    unit: '장',
  },
  {
    id: 'seaweed-sheet',
    matches: (name) => name === '김',
    gramsPerUnit: 3,
    unit: '장',
  },
  {
    id: 'bread-slice',
    matches: (name) => name.includes('식빵'),
    gramsPerUnit: 30,
    unit: '장',
  },
  {
    id: 'dumpling',
    matches: (name) => name.includes('만두'),
    gramsPerUnit: 25,
    unit: '개',
  },
  {
    id: 'ramyeon',
    matches: (name) => name.includes('라면'),
    gramsPerUnit: 120,
    unit: '봉지',
  },
  {
    id: 'udon-noodle',
    matches: (name) => name.includes('우동면'),
    gramsPerUnit: 200,
    unit: '봉',
  },
  {
    id: 'tuna-can',
    matches: (name) =>
      name === '참치' ||
      includesAny(name, ['참치캔', '참치통조림']),
    gramsPerUnit: 150,
    unit: '캔',
  },
  {
    id: 'sausage',
    matches: (name) => name.includes('소시지'),
    gramsPerUnit: 30,
    unit: '개',
  },
  {
    id: 'ham',
    matches: (name) => name.includes('햄'),
    gramsPerUnit: 200,
    unit: '팩',
  },
]

const tablespoonRules = [
  {
    id: 'soy-sauce',
    names: ['간장', '국간장', '진간장'],
    millilitersPerUnit: 15,
  },
  {
    id: 'cooking-oil',
    names: ['식용유', '참기름', '들기름'],
    millilitersPerUnit: 15,
  },
  {
    id: 'liquid-seasoning',
    names: ['식초', '맛술', '올리고당'],
    millilitersPerUnit: 15,
  },
  {
    id: 'paste-seasoning',
    names: ['고춧가루', '고추장', '된장'],
    millilitersPerUnit: 15,
  },
]

const teaspoonRules = [
  {
    id: 'minced-garlic',
    names: ['다진마늘'],
    millilitersPerUnit: 5,
  },
  {
    id: 'sugar',
    names: ['설탕'],
    millilitersPerUnit: 5,
  },
  {
    id: 'tuna-fish-sauce',
    names: ['참치액', '액젓'],
    millilitersPerUnit: 5,
  },
]

function getSensoryDisplay(
  name: string,
  amount: number,
) {
  if (name.includes('소금')) {
    if (amount <= 3) {
      return {
        unit: '한 꼬집',
        text: '한 꼬집',
      }
    }

    if (amount <= 6) {
      return {
        unit: '두 꼬집',
        text: '두 꼬집',
      }
    }

    return {
      unit: '약간',
      text: '약간',
    }
  }

  if (
    includesAny(name, [
      '후추',
      '후춧',
      '통깨',
      '참깨',
      '파슬리',
      '허브',
    ])
  ) {
    return {
      unit: '약간',
      text: '약간',
    }
  }

  return null
}

const liquidNames = [
  '물',
  '육수',
  '우유',
  '두유',
  '멸치다시마육수',
  '채수',
]

const countUnits = new Set([
  '개',
  '대',
  '모',
  '쪽',
  '장',
  '봉',
  '봉지',
  '팩',
  '캔',
  '포기',
  '공기',
  '마리',
  '손',
  '토막',
  '줌',
])

export function createIngredientComparisonValue(
  ingredient: IngredientAmount,
): IngredientComparisonValue {
  const name = normalizeName(ingredient.name)
  const unit = ingredient.unit.trim().toLowerCase()
  const householdRule = householdUnitRules.find(
    (rule) => rule.matches(name),
  )

  if (
    householdRule &&
    (unit === 'g' ||
      unit === '그램' ||
      unit === householdRule.unit.toLowerCase())
  ) {
    const sourceUnitFactor =
      unit === householdRule.unit.toLowerCase()
        ? householdRule.gramsPerUnit
        : 1

    return {
      key: householdRule.id,
      amount:
        ingredient.quantity *
        sourceUnitFactor,
      baseUnit: 'g',
      sourceUnitFactor,
    }
  }

  const teaspoonRule = teaspoonRules.find(
    (rule) => includesAny(name, rule.names),
  )
  const tablespoonRule = tablespoonRules.find(
    (rule) => includesAny(name, rule.names),
  )
  const cookingRule =
    teaspoonRule ?? tablespoonRule

  if (
    cookingRule &&
    ['g', '그램', 'ml', '밀리리터', '큰술', '작은술'].includes(
      unit,
    )
  ) {
    const sourceUnitFactor =
      unit === '큰술'
        ? 15
        : unit === '작은술'
          ? 5
          : 1

    return {
      key: cookingRule.id,
      amount:
        ingredient.quantity *
        sourceUnitFactor,
      baseUnit: 'ml',
      sourceUnitFactor,
    }
  }

  if (
    includesAny(name, liquidNames) &&
    ['ml', '밀리리터', 'l', '컵'].includes(unit)
  ) {
    const sourceUnitFactor =
      unit === 'l'
        ? 1000
        : unit === '컵'
          ? 200
          : 1

    return {
      key: `liquid:${name}`,
      amount:
        ingredient.quantity *
        sourceUnitFactor,
      baseUnit: 'ml',
      sourceUnitFactor,
    }
  }

  return {
    key: `exact:${name}:${unit}`,
    amount: ingredient.quantity,
    baseUnit: unit,
    sourceUnitFactor: 1,
  }
}

function createBasePresentation(
  ingredient: IngredientAmount,
): IngredientUnitPresentation {
  const trimmedName = ingredient.name.trim()
  const trimmedUnit = ingredient.unit.trim()

  return {
    ingredientName: trimmedName,
    canonicalIngredientId:
      normalizeName(trimmedName),
    baseAmount: ingredient.quantity,
    baseUnit: trimmedUnit,
    displayName: trimmedName,
    displayAmount: ingredient.quantity,
    displayUnit: trimmedUnit,
    displayText: `${formatNumber(
      ingredient.quantity,
    )}${trimmedUnit}`,
    measurementCategory: 'weight',
  }
}

export function createIngredientUnitPresentation(
  ingredient: IngredientAmount,
): IngredientUnitPresentation {
  const base = createBasePresentation(ingredient)
  const name = normalizeName(ingredient.name)
  const unit = ingredient.unit.trim().toLowerCase()
  const amount = ingredient.quantity

  if (!Number.isFinite(amount) || amount <= 0) {
    return base
  }

  const sensory = getSensoryDisplay(name, amount)

  if (sensory) {
    return {
      ...base,
      displayAmount: 1,
      displayUnit: sensory.unit,
      displayText: sensory.text,
      measurementCategory: 'sensory',
    }
  }

  if (unit === 'g' || unit === '그램') {
    const householdRule = householdUnitRules.find(
      (rule) => rule.matches(name),
    )

    if (householdRule) {
      const rawAmount =
        amount / householdRule.gramsPerUnit
      const formatted = householdRule.format
        ? householdRule.format(rawAmount, amount)
        : formatPracticalCount(
            rawAmount,
            householdRule.unit,
          )

      return {
        ...base,
        canonicalIngredientId:
          householdRule.id,
        displayName:
          householdRule.displayName ??
          base.displayName,
        displayAmount: formatted.displayAmount,
        displayUnit: householdRule.unit,
        displayText: formatted.displayText,
        ...(householdRule.preparationText
          ? {
              preparationText:
                householdRule.preparationText,
            }
          : {}),
        ...(householdRule.countSize
          ? { countSize: householdRule.countSize }
          : {}),
        measurementCategory: 'household-count',
      }
    }

    const teaspoonRule = teaspoonRules.find(
      (rule) => includesAny(name, rule.names),
    )

    if (teaspoonRule) {
      const formatted = formatCookingMeasure(
        amount / teaspoonRule.millilitersPerUnit,
        '작은술',
      )

      return {
        ...base,
        canonicalIngredientId: teaspoonRule.id,
        displayAmount: formatted.displayAmount,
        displayUnit: '작은술',
        displayText: formatted.displayText,
        measurementCategory: 'cooking-measure',
      }
    }

    const tablespoonRule = tablespoonRules.find(
      (rule) => includesAny(name, rule.names),
    )

    if (tablespoonRule) {
      const formatted = formatCookingMeasure(
        amount /
          tablespoonRule.millilitersPerUnit,
        '큰술',
      )

      return {
        ...base,
        canonicalIngredientId: tablespoonRule.id,
        displayAmount: formatted.displayAmount,
        displayUnit: '큰술',
        displayText: formatted.displayText,
        measurementCategory: 'cooking-measure',
      }
    }

    if (includesAny(name, liquidNames)) {
      const roundedAmount = roundLiquid(amount)

      return {
        ...base,
        displayAmount: roundedAmount,
        displayUnit: 'ml',
        displayText: `${roundedAmount}ml`,
        measurementCategory: 'cooking-measure',
      }
    }

    const roundedAmount = Math.max(
      1,
      Math.round(amount),
    )

    return {
      ...base,
      displayAmount: roundedAmount,
      displayUnit: 'g',
      displayText: `${roundedAmount}g`,
      measurementCategory: 'weight',
    }
  }

  if (
    unit === 'ml' ||
    unit === '밀리리터' ||
    unit === '큰술' ||
    unit === '작은술'
  ) {
    const milliliters =
      unit === '큰술'
        ? amount * 15
        : unit === '작은술'
          ? amount * 5
          : amount
    const teaspoonRule = teaspoonRules.find(
      (rule) => includesAny(name, rule.names),
    )
    const tablespoonRule = tablespoonRules.find(
      (rule) => includesAny(name, rule.names),
    )

    if (teaspoonRule) {
      const formatted = formatCookingMeasure(
        milliliters /
          teaspoonRule.millilitersPerUnit,
        '작은술',
      )

      return {
        ...base,
        canonicalIngredientId: teaspoonRule.id,
        displayAmount: formatted.displayAmount,
        displayUnit: '작은술',
        displayText: formatted.displayText,
        measurementCategory: 'cooking-measure',
      }
    }

    if (tablespoonRule) {
      const formatted = formatCookingMeasure(
        milliliters /
          tablespoonRule.millilitersPerUnit,
        '큰술',
      )

      return {
        ...base,
        canonicalIngredientId: tablespoonRule.id,
        displayAmount: formatted.displayAmount,
        displayUnit: '큰술',
        displayText: formatted.displayText,
        measurementCategory: 'cooking-measure',
      }
    }

    const roundedAmount = roundLiquid(milliliters)

    return {
      ...base,
      displayAmount: roundedAmount,
      displayUnit: 'ml',
      displayText: `${roundedAmount}ml`,
      measurementCategory: 'cooking-measure',
    }
  }

  if (countUnits.has(unit)) {
    const formatted =
      name.includes('배추김치') &&
      unit === '포기' &&
      amount <= 0.38
        ? {
            displayAmount: 0.25,
            displayText: '약 1/4포기',
          }
        : amount === 0.5
        ? {
            displayAmount: 0.5,
            displayText: formatHalfUnit(
              0.5,
              ingredient.unit.trim(),
              unit === '개' &&
                includesAny(name, ['레몬', '무']),
            ),
          }
        : formatPracticalCount(
            amount,
            ingredient.unit.trim(),
          )

    return {
      ...base,
      displayAmount: formatted.displayAmount,
      displayUnit: ingredient.unit.trim(),
      displayText: formatted.displayText,
      measurementCategory: 'household-count',
    }
  }

  if (
    unit === '약간' ||
    unit.includes('꼬집') ||
    unit === '줌'
  ) {
    return {
      ...base,
      displayAmount: 1,
      displayText:
        unit === '줌' ? '한 줌' : ingredient.unit.trim(),
      measurementCategory: 'sensory',
    }
  }

  return base
}

export function normalizeAiIngredientUnit<
  T extends IngredientAmount,
>(ingredient: T): T {
  const presentation =
    createIngredientUnitPresentation(ingredient)

  return {
    ...ingredient,
    quantity: presentation.displayAmount,
    unit: presentation.displayUnit,
  }
}

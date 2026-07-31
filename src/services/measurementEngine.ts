export type MeasurementTool =
  | 'measuring-spoon'
  | 'measuring-cup'
  | 'scale'
  | 'paper-cup'
  | 'rice-spoon'

export type MeasurementIngredient = {
  name: string
  amount: number
  unit: string
  displayText?: string
}

export type MeasurementSuggestion = {
  tool: MeasurementTool
  toolLabel: string
  measurement: string
}

export const measurementToolOptions: Array<{
  value: MeasurementTool
  label: string
}> = [
  {
    value: 'measuring-spoon',
    label: '계량스푼',
  },
  {
    value: 'measuring-cup',
    label: '계량컵',
  },
  {
    value: 'scale',
    label: '전자저울',
  },
  {
    value: 'paper-cup',
    label: '종이컵',
  },
  {
    value: 'rice-spoon',
    label: '밥숟가락',
  },
]

export const defaultMeasurementTools: MeasurementTool[] = [
  'measuring-spoon',
  'paper-cup',
  'rice-spoon',
]

export const tutorialMeasurementTools: MeasurementTool[] = [
  'measuring-spoon',
  'paper-cup',
  'rice-spoon',
  'scale',
]

export function toggleMeasurementTool(
  tools: MeasurementTool[],
  tool: MeasurementTool,
) {
  return tools.includes(tool)
    ? tools.filter((currentTool) => currentTool !== tool)
    : [...tools, tool]
}

const toolValues = new Set<MeasurementTool>(
  measurementToolOptions.map((option) => option.value),
)

function formatDecimal(value: number, digits = 1) {
  return Number(value.toFixed(digits)).toString()
}

function formatCupAmount(value: number) {
  const whole = Math.floor(value)
  const fraction = value - whole

  if (Math.abs(fraction - 0.5) < 0.08) {
    return whole > 0 ? `${whole}컵 반` : '반 컵'
  }

  if (Math.abs(fraction - 0.25) < 0.06) {
    return whole > 0
      ? `${whole}와 1/4컵`
      : '1/4컵'
  }

  if (Math.abs(fraction - 0.75) < 0.06) {
    return whole > 0
      ? `${whole}와 3/4컵`
      : '3/4컵'
  }

  return `${formatDecimal(value)}컵`
}

function formatPracticalCupAmount(value: number) {
  const practicalAmount =
    Math.max(0.25, Math.round(value * 4) / 4)
  const isApproximate =
    Math.abs(practicalAmount - value) >= 0.04

  return `${isApproximate ? '약 ' : ''}${formatCupAmount(
    practicalAmount,
  )}`
}

function formatApproximateSpoons(value: number) {
  if (value >= 0.75 && value <= 1.4) {
    return '1'
  }

  const roundedToHalf = Math.round(value * 2) / 2

  return formatDecimal(roundedToHalf)
}

function toMilliliters(amount: number, unit: string) {
  const normalizedUnit = unit.trim().toLowerCase()

  if (
    normalizedUnit === 'ml' ||
    normalizedUnit === '㎖'
  ) {
    return amount
  }

  if (normalizedUnit === 'l') {
    return amount * 1000
  }

  if (normalizedUnit === '큰술') {
    return amount * 15
  }

  if (normalizedUnit === '작은술') {
    return amount * 5
  }

  return null
}

function toGrams(amount: number, unit: string) {
  const normalizedUnit = unit.trim().toLowerCase()

  if (normalizedUnit === 'g') {
    return amount
  }

  if (normalizedUnit === 'kg') {
    return amount * 1000
  }

  return null
}

export function parseMeasurementTools(
  value: unknown,
): MeasurementTool[] {
  if (!Array.isArray(value)) {
    return [...defaultMeasurementTools]
  }

  const parsed = value.filter(
    (tool): tool is MeasurementTool =>
      typeof tool === 'string' &&
      toolValues.has(tool as MeasurementTool),
  )

  return Array.from(new Set(parsed))
}

export function createMeasurementSuggestions(
  ingredient: MeasurementIngredient,
  selectedTools: MeasurementTool[],
): MeasurementSuggestion[] {
  const selected = new Set(
    parseMeasurementTools(selectedTools),
  )
  const milliliters = toMilliliters(
    ingredient.amount,
    ingredient.unit,
  )
  const grams = toGrams(
    ingredient.amount,
    ingredient.unit,
  )
  const suggestions: MeasurementSuggestion[] = []

  const orderedTools: MeasurementTool[] =
    milliliters !== null && milliliters >= 100
      ? [
          'measuring-cup',
          'paper-cup',
          'measuring-spoon',
          'rice-spoon',
          'scale',
        ]
      : [
          'measuring-spoon',
          'rice-spoon',
          'measuring-cup',
          'paper-cup',
          'scale',
        ]

  orderedTools.forEach((toolValue) => {
    const tool = measurementToolOptions.find(
      (option) => option.value === toolValue,
    )

    if (!tool) {
      return
    }

    if (!selected.has(tool.value)) {
      return
    }

    if (
      tool.value === 'measuring-spoon' &&
      milliliters !== null &&
      milliliters <= 90
    ) {
      const useTeaspoon =
        milliliters < 15 ||
        milliliters % 15 !== 0
      const divisor = useTeaspoon ? 5 : 15
      const unit = useTeaspoon
        ? '작은술'
        : '큰술'

      suggestions.push({
        tool: tool.value,
        toolLabel: tool.label,
        measurement: `${formatDecimal(
          milliliters / divisor,
        )}${unit}`,
      })
      return
    }

    if (
      tool.value === 'measuring-cup' &&
      milliliters !== null &&
      milliliters >= 50
    ) {
      suggestions.push({
        tool: tool.value,
        toolLabel: tool.label,
        measurement: `${formatPracticalCupAmount(
          milliliters / 200,
        )} (200ml 기준)`,
      })
      return
    }

    if (
      tool.value === 'paper-cup' &&
      milliliters !== null &&
      milliliters >= 50
    ) {
      suggestions.push({
        tool: tool.value,
        toolLabel: tool.label,
        measurement: formatPracticalCupAmount(
          milliliters / 200,
        ),
      })
      return
    }

    if (
      tool.value === 'rice-spoon' &&
      milliliters !== null &&
      milliliters <= 90
    ) {
      suggestions.push({
        tool: tool.value,
        toolLabel: tool.label,
        measurement: `약 ${formatApproximateSpoons(
          milliliters / 12.5,
        )}스푼`,
      })
      return
    }

    if (
      tool.value === 'scale' &&
      grams !== null
    ) {
      suggestions.push({
        tool: tool.value,
        toolLabel: tool.label,
        measurement: `${formatDecimal(grams)}g`,
      })
    }
  })

  return suggestions
}

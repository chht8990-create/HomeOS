type JsonRecord = Record<string, unknown>

const rootKeys = {
  recommendations: 'r',
} as const

const recommendationKeys = {
  title: 'n',
  summary: 's',
  servings: 'v',
  estimatedMinutes: 'e',
  difficulty: 'd',
  prepTimeMinutes: 'p',
  cookTimeMinutes: 'c',
  calories: 'k',
  ingredients: 'i',
  missingIngredients: 'm',
  steps: 't',
  seasoningAdjustment: 'a',
  commonMistakes: 'f',
  storage: 'o',
  reheating: 'h',
  leftoverIdeas: 'l',
  servingSuggestions: 'g',
} as const

const ingredientKeys = {
  name: 'n',
  quantity: 'q',
  unit: 'u',
  available: 'a',
  group: 'g',
  note: 't',
  optional: 'o',
  substitute: 's',
} as const

const missingIngredientKeys = {
  name: 'n',
  quantity: 'q',
  unit: 'u',
} as const

const stepKeys = {
  order: 'o',
  title: 't',
  instruction: 'i',
  durationMinutes: 'd',
  heatLevel: 'h',
  completionCue: 'c',
  reason: 'r',
  warning: 'w',
  ingredientRefs: 'g',
} as const

type KeyMap = Readonly<Record<string, string>>
type ValueTransform = (value: unknown) => unknown
type NestedTransforms = Readonly<
  Record<string, ValueTransform>
>

function isRecord(value: unknown): value is JsonRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function mapArray(
  value: unknown,
  transform: ValueTransform,
) {
  return Array.isArray(value)
    ? value.map(transform)
    : value
}

function expandObject(
  value: unknown,
  keys: KeyMap,
  nested: NestedTransforms = {},
): unknown {
  if (!isRecord(value)) {
    return value
  }

  return Object.fromEntries(
    Object.entries(keys).map(([fullKey, compactKey]) => {
      const compactValue = value[compactKey]
      const transform = nested[fullKey]

      return [
        fullKey,
        transform
          ? transform(compactValue)
          : compactValue,
      ]
    }),
  )
}

function compactObject(
  value: unknown,
  keys: KeyMap,
  nested: NestedTransforms = {},
): unknown {
  if (!isRecord(value)) {
    return value
  }

  return Object.fromEntries(
    Object.entries(keys).map(([fullKey, compactKey]) => {
      const fullValue = value[fullKey]
      const transform = nested[fullKey]

      return [
        compactKey,
        transform ? transform(fullValue) : fullValue,
      ]
    }),
  )
}

function expandIngredient(value: unknown) {
  return expandObject(value, ingredientKeys)
}

function compactIngredient(value: unknown) {
  return compactObject(value, ingredientKeys)
}

function expandMissingIngredient(value: unknown) {
  return expandObject(value, missingIngredientKeys)
}

function compactMissingIngredient(value: unknown) {
  return compactObject(value, missingIngredientKeys)
}

function expandStep(value: unknown) {
  return expandObject(value, stepKeys)
}

function compactStep(value: unknown) {
  return compactObject(value, stepKeys)
}

function expandRecommendation(value: unknown) {
  return expandObject(value, recommendationKeys, {
    ingredients: (items) =>
      mapArray(items, expandIngredient),
    missingIngredients: (items) =>
      mapArray(items, expandMissingIngredient),
    steps: (items) => mapArray(items, expandStep),
  })
}

function compactRecommendation(value: unknown) {
  return compactObject(value, recommendationKeys, {
    ingredients: (items) =>
      mapArray(items, compactIngredient),
    missingIngredients: (items) =>
      mapArray(items, compactMissingIngredient),
    steps: (items) => mapArray(items, compactStep),
  })
}

export function expandCompactAiRecommendationOutput(
  value: unknown,
) {
  return expandObject(value, rootKeys, {
    recommendations: (items) =>
      mapArray(items, expandRecommendation),
  })
}

export function compactAiRecommendationOutputForTests(
  value: unknown,
) {
  return compactObject(value, rootKeys, {
    recommendations: (items) =>
      mapArray(items, compactRecommendation),
  })
}

export function parseCompactAiRecommendationText(
  value: string,
) {
  try {
    return expandCompactAiRecommendationOutput(
      JSON.parse(value) as unknown,
    )
  } catch {
    return null
  }
}

function requireSchemaRecord(
  value: unknown,
  code: string,
): JsonRecord {
  if (!isRecord(value)) {
    throw new Error(code)
  }

  return value
}

function compactObjectSchema(
  value: unknown,
  keys: KeyMap,
  nested: NestedTransforms = {},
) {
  const schema = requireSchemaRecord(
    value,
    'COMPACT_SCHEMA_OBJECT_INVALID',
  )
  const properties = requireSchemaRecord(
    schema.properties,
    'COMPACT_SCHEMA_PROPERTIES_INVALID',
  )
  const compactProperties: JsonRecord = {}

  for (const [fullKey, compactKey] of Object.entries(
    keys,
  )) {
    const property = requireSchemaRecord(
      properties[fullKey],
      `COMPACT_SCHEMA_PROPERTY_MISSING:${fullKey}`,
    )
    const transformed = nested[fullKey]
      ? nested[fullKey](property)
      : property
    const compactProperty = requireSchemaRecord(
      transformed,
      `COMPACT_SCHEMA_PROPERTY_INVALID:${fullKey}`,
    )

    compactProperties[compactKey] = {
      ...compactProperty,
      description: fullKey,
    }
  }

  const required = Array.isArray(schema.required)
    ? schema.required.map((key) => {
        const compactKey =
          typeof key === 'string' ? keys[key] : undefined

        if (!compactKey) {
          throw new Error(
            `COMPACT_SCHEMA_REQUIRED_INVALID:${String(key)}`,
          )
        }

        return compactKey
      })
    : schema.required

  return {
    ...schema,
    properties: compactProperties,
    required,
  }
}

function compactArrayItems(
  value: unknown,
  transform: ValueTransform,
) {
  const schema = requireSchemaRecord(
    value,
    'COMPACT_SCHEMA_ARRAY_INVALID',
  )

  return {
    ...schema,
    items: transform(schema.items),
  }
}

export function createCompactAiRecommendationSchema(
  fullSchema: unknown,
) {
  return compactObjectSchema(fullSchema, rootKeys, {
    recommendations: (recommendations) =>
      compactArrayItems(recommendations, (recommendation) =>
        compactObjectSchema(
          recommendation,
          recommendationKeys,
          {
            ingredients: (ingredients) =>
              compactArrayItems(
                ingredients,
                (ingredient) =>
                  compactObjectSchema(
                    ingredient,
                    ingredientKeys,
                  ),
              ),
            missingIngredients: (ingredients) =>
              compactArrayItems(
                ingredients,
                (ingredient) =>
                  compactObjectSchema(
                    ingredient,
                    missingIngredientKeys,
                  ),
              ),
            steps: (steps) =>
              compactArrayItems(steps, (step) =>
                compactObjectSchema(step, stepKeys),
              ),
          },
        ),
      ),
  })
}

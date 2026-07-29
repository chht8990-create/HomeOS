import type {
  PremiumRecipe,
  RecipeDifficulty,
  RecipeIngredient,
  RecipeIngredientGroups,
  RecipeStep,
} from '../types/recipe'

type IngredientSpec = [
  key: string,
  name: string,
  amount: number,
  unit: string,
  note?: string,
  substitute?: string[],
]

type IngredientGroupSpecs = {
  main: IngredientSpec[]
  seasoning: IngredientSpec[]
  broth: IngredientSpec[]
  garnish: IngredientSpec[]
  optional: IngredientSpec[]
}

type StepSpec = {
  title: string
  instruction: string
  durationMinutes: number
  heatLevel: string
  completionCue: string
  ingredientRefs: string[]
  reason?: string
  warning?: string
}

type PremiumRecipeSpec = {
  id: string
  name: string
  description: string
  difficulty: RecipeDifficulty
  prepTimeMinutes: number
  cookTimeMinutes: number
  calories: number
  groups: IngredientGroupSpecs
  steps: StepSpec[]
  seasoningAdjustment: string[]
  commonMistakes: string[]
  storage: string
  reheating: string
  leftoverIdeas: string[]
  servingSuggestions: string[]
}

function makeIngredients(
  recipeId: string,
  specs: IngredientSpec[],
  optional = false,
): RecipeIngredient[] {
  return specs.map(
    ([key, name, amount, unit, note, substitute]) => ({
      id: `${recipeId}-${key}`,
      name,
      amount,
      unit,
      ...(note ? { note } : {}),
      ...(optional ? { optional: true } : {}),
      ...(substitute?.length ? { substitute } : {}),
      inventoryMatchKey: name.trim().toLowerCase(),
    }),
  )
}

function makeGroups(
  recipeId: string,
  specs: IngredientGroupSpecs,
): RecipeIngredientGroups {
  return {
    mainIngredients: makeIngredients(recipeId, specs.main),
    seasoningIngredients: makeIngredients(
      recipeId,
      specs.seasoning,
    ),
    brothIngredients: makeIngredients(
      recipeId,
      specs.broth,
    ),
    garnishIngredients: makeIngredients(
      recipeId,
      specs.garnish,
    ),
    optionalIngredients: makeIngredients(
      recipeId,
      specs.optional,
      true,
    ),
  }
}

function makeStep(
  recipeId: string,
  step: StepSpec,
  index: number,
): RecipeStep {
  return {
    order: index + 1,
    title: step.title,
    instruction: step.instruction,
    minutes: step.durationMinutes,
    heat: step.heatLevel,
    doneness: step.completionCue,
    durationMinutes: step.durationMinutes,
    heatLevel: step.heatLevel,
    completionCue: step.completionCue,
    ...(step.reason ? { reason: step.reason } : {}),
    ...(step.warning ? { warning: step.warning } : {}),
    ingredientRefs: step.ingredientRefs.map(
      (key) => `${recipeId}-${key}`,
    ),
  }
}

function makeRecipe(
  spec: PremiumRecipeSpec,
): PremiumRecipe {
  const ingredientGroups = makeGroups(
    spec.id,
    spec.groups,
  )
  const requiredIngredients = [
    ...ingredientGroups.mainIngredients,
    ...ingredientGroups.seasoningIngredients,
    ...ingredientGroups.brothIngredients,
    ...ingredientGroups.garnishIngredients,
  ]
  const optionalIngredients =
    ingredientGroups.optionalIngredients

  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    localImage: spec.id,
    servings: 4,
    difficulty: spec.difficulty,
    prepMinutes: spec.prepTimeMinutes,
    cookMinutes: spec.cookTimeMinutes,
    prepTimeMinutes: spec.prepTimeMinutes,
    cookTimeMinutes: spec.cookTimeMinutes,
    totalTimeMinutes:
      spec.prepTimeMinutes + spec.cookTimeMinutes,
    calories: spec.calories,
    ingredientGroups,
    ingredients: requiredIngredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      quantity: ingredient.amount,
      unit: ingredient.unit,
    })),
    optionalIngredients: optionalIngredients.map(
      (ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        quantity: ingredient.amount,
        unit: ingredient.unit,
      }),
    ),
    substitutions: [
      ...requiredIngredients,
      ...optionalIngredients,
    ].flatMap((ingredient) =>
      ingredient.substitute?.length
        ? [
            {
              ingredientName: ingredient.name,
              alternatives: [...ingredient.substitute],
            },
          ]
        : ingredient.optional
          ? [
              {
                ingredientName: ingredient.name,
                alternatives: ['생략 가능'],
              },
            ]
          : [],
    ),
    steps: spec.steps.map((step, index) =>
      makeStep(spec.id, step, index),
    ),
    seasoningAdjustment: [
      ...spec.seasoningAdjustment,
    ],
    commonMistakes: [...spec.commonMistakes],
    storage: spec.storage,
    reheating: spec.reheating,
    leftoverIdeas: [...spec.leftoverIdeas],
    servingSuggestions: [...spec.servingSuggestions],
  }
}

const recipeSpecs: PremiumRecipeSpec[] = [
  {
    id: 'kimchi-stew',
    name: '김치찌개',
    description:
      '잘 익은 김치와 돼지고기를 충분히 볶아 깊고 시원한 국물을 내는 집밥 김치찌개예요.',
    difficulty: '쉬움',
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    calories: 390,
    groups: {
      main: [
        ['kimchi', '배추김치', 600, 'g', '잘 익은 김치, 4cm 폭', ['묵은지 600g']],
        ['pork', '돼지고기 목살', 300, 'g', '한입 크기', ['돼지고기 앞다리살 300g']],
        ['tofu', '두부', 300, 'g', '1.5cm 두께'],
        ['onion', '양파', 0.5, '개', '중간 크기, 굵게 채 썰기'],
        ['green-onion', '대파', 60, 'g', '어슷 썰기'],
      ],
      seasoning: [
        ['kimchi-juice', '김칫국물', 120, 'ml'],
        ['chili-powder', '고춧가루', 10, 'g'],
        ['garlic', '다진 마늘', 15, 'g'],
        ['soup-soy', '국간장', 15, 'ml'],
        ['sugar', '설탕', 4, 'g'],
        ['sesame-oil', '참기름', 10, 'ml'],
        ['salt', '소금', 2, 'g', '마지막 간 조절'],
      ],
      broth: [
        ['stock', '멸치 다시마 육수', 1000, 'ml', '따뜻하게 준비', ['물 1000ml']],
      ],
      garnish: [
        ['chili', '청양고추', 10, 'g', '어슷 썰기'],
      ],
      optional: [
        ['mushroom', '팽이버섯', 100, 'g', '밑동 제거'],
      ],
    },
    steps: [
      {
        title: '재료 손질',
        instruction:
          '배추김치는 4cm 폭, 돼지고기 목살은 한입 크기로 썰고 양파·대파·두부·청양고추를 분량대로 손질해요.',
        durationMinutes: 8,
        heatLevel: '불 사용 안 함',
        completionCue: '모든 재료의 크기가 고르게 준비돼요.',
        ingredientRefs: ['kimchi', 'pork', 'onion', 'green-onion', 'tofu', 'chili'],
      },
      {
        title: '고기 밑볶음',
        instruction:
          '두꺼운 냄비에 참기름을 두르고 돼지고기 목살을 넣어 표면이 하얗게 변할 때까지 볶아요.',
        durationMinutes: 4,
        heatLevel: '중불',
        completionCue: '고기 겉면의 붉은 기가 사라지고 가장자리가 살짝 갈색이에요.',
        ingredientRefs: ['sesame-oil', 'pork'],
        warning: '고기를 완전히 익히는 단계가 아니므로 센 불에서 태우지 마세요.',
      },
      {
        title: '김치 충분히 볶기',
        instruction:
          '배추김치·설탕·고춧가루를 넣고 김치 줄기가 반투명해질 때까지 볶아요.',
        durationMinutes: 6,
        heatLevel: '중불',
        completionCue: '김치가 부드러워지고 붉은 기름이 냄비 바닥에 보여요.',
        ingredientRefs: ['kimchi', 'sugar', 'chili-powder'],
        reason: '김치를 충분히 볶아야 군내가 줄고 감칠맛이 진해져요.',
      },
      {
        title: '국물 올리기',
        instruction:
          '김칫국물과 따뜻한 멸치 다시마 육수를 붓고 냄비 바닥을 긁어 섞은 뒤 끓여요.',
        durationMinutes: 5,
        heatLevel: '센불',
        completionCue: '국물 전체가 크게 끓고 거품이 가운데까지 올라와요.',
        ingredientRefs: ['kimchi-juice', 'stock'],
      },
      {
        title: '찌개 맛 우려내기',
        instruction:
          '끓기 시작하면 다진 마늘과 국간장을 넣고 뚜껑을 반쯤 덮어 끓여요.',
        durationMinutes: 12,
        heatLevel: '중약불',
        completionCue: '돼지고기 속이 완전히 익고 국물이 처음보다 약 15% 줄어요.',
        ingredientRefs: ['garlic', 'soup-soy', 'pork'],
        warning: '돼지고기 중심에 붉은 색이 남지 않도록 충분히 익혀요.',
      },
      {
        title: '채소 넣기',
        instruction:
          '양파를 넣어 3분간 끓인 뒤 두부를 겹치지 않게 올려요.',
        durationMinutes: 4,
        heatLevel: '중불',
        completionCue: '양파가 반투명하고 두부가 국물 속에서 뜨거워져요.',
        ingredientRefs: ['onion', 'tofu'],
      },
      {
        title: '마지막 간 맞추기',
        instruction:
          '국물을 맛보고 싱거우면 소금을 조금씩 넣은 뒤 대파와 청양고추를 넣어요.',
        durationMinutes: 2,
        heatLevel: '중약불',
        completionCue: '짠맛·신맛·매운맛이 한쪽으로 치우치지 않아요.',
        ingredientRefs: ['salt', 'green-onion', 'chili'],
      },
      {
        title: '뜸 들여 완성',
        instruction:
          '한소끔 더 끓이고 불을 끈 뒤 2분간 그대로 두어 맛을 안정시켜요.',
        durationMinutes: 3,
        heatLevel: '약불 후 불 끄기',
        completionCue: '두부까지 뜨겁고 국물이 걸쭉하지 않게 진해졌어요.',
        ingredientRefs: ['tofu'],
      },
    ],
    seasoningAdjustment: [
      '김치가 많이 시면 설탕을 1~2g 추가해요.',
      '김치가 짜면 국간장을 절반만 넣고 마지막에 간해요.',
    ],
    commonMistakes: [
      '김치를 바로 물에 끓이면 풋내와 신맛이 도드라질 수 있어요.',
      '두부를 일찍 넣고 오래 저으면 쉽게 부서져요.',
    ],
    storage: '완전히 식혀 밀폐 용기에 담아 냉장 2일 보관해요.',
    reheating: '먹을 만큼 덜어 중불에서 5분 이상 끓여 고기와 두부 중심까지 뜨겁게 데워요.',
    leftoverIdeas: ['남은 국물에 밥과 김가루를 넣어 김치죽으로 만들어요.'],
    servingSuggestions: ['갓 지은 쌀밥과 달걀말이를 곁들이면 한 끼가 든든해요.'],
  },
  {
    id: 'curry',
    name: '카레',
    description:
      '채소 모서리가 부드럽게 익고 소스가 매끈하게 어우러지는 가족용 돼지고기 카레예요.',
    difficulty: '쉬움',
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    calories: 610,
    groups: {
      main: [
        ['rice', '따뜻한 밥', 800, 'g'],
        ['pork', '돼지고기 등심', 300, 'g', '2cm 크기', ['닭다리살 300g']],
        ['potato', '감자', 300, 'g', '2cm 깍둑썰기'],
        ['onion', '양파', 1.5, '개', '중간 크기, 2cm 크기'],
        ['carrot', '당근', 120, 'g', '1.5cm 깍둑썰기'],
      ],
      seasoning: [
        ['curry', '고형 카레', 100, 'g', '중간 매운맛'],
        ['oil', '식용유', 15, 'ml'],
        ['salt', '소금', 2, 'g'],
        ['pepper', '후춧가루', 1, 'g'],
      ],
      broth: [
        ['water', '물', 900, 'ml', '따뜻하게 준비'],
      ],
      garnish: [
        ['parsley', '다진 파슬리', 2, 'g'],
      ],
      optional: [
        ['apple', '사과', 80, 'g', '곱게 갈기', ['배 80g']],
      ],
    },
    steps: [
      {
        title: '재료 크기 맞추기',
        instruction:
          '돼지고기 등심·감자·양파·당근을 지정한 크기로 썰고 감자는 찬물에 한 번 헹궈요.',
        durationMinutes: 8,
        heatLevel: '불 사용 안 함',
        completionCue: '단단한 당근은 감자보다 조금 작고 고기 크기는 채소와 비슷해요.',
        ingredientRefs: ['pork', 'potato', 'onion', 'carrot', 'water'],
      },
      {
        title: '고기 밑간',
        instruction:
          '돼지고기 등심에 소금과 후춧가루를 고루 묻혀 3분간 두어요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '고기 표면에 소금과 후춧가루가 고르게 붙어요.',
        ingredientRefs: ['pork', 'salt', 'pepper'],
      },
      {
        title: '고기 겉면 굽기',
        instruction:
          '냄비에 식용유를 두르고 돼지고기 등심을 넣어 겉면이 노릇해질 때까지 볶아요.',
        durationMinutes: 4,
        heatLevel: '중강불',
        completionCue: '고기 두 면이 갈색이고 냄비 바닥에 갈색 풍미층이 생겨요.',
        ingredientRefs: ['oil', 'pork'],
      },
      {
        title: '채소 볶기',
        instruction:
          '양파를 2분 볶은 뒤 감자와 당근을 넣어 표면이 살짝 투명해질 때까지 볶아요.',
        durationMinutes: 5,
        heatLevel: '중불',
        completionCue: '양파가 투명하고 감자 가장자리에 윤기가 돌아요.',
        ingredientRefs: ['onion', 'potato', 'carrot'],
      },
      {
        title: '물 붓고 끓이기',
        instruction:
          '따뜻한 물 900ml를 붓고 바닥을 긁어 섞은 뒤 끓으면 거품을 걷어요.',
        durationMinutes: 5,
        heatLevel: '센불',
        completionCue: '물 전체가 끓고 표면의 탁한 거품이 제거돼요.',
        ingredientRefs: ['water'],
      },
      {
        title: '속까지 익히기',
        instruction:
          '뚜껑을 반쯤 덮고 감자와 당근이 젓가락으로 찔릴 때까지 끓여요.',
        durationMinutes: 12,
        heatLevel: '중약불',
        completionCue: '감자 중심에 젓가락이 힘없이 들어가고 고기 속 붉은 기가 없어요.',
        ingredientRefs: ['potato', 'carrot', 'pork'],
      },
      {
        title: '카레 풀기',
        instruction:
          '불을 잠시 끄고 고형 카레를 잘게 나눠 넣어 덩어리 없이 완전히 풀어요.',
        durationMinutes: 3,
        heatLevel: '불 끄기',
        completionCue: '소스에 카레 덩어리가 보이지 않고 매끈해요.',
        ingredientRefs: ['curry'],
        warning: '센 불에서 카레를 바로 풀면 냄비 바닥이 쉽게 타요.',
      },
      {
        title: '농도 맞춰 완성',
        instruction:
          '다시 약불에 올려 바닥을 저으며 걸쭉해질 때까지 끓이고 밥 위에 담아 파슬리를 뿌려요.',
        durationMinutes: 5,
        heatLevel: '약불',
        completionCue: '주걱으로 그은 자국이 1초간 남고 소스가 밥 위에서 천천히 흘러요.',
        ingredientRefs: ['rice', 'parsley'],
      },
    ],
    seasoningAdjustment: [
      '카레가 짜면 따뜻한 물을 50ml씩 추가해 농도를 맞춰요.',
      '아이와 먹을 때는 순한 카레를 사용하고 사과를 넣어 단맛을 더해요.',
    ],
    commonMistakes: [
      '카레를 넣은 뒤 센 불로 끓이면 바닥이 타고 쓴맛이 나요.',
      '채소 크기가 제각각이면 익는 정도가 달라져요.',
    ],
    storage: '밥과 카레를 분리해 냉장 2일 또는 1회분씩 냉동 2주 보관해요.',
    reheating: '카레에 물 15ml를 더해 냄비 약불 또는 전자레인지로 중심까지 뜨겁게 데워요.',
    leftoverIdeas: ['남은 카레를 식빵과 치즈 사이에 넣어 카레 토스트로 만들어요.'],
    servingSuggestions: ['오이피클이나 양배추 샐러드를 곁들이면 맛이 산뜻해져요.'],
  },
  {
    id: 'spicy-pork',
    name: '제육볶음',
    description:
      '얇은 돼지고기에 고추장 양념을 재워 센 불에 빠르게 볶아 촉촉하고 매콤하게 완성해요.',
    difficulty: '보통',
    prepTimeMinutes: 20,
    cookTimeMinutes: 18,
    calories: 540,
    groups: {
      main: [
        ['pork', '돼지고기 앞다리살', 600, 'g', '3mm 두께'],
        ['onion', '양파', 1, '개', '중간 크기, 1cm 채 썰기'],
        ['cabbage', '양배추', 200, 'g', '4cm 크기'],
        ['green-onion', '대파', 80, 'g', '어슷 썰기'],
        ['carrot', '당근', 80, 'g', '얇은 반달 썰기'],
      ],
      seasoning: [
        ['gochujang', '고추장', 45, 'g'],
        ['chili-powder', '고춧가루', 15, 'g'],
        ['soy', '진간장', 30, 'ml'],
        ['sugar', '설탕', 18, 'g'],
        ['rice-wine', '맛술', 30, 'ml'],
        ['garlic', '다진 마늘', 20, 'g'],
        ['sesame-oil', '참기름', 10, 'ml'],
        ['oil', '식용유', 15, 'ml'],
        ['pepper', '후춧가루', 1, 'g'],
      ],
      broth: [],
      garnish: [
        ['sesame', '볶은 참깨', 5, 'g'],
      ],
      optional: [
        ['chili', '청양고추', 10, 'g', '어슷 썰기'],
      ],
    },
    steps: [
      {
        title: '양념장 만들기',
        instruction:
          '고추장·고춧가루·진간장·설탕·맛술·다진 마늘·후춧가루를 볼에 넣어 설탕이 녹도록 섞어요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '양념이 매끈하고 설탕 알갱이가 거의 느껴지지 않아요.',
        ingredientRefs: ['gochujang', 'chili-powder', 'soy', 'sugar', 'rice-wine', 'garlic', 'pepper'],
      },
      {
        title: '고기 재우기',
        instruction:
          '돼지고기 앞다리살에 양념장 3분의 2를 고루 묻혀 냉장고에서 재워요.',
        durationMinutes: 12,
        heatLevel: '불 사용 안 함',
        completionCue: '고기 조각마다 붉은 양념이 고르게 묻어요.',
        ingredientRefs: ['pork', 'gochujang'],
      },
      {
        title: '채소 손질',
        instruction:
          '양파·양배추·대파·당근을 지정한 크기로 썰어 단단한 채소와 부드러운 채소를 나눠 둬요.',
        durationMinutes: 6,
        heatLevel: '불 사용 안 함',
        completionCue: '당근은 얇고 양배추와 양파는 한입 크기로 준비돼요.',
        ingredientRefs: ['onion', 'cabbage', 'green-onion', 'carrot'],
      },
      {
        title: '팬 충분히 예열',
        instruction:
          '넓은 팬을 1분 예열하고 식용유를 둘러 팬 바닥 전체에 퍼뜨려요.',
        durationMinutes: 2,
        heatLevel: '중강불',
        completionCue: '식용유가 물결처럼 얇게 퍼지되 연기는 나지 않아요.',
        ingredientRefs: ['oil'],
      },
      {
        title: '고기 펼쳐 굽기',
        instruction:
          '재운 돼지고기를 팬에 넓게 펼쳐 2분간 건드리지 않은 뒤 뒤집어 볶아요.',
        durationMinutes: 5,
        heatLevel: '중강불',
        completionCue: '고기 가장자리가 갈색이고 속 붉은 기가 거의 사라져요.',
        ingredientRefs: ['pork'],
        warning: '팬이 작으면 두 번에 나눠 볶아 고기가 삶아지지 않게 해요.',
      },
      {
        title: '단단한 채소 익히기',
        instruction:
          '당근과 양파를 넣고 남겨 둔 양념장을 더해 양파가 반투명해질 때까지 볶아요.',
        durationMinutes: 3,
        heatLevel: '중불',
        completionCue: '당근이 휘어지고 양파 가장자리가 투명해요.',
        ingredientRefs: ['carrot', 'onion', 'gochujang'],
      },
      {
        title: '양배추와 대파 넣기',
        instruction:
          '양배추와 대파를 넣어 숨이 절반만 죽도록 빠르게 섞어 볶아요.',
        durationMinutes: 3,
        heatLevel: '중강불',
        completionCue: '양배추는 선명한 색과 아삭함이 남고 고기는 완전히 익어요.',
        ingredientRefs: ['cabbage', 'green-onion', 'pork'],
      },
      {
        title: '향 내어 마무리',
        instruction:
          '불을 끄고 참기름과 볶은 참깨를 넣어 한 번 섞은 뒤 바로 담아요.',
        durationMinutes: 1,
        heatLevel: '불 끄기',
        completionCue: '팬 바닥에 물이 흥건하지 않고 양념이 고기에 윤기 있게 붙어요.',
        ingredientRefs: ['sesame-oil', 'sesame'],
      },
    ],
    seasoningAdjustment: [
      '덜 맵게 먹으려면 고춧가루를 5g 줄이고 고추장은 그대로 사용해요.',
      '단맛을 줄이려면 설탕을 12g만 넣고 양파를 충분히 볶아요.',
    ],
    commonMistakes: [
      '차가운 팬에 고기를 한꺼번에 넣으면 물이 생겨 볶음 맛이 약해져요.',
      '참기름을 처음부터 넣으면 향이 날아가고 쉽게 탈 수 있어요.',
    ],
    storage: '완전히 식혀 냉장 2일 보관하고 재냉동은 피하세요.',
    reheating: '팬에 물 15ml를 넣고 중불에서 고기 중심까지 충분히 뜨거워지도록 볶아요.',
    leftoverIdeas: ['남은 제육볶음을 잘게 잘라 김치와 함께 볶음밥으로 활용해요.'],
    servingSuggestions: ['상추·깻잎·쌈장과 함께 내면 매운맛이 부드러워져요.'],
  },
  {
    id: 'soybean-paste-stew',
    name: '된장찌개',
    description:
      '멸치 다시마 육수에 된장을 풀고 채소를 순서대로 익혀 구수하고 깔끔하게 끓여요.',
    difficulty: '쉬움',
    prepTimeMinutes: 12,
    cookTimeMinutes: 22,
    calories: 210,
    groups: {
      main: [
        ['tofu', '두부', 300, 'g', '2cm 크기'],
        ['zucchini', '애호박', 180, 'g', '반달 썰기'],
        ['potato', '감자', 180, 'g', '1.5cm 깍둑썰기'],
        ['onion', '양파', 0.5, '개', '큰 크기, 2cm 크기'],
        ['mushroom', '표고버섯', 80, 'g', '0.5cm 슬라이스'],
        ['green-onion', '대파', 50, 'g', '어슷 썰기'],
      ],
      seasoning: [
        ['doenjang', '된장', 55, 'g'],
        ['gochujang', '고추장', 10, 'g'],
        ['garlic', '다진 마늘', 12, 'g'],
        ['chili-powder', '고춧가루', 5, 'g'],
      ],
      broth: [
        ['stock', '멸치 다시마 육수', 900, 'ml', '따뜻하게 준비'],
      ],
      garnish: [
        ['chili', '청양고추', 10, 'g', '어슷 썰기'],
      ],
      optional: [
        ['clam', '바지락', 200, 'g', '해감 완료', ['차돌박이 150g']],
      ],
    },
    steps: [
      {
        title: '채소와 두부 손질',
        instruction:
          '감자·애호박·양파·표고버섯·대파·청양고추와 두부를 지정한 크기로 썰어요.',
        durationMinutes: 7,
        heatLevel: '불 사용 안 함',
        completionCue: '감자는 작고 단단하게, 애호박과 두부는 조금 크게 준비돼요.',
        ingredientRefs: ['potato', 'zucchini', 'onion', 'mushroom', 'green-onion', 'chili', 'tofu'],
      },
      {
        title: '육수 끓이기',
        instruction:
          '냄비에 멸치 다시마 육수를 붓고 센불에서 끓여요.',
        durationMinutes: 4,
        heatLevel: '센불',
        completionCue: '육수 전체가 크게 끓어요.',
        ingredientRefs: ['stock'],
      },
      {
        title: '된장 곱게 풀기',
        instruction:
          '체에 된장과 고추장을 담아 끓는 육수에 숟가락으로 곱게 풀어요.',
        durationMinutes: 2,
        heatLevel: '중불',
        completionCue: '된장 덩어리가 보이지 않고 국물 색이 균일해요.',
        ingredientRefs: ['doenjang', 'gochujang', 'stock'],
      },
      {
        title: '감자 먼저 익히기',
        instruction:
          '감자를 넣고 가장자리가 반투명해질 때까지 끓여요.',
        durationMinutes: 6,
        heatLevel: '중불',
        completionCue: '감자 겉은 익었지만 중심은 아직 단단해요.',
        ingredientRefs: ['potato'],
      },
      {
        title: '채소 맛 더하기',
        instruction:
          '양파와 표고버섯을 넣고 향이 국물에 배도록 끓여요.',
        durationMinutes: 4,
        heatLevel: '중불',
        completionCue: '양파가 투명하고 표고버섯이 부드러워요.',
        ingredientRefs: ['onion', 'mushroom'],
      },
      {
        title: '애호박과 두부 넣기',
        instruction:
          '애호박·두부·다진 마늘·고춧가루를 넣고 두부가 부서지지 않게 한 번만 섞어요.',
        durationMinutes: 4,
        heatLevel: '중약불',
        completionCue: '애호박 중심이 살짝 투명하고 두부가 국물 속에서 뜨거워요.',
        ingredientRefs: ['zucchini', 'tofu', 'garlic', 'chili-powder'],
      },
      {
        title: '향 채소 넣기',
        instruction:
          '대파와 청양고추를 넣고 2분간 더 끓여 풋내를 날려요.',
        durationMinutes: 2,
        heatLevel: '중약불',
        completionCue: '대파 향이 올라오고 청양고추 색이 선명해요.',
        ingredientRefs: ['green-onion', 'chili'],
      },
      {
        title: '간과 익힘 확인',
        instruction:
          '감자를 젓가락으로 찔러 부드럽게 들어가고 국물이 구수하면 불을 꺼요.',
        durationMinutes: 2,
        heatLevel: '약불',
        completionCue: '감자 중심까지 익고 된장 국물이 짜지 않게 진해요.',
        ingredientRefs: ['potato', 'doenjang'],
      },
    ],
    seasoningAdjustment: [
      '집된장이 짜면 된장을 45g만 넣고 마지막에 추가해요.',
      '더 담백하게 먹으려면 고추장과 고춧가루를 빼도 돼요.',
    ],
    commonMistakes: [
      '된장을 오래 팔팔 끓이면 향이 둔해지고 짠맛이 강해져요.',
      '애호박과 두부를 너무 일찍 넣으면 쉽게 무르고 부서져요.',
    ],
    storage: '완전히 식혀 냉장 2일 보관해요. 조개를 넣었다면 당일 먹는 것을 권해요.',
    reheating: '냄비에서 5분 이상 끓여 두부 중심까지 충분히 데워요.',
    leftoverIdeas: ['남은 국물에 밥과 다진 채소를 넣어 된장죽으로 활용해요.'],
    servingSuggestions: ['보리밥과 구운 김, 나물을 곁들이면 잘 어울려요.'],
  },
  {
    id: 'egg-fried-rice',
    name: '계란볶음밥',
    description:
      '차갑게 식힌 밥알을 달걀과 대파 기름에 빠르게 볶아 고슬고슬하게 완성해요.',
    difficulty: '쉬움',
    prepTimeMinutes: 10,
    cookTimeMinutes: 12,
    calories: 520,
    groups: {
      main: [
        ['rice', '찬밥', 800, 'g', '덩어리 풀기'],
        ['egg', '달걀', 4, '개'],
        ['green-onion', '대파', 100, 'g', '잘게 썰기'],
        ['carrot', '당근', 80, 'g', '5mm 다지기'],
        ['ham', '슬라이스 햄', 120, 'g', '8mm 다지기', ['닭가슴살 120g']],
      ],
      seasoning: [
        ['oil', '식용유', 30, 'ml'],
        ['soy', '진간장', 20, 'ml'],
        ['salt', '소금', 3, 'g'],
        ['pepper', '후춧가루', 1, 'g'],
        ['sesame-oil', '참기름', 8, 'ml'],
      ],
      broth: [],
      garnish: [
        ['sesame', '볶은 참깨', 4, 'g'],
      ],
      optional: [
        ['peas', '완두콩', 60, 'g', '데친 것', ['옥수수 60g']],
      ],
    },
    steps: [
      {
        title: '밥과 재료 준비',
        instruction:
          '찬밥은 손이나 주걱으로 덩어리를 풀고 대파·당근·슬라이스 햄을 잘게 썰어요.',
        durationMinutes: 5,
        heatLevel: '불 사용 안 함',
        completionCue: '밥알이 낱알로 풀리고 채소와 햄 크기가 고르게 작아요.',
        ingredientRefs: ['rice', 'green-onion', 'carrot', 'ham'],
      },
      {
        title: '달걀 풀기',
        instruction:
          '달걀을 볼에 깨고 소금 1g을 넣어 흰자와 노른자가 섞일 만큼만 풀어요.',
        durationMinutes: 1,
        heatLevel: '불 사용 안 함',
        completionCue: '달걀물이 균일한 노란색이지만 거품은 많지 않아요.',
        ingredientRefs: ['egg', 'salt'],
      },
      {
        title: '파 기름 내기',
        instruction:
          '넓은 팬에 식용유 20ml와 대파를 넣고 향이 올라올 때까지 볶아요.',
        durationMinutes: 2,
        heatLevel: '중불',
        completionCue: '대파 가장자리가 노릇하고 식용유에 파 향이 배어요.',
        ingredientRefs: ['oil', 'green-onion'],
      },
      {
        title: '달걀 반숙으로 익히기',
        instruction:
          '팬 한쪽에 식용유 10ml를 더하고 달걀물을 부어 큰 덩어리로 저어요.',
        durationMinutes: 1,
        heatLevel: '중강불',
        completionCue: '달걀 표면은 익고 안쪽은 촉촉한 반숙이에요.',
        ingredientRefs: ['oil', 'egg'],
      },
      {
        title: '햄과 당근 볶기',
        instruction:
          '슬라이스 햄과 당근을 넣고 당근 색이 선명해질 때까지 달걀과 함께 볶아요.',
        durationMinutes: 2,
        heatLevel: '중강불',
        completionCue: '햄 가장자리가 노릇하고 당근은 씹을 때 단단하지 않아요.',
        ingredientRefs: ['ham', 'carrot', 'egg'],
      },
      {
        title: '밥알 코팅하기',
        instruction:
          '찬밥을 넣고 주걱으로 누르며 빠르게 풀어 모든 밥알에 기름과 달걀을 입혀요.',
        durationMinutes: 3,
        heatLevel: '강불',
        completionCue: '밥알이 낱알로 흩어지고 팬을 흔들 때 가볍게 움직여요.',
        ingredientRefs: ['rice', 'egg'],
      },
      {
        title: '간장 향 입히기',
        instruction:
          '팬 가장자리에 진간장을 둘러 10초 끓인 뒤 밥과 섞고 남은 소금과 후춧가루로 간해요.',
        durationMinutes: 2,
        heatLevel: '강불',
        completionCue: '간장 향은 나지만 밥 색이 지나치게 검지 않고 고슬고슬해요.',
        ingredientRefs: ['soy', 'salt', 'pepper', 'rice'],
      },
      {
        title: '불 끄고 마무리',
        instruction:
          '불을 끄고 참기름과 볶은 참깨를 넣어 20초간 섞어 바로 담아요.',
        durationMinutes: 1,
        heatLevel: '불 끄기',
        completionCue: '참기름 향이 살아 있고 팬 바닥에 기름이나 수분이 고이지 않아요.',
        ingredientRefs: ['sesame-oil', 'sesame'],
      },
    ],
    seasoningAdjustment: [
      '햄이 짜면 소금은 달걀에 넣는 1g만 사용해요.',
      '밥이 매우 말랐다면 식용유를 5ml 더해 밥알을 부드럽게 풀어요.',
    ],
    commonMistakes: [
      '따뜻하고 질척한 밥을 쓰면 밥알이 뭉치기 쉬워요.',
      '한 번에 너무 많은 양을 작은 팬에 볶으면 고슬한 식감이 나지 않아요.',
    ],
    storage: '완전히 식혀 밀폐 용기에 담아 냉장 1일 보관해요.',
    reheating: '팬에 물 10ml를 뿌려 중불에서 볶거나 전자레인지로 중심까지 뜨겁게 데워요.',
    leftoverIdeas: ['남은 볶음밥을 납작하게 구워 누룽지 볶음밥으로 만들어요.'],
    servingSuggestions: ['오이무침이나 맑은 달걀국을 곁들이면 균형이 좋아요.'],
  },
  {
    id: 'chicken-galbi',
    name: '닭갈비',
    description:
      '닭다리살과 단단한 채소부터 차례로 익혀 매콤한 양념이 촉촉하게 배는 철판식 닭갈비예요.',
    difficulty: '보통',
    prepTimeMinutes: 25,
    cookTimeMinutes: 22,
    calories: 560,
    groups: {
      main: [
        ['chicken', '닭다리살', 700, 'g', '4cm 크기'],
        ['cabbage', '양배추', 350, 'g', '5cm 크기'],
        ['sweet-potato', '고구마', 250, 'g', '0.8cm 반달 썰기'],
        ['onion', '양파', 1, '개', '중간 크기, 1.5cm 채 썰기'],
        ['rice-cake', '떡볶이 떡', 200, 'g', '찬물에 헹구기'],
        ['green-onion', '대파', 80, 'g', '5cm 길이'],
      ],
      seasoning: [
        ['gochujang', '고추장', 50, 'g'],
        ['chili-powder', '고춧가루', 18, 'g'],
        ['soy', '진간장', 30, 'ml'],
        ['sugar', '설탕', 20, 'g'],
        ['rice-wine', '맛술', 30, 'ml'],
        ['garlic', '다진 마늘', 20, 'g'],
        ['ginger', '다진 생강', 4, 'g'],
        ['sesame-oil', '참기름', 10, 'ml'],
        ['oil', '식용유', 15, 'ml'],
      ],
      broth: [
        ['water', '물', 100, 'ml'],
      ],
      garnish: [
        ['perilla', '깻잎', 20, 'g', '2cm 폭'],
        ['sesame', '볶은 참깨', 5, 'g'],
      ],
      optional: [
        ['cheese', '모차렐라 치즈', 100, 'g'],
      ],
    },
    steps: [
      {
        title: '양념장 섞기',
        instruction:
          '고추장·고춧가루·진간장·설탕·맛술·다진 마늘·다진 생강·참기름을 매끈하게 섞어요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '설탕이 녹고 양념에 마른 가루 덩어리가 없어요.',
        ingredientRefs: ['gochujang', 'chili-powder', 'soy', 'sugar', 'rice-wine', 'garlic', 'ginger', 'sesame-oil'],
      },
      {
        title: '닭고기 재우기',
        instruction:
          '닭다리살에 양념장 절반을 버무려 냉장고에서 재워요.',
        durationMinutes: 15,
        heatLevel: '불 사용 안 함',
        completionCue: '닭고기 표면 전체에 양념이 고르게 묻어요.',
        ingredientRefs: ['chicken', 'gochujang'],
      },
      {
        title: '채소와 떡 준비',
        instruction:
          '양배추·고구마·양파·대파·깻잎을 썰고 떡볶이 떡은 찬물에 헹궈 서로 떼어 둬요.',
        durationMinutes: 8,
        heatLevel: '불 사용 안 함',
        completionCue: '고구마가 일정하게 얇고 떡이 서로 붙지 않아요.',
        ingredientRefs: ['cabbage', 'sweet-potato', 'onion', 'green-onion', 'perilla', 'rice-cake', 'water'],
      },
      {
        title: '고구마 먼저 굽기',
        instruction:
          '넓은 팬에 식용유를 두르고 고구마를 겹치지 않게 놓아 양면을 굽어요.',
        durationMinutes: 4,
        heatLevel: '중불',
        completionCue: '고구마 표면에 갈색 점이 생기고 가장자리가 반투명해요.',
        ingredientRefs: ['oil', 'sweet-potato'],
      },
      {
        title: '닭고기 익히기',
        instruction:
          '재운 닭다리살을 넣어 겉면의 붉은 기가 사라지도록 펼쳐 볶아요.',
        durationMinutes: 6,
        heatLevel: '중강불',
        completionCue: '닭고기 표면이 익고 가장 두꺼운 조각의 중심만 옅은 분홍색이에요.',
        ingredientRefs: ['chicken'],
      },
      {
        title: '채소와 떡 넣기',
        instruction:
          '양배추·양파·떡볶이 떡·남은 양념장·물 100ml를 넣고 뚜껑을 덮어요.',
        durationMinutes: 6,
        heatLevel: '중불',
        completionCue: '양배추 숨이 절반 줄고 떡이 말랑해요.',
        ingredientRefs: ['cabbage', 'onion', 'rice-cake', 'gochujang', 'water'],
      },
      {
        title: '수분 날리며 볶기',
        instruction:
          '뚜껑을 열고 대파를 넣어 양념이 재료에 걸쭉하게 달라붙을 때까지 볶아요.',
        durationMinutes: 4,
        heatLevel: '중강불',
        completionCue: '닭고기 속 붉은 기가 전혀 없고 팬 바닥에 묽은 물이 남지 않아요.',
        ingredientRefs: ['green-onion', 'chicken'],
        warning: '닭고기는 중심까지 완전히 익혀야 해요.',
      },
      {
        title: '깻잎 향으로 완성',
        instruction:
          '불을 끄고 깻잎과 볶은 참깨를 넣어 20초간 뒤집어 섞어요.',
        durationMinutes: 1,
        heatLevel: '불 끄기',
        completionCue: '깻잎은 향이 살아 있고 닭갈비 표면에 윤기가 나요.',
        ingredientRefs: ['perilla', 'sesame'],
      },
    ],
    seasoningAdjustment: [
      '아이와 먹을 때는 고춧가루를 8g으로 줄이고 설탕을 3g 늘려요.',
      '양념이 짜면 물을 30ml 더해 수분을 날리며 볶아요.',
    ],
    commonMistakes: [
      '고구마를 두껍게 썰면 닭고기가 익어도 속이 단단할 수 있어요.',
      '깻잎을 일찍 넣으면 색과 향이 사라져요.',
    ],
    storage: '완전히 식혀 냉장 2일 보관해요.',
    reheating: '팬에 물 20ml를 넣고 중불에서 닭고기 중심까지 뜨겁게 볶아요.',
    leftoverIdeas: ['남은 양념에 밥·김가루·참기름을 넣어 볶음밥으로 만들어요.'],
    servingSuggestions: ['쌈무나 시원한 동치미를 곁들이면 매운맛이 잘 정리돼요.'],
  },
  {
    id: 'beef-bulgogi',
    name: '소불고기',
    description:
      '배즙을 넣은 간장 양념에 소고기를 재워 채소와 함께 촉촉하고 부드럽게 볶아요.',
    difficulty: '쉬움',
    prepTimeMinutes: 25,
    cookTimeMinutes: 12,
    calories: 480,
    groups: {
      main: [
        ['beef', '소고기 불고기감', 600, 'g'],
        ['onion', '양파', 1, '개', '중간 크기, 0.7cm 채 썰기'],
        ['mushroom', '표고버섯', 100, 'g', '얇게 썰기'],
        ['carrot', '당근', 80, 'g', '가늘게 채 썰기'],
        ['green-onion', '대파', 80, 'g', '어슷 썰기'],
      ],
      seasoning: [
        ['soy', '진간장', 60, 'ml'],
        ['pear', '배즙', 100, 'ml', '무가당', ['사과즙 100ml']],
        ['sugar', '설탕', 18, 'g'],
        ['rice-wine', '맛술', 30, 'ml'],
        ['garlic', '다진 마늘', 18, 'g'],
        ['sesame-oil', '참기름', 12, 'ml'],
        ['pepper', '후춧가루', 1, 'g'],
        ['oil', '식용유', 10, 'ml'],
      ],
      broth: [],
      garnish: [
        ['sesame', '볶은 참깨', 5, 'g'],
      ],
      optional: [
        ['glass-noodle', '불린 당면', 150, 'g'],
      ],
    },
    steps: [
      {
        title: '간장 양념 만들기',
        instruction:
          '진간장·배즙·설탕·맛술·다진 마늘·참기름·후춧가루를 섞어 설탕을 녹여요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '양념이 한 색으로 섞이고 설탕 알갱이가 남지 않아요.',
        ingredientRefs: ['soy', 'pear', 'sugar', 'rice-wine', 'garlic', 'sesame-oil', 'pepper'],
      },
      {
        title: '고기 사이 풀기',
        instruction:
          '소고기 불고기감을 한 장씩 떼어 큰 지방과 질긴 막을 정리해요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '고기가 뭉치지 않고 얇은 조각으로 고르게 풀려요.',
        ingredientRefs: ['beef'],
      },
      {
        title: '고기 재우기',
        instruction:
          '소고기에 간장 양념을 넣고 가볍게 주무른 뒤 냉장고에서 재워요.',
        durationMinutes: 15,
        heatLevel: '불 사용 안 함',
        completionCue: '양념이 고기 전체에 스며들고 볼 바닥에 설탕이 남지 않아요.',
        ingredientRefs: ['beef', 'soy'],
      },
      {
        title: '채소 손질',
        instruction:
          '양파·표고버섯·당근·대파를 얇고 비슷한 길이로 썰어요.',
        durationMinutes: 6,
        heatLevel: '불 사용 안 함',
        completionCue: '단단한 당근은 가장 가늘고 나머지 채소는 비슷한 두께예요.',
        ingredientRefs: ['onion', 'mushroom', 'carrot', 'green-onion'],
      },
      {
        title: '팬과 기름 예열',
        instruction:
          '넓은 팬을 달군 뒤 식용유를 둘러 얇게 퍼뜨려요.',
        durationMinutes: 1,
        heatLevel: '중강불',
        completionCue: '식용유가 빠르게 퍼지지만 연기는 나지 않아요.',
        ingredientRefs: ['oil'],
      },
      {
        title: '고기 펼쳐 볶기',
        instruction:
          '재운 소고기를 두 번에 나눠 펼쳐 넣고 겉면 색이 변하도록 볶아요.',
        durationMinutes: 5,
        heatLevel: '중강불',
        completionCue: '고기가 회갈색으로 변하고 질긴 물이 많이 생기지 않아요.',
        ingredientRefs: ['beef'],
      },
      {
        title: '채소 함께 익히기',
        instruction:
          '양파·표고버섯·당근을 넣고 채소가 부드러워질 때까지 볶아요.',
        durationMinutes: 4,
        heatLevel: '중불',
        completionCue: '양파가 투명하고 소고기 속 붉은 기가 완전히 사라져요.',
        ingredientRefs: ['onion', 'mushroom', 'carrot', 'beef'],
      },
      {
        title: '대파와 참깨 마무리',
        instruction:
          '대파를 넣어 1분 볶고 불을 끈 뒤 볶은 참깨를 뿌려요.',
        durationMinutes: 2,
        heatLevel: '중불 후 불 끄기',
        completionCue: '대파 향이 나고 양념 국물이 소고기에 촉촉하게 남아요.',
        ingredientRefs: ['green-onion', 'sesame'],
      },
    ],
    seasoningAdjustment: [
      '배즙이 매우 달면 설탕을 10g만 사용해요.',
      '간이 세면 양파 50g을 더 넣어 함께 볶아요.',
    ],
    commonMistakes: [
      '고기를 오래 재우면 얇은 고기 식감이 물러질 수 있어요.',
      '좁은 팬에 한꺼번에 넣으면 고기가 볶아지지 않고 삶아져요.',
    ],
    storage: '익힌 불고기는 식혀 냉장 2일, 양념한 생고기는 당일 조리해요.',
    reheating: '팬에 물 15ml를 넣고 중불에서 소고기 중심까지 뜨겁게 데워요.',
    leftoverIdeas: ['남은 불고기와 당면을 볶아 불고기 잡채로 활용해요.'],
    servingSuggestions: ['상추와 쌈장, 따뜻한 밥을 함께 내요.'],
  },
  {
    id: 'grilled-mackerel',
    name: '고등어구이',
    description:
      '고등어의 물기를 확실히 제거하고 껍질부터 구워 겉은 바삭하고 속은 촉촉하게 완성해요.',
    difficulty: '보통',
    prepTimeMinutes: 15,
    cookTimeMinutes: 14,
    calories: 360,
    groups: {
      main: [
        ['mackerel', '손질 고등어', 600, 'g', '반 마리 2쪽'],
      ],
      seasoning: [
        ['salt', '소금', 6, 'g'],
        ['rice-wine', '맛술', 20, 'ml'],
        ['flour', '밀가루', 20, 'g', '얇게 묻히기', ['쌀가루 20g']],
        ['oil', '식용유', 20, 'ml'],
      ],
      broth: [],
      garnish: [
        ['lemon', '레몬', 0.5, '개', '4조각'],
        ['radish', '간 무', 80, 'g'],
      ],
      optional: [
        ['soy', '진간장', 10, 'ml'],
      ],
    },
    steps: [
      {
        title: '잔가시와 핏물 정리',
        instruction:
          '손질 고등어의 배 안쪽 핏물과 검은 막을 흐르는 물에 빠르게 씻고 잔가시를 확인해요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '배 안쪽에 붉은 핏덩이와 검은 막이 남지 않아요.',
        ingredientRefs: ['mackerel'],
      },
      {
        title: '비린 향 줄이기',
        instruction:
          '고등어 양면에 맛술을 바르고 소금을 고르게 뿌려 8분간 둬요.',
        durationMinutes: 8,
        heatLevel: '불 사용 안 함',
        completionCue: '고등어 표면에 수분이 송골송골 배어나와요.',
        ingredientRefs: ['mackerel', 'rice-wine', 'salt'],
      },
      {
        title: '완전히 물기 제거',
        instruction:
          '키친타월로 고등어 겉과 배 안쪽 수분을 눌러 완전히 닦아요.',
        durationMinutes: 2,
        heatLevel: '불 사용 안 함',
        completionCue: '키친타월에 더 이상 물기가 많이 묻지 않아요.',
        ingredientRefs: ['mackerel'],
        reason: '표면 수분을 없애야 기름이 튀지 않고 껍질이 바삭해져요.',
      },
      {
        title: '밀가루 얇게 입히기',
        instruction:
          '고등어 살 쪽에 밀가루를 아주 얇게 묻히고 남은 가루를 털어요.',
        durationMinutes: 2,
        heatLevel: '불 사용 안 함',
        completionCue: '밀가루가 뭉치지 않고 표면이 희미하게 코팅돼요.',
        ingredientRefs: ['mackerel', 'flour'],
      },
      {
        title: '팬 예열',
        instruction:
          '팬을 1분 예열하고 식용유를 둘러 중불로 낮춰요.',
        durationMinutes: 2,
        heatLevel: '중강불 후 중불',
        completionCue: '식용유가 물결처럼 퍼지지만 연기는 나지 않아요.',
        ingredientRefs: ['oil'],
      },
      {
        title: '껍질 면 굽기',
        instruction:
          '고등어 껍질 면을 아래로 놓고 뒤집개로 20초 눌렀다가 그대로 구워요.',
        durationMinutes: 6,
        heatLevel: '중불',
        completionCue: '껍질 가장자리가 짙은 금색이고 살의 절반 높이까지 불투명해요.',
        ingredientRefs: ['mackerel'],
      },
      {
        title: '살 면 익히기',
        instruction:
          '고등어를 한 번만 뒤집어 살 면을 익혀 중심까지 열을 전달해요.',
        durationMinutes: 5,
        heatLevel: '중약불',
        completionCue: '가장 두꺼운 살이 불투명하고 젓가락으로 눌렀을 때 결대로 갈라져요.',
        ingredientRefs: ['mackerel'],
        warning: '생선 중심이 반투명하면 1~2분 더 익혀요.',
      },
      {
        title: '기름 빼고 담기',
        instruction:
          '고등어를 키친타월 위에 1분 두었다가 레몬과 간 무를 곁들여요.',
        durationMinutes: 2,
        heatLevel: '불 끄기',
        completionCue: '겉기름은 빠지고 껍질의 바삭함이 유지돼요.',
        ingredientRefs: ['mackerel', 'lemon', 'radish'],
      },
    ],
    seasoningAdjustment: [
      '자반고등어는 소금을 뿌리지 말고 10분간 쌀뜨물에 담갔다가 닦아요.',
      '간 무에 진간장을 조금 곁들이면 짠맛을 따로 조절할 수 있어요.',
    ],
    commonMistakes: [
      '젖은 고등어를 바로 구우면 기름이 튀고 껍질이 팬에 붙어요.',
      '자주 뒤집으면 살이 부서지고 육즙이 빠져요.',
    ],
    storage: '구운 뒤 완전히 식혀 냉장 1일 보관해요.',
    reheating: '180도 오븐이나 에어프라이어에서 4~5분 데워 껍질을 다시 바삭하게 해요.',
    leftoverIdeas: ['살만 발라 밥·김·채소와 섞어 고등어 주먹밥으로 만들어요.'],
    servingSuggestions: ['따뜻한 밥과 무생채, 맑은 국을 곁들여요.'],
  },
  {
    id: 'braised-tofu',
    name: '두부조림',
    description:
      '두부를 먼저 노릇하게 부친 뒤 간장 양념을 자작하게 졸여 모양은 단단하고 속은 촉촉해요.',
    difficulty: '쉬움',
    prepTimeMinutes: 12,
    cookTimeMinutes: 16,
    calories: 290,
    groups: {
      main: [
        ['tofu', '부침용 두부', 600, 'g', '1.5cm 두께'],
        ['onion', '양파', 0.5, '개', '큰 크기, 0.7cm 채 썰기'],
        ['green-onion', '대파', 60, 'g', '송송 썰기'],
      ],
      seasoning: [
        ['soy', '진간장', 45, 'ml'],
        ['chili-powder', '고춧가루', 10, 'g'],
        ['sugar', '설탕', 10, 'g'],
        ['garlic', '다진 마늘', 12, 'g'],
        ['sesame-oil', '참기름', 8, 'ml'],
        ['oil', '식용유', 25, 'ml'],
      ],
      broth: [
        ['water', '물', 180, 'ml'],
      ],
      garnish: [
        ['sesame', '볶은 참깨', 5, 'g'],
        ['chili', '홍고추', 10, 'g', '어슷 썰기'],
      ],
      optional: [
        ['mushroom', '표고버섯', 80, 'g', '얇게 썰기'],
      ],
    },
    steps: [
      {
        title: '두부 자르고 물기 빼기',
        instruction:
          '부침용 두부를 1.5cm 두께로 썰어 키친타월 위에 5분간 놓고 수분을 눌러 닦아요.',
        durationMinutes: 6,
        heatLevel: '불 사용 안 함',
        completionCue: '두부 표면이 젖지 않고 손으로 들어도 쉽게 부서지지 않아요.',
        ingredientRefs: ['tofu'],
      },
      {
        title: '채소 손질',
        instruction:
          '양파는 채 썰고 대파는 송송 썰며 홍고추는 얇게 어슷 썰어요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '채소 두께가 고르고 양파는 두부보다 얇아요.',
        ingredientRefs: ['onion', 'green-onion', 'chili'],
      },
      {
        title: '조림 양념 섞기',
        instruction:
          '물·진간장·고춧가루·설탕·다진 마늘·참기름을 섞어 설탕을 녹여요.',
        durationMinutes: 2,
        heatLevel: '불 사용 안 함',
        completionCue: '고춧가루와 설탕이 양념에 고르게 풀려요.',
        ingredientRefs: ['water', 'soy', 'chili-powder', 'sugar', 'garlic', 'sesame-oil'],
      },
      {
        title: '두부 첫 면 굽기',
        instruction:
          '팬에 식용유를 두르고 두부를 겹치지 않게 놓아 움직이지 않고 구워요.',
        durationMinutes: 4,
        heatLevel: '중불',
        completionCue: '두부 아래 면 가장자리가 노릇하고 팬에서 쉽게 떨어져요.',
        ingredientRefs: ['oil', 'tofu'],
      },
      {
        title: '두부 뒤집어 굽기',
        instruction:
          '두부를 조심히 한 번 뒤집어 반대 면도 노릇하게 구워요.',
        durationMinutes: 3,
        heatLevel: '중불',
        completionCue: '양면이 연한 금색이고 모서리 모양이 유지돼요.',
        ingredientRefs: ['tofu'],
      },
      {
        title: '채소와 양념 올리기',
        instruction:
          '두부 위에 양파를 고르게 올리고 조림 양념을 가장자리로 부어요.',
        durationMinutes: 2,
        heatLevel: '중불',
        completionCue: '양념이 끓기 시작하고 양파가 국물에 절반 잠겨요.',
        ingredientRefs: ['tofu', 'onion', 'water'],
      },
      {
        title: '자작하게 졸이기',
        instruction:
          '숟가락으로 양념을 두부 위에 끼얹으며 국물이 절반 남을 때까지 졸여요.',
        durationMinutes: 6,
        heatLevel: '중약불',
        completionCue: '양파가 부드럽고 양념이 두부 표면에 윤기 있게 배어요.',
        ingredientRefs: ['tofu', 'onion', 'soy'],
      },
      {
        title: '향 채소 마무리',
        instruction:
          '대파·홍고추·볶은 참깨를 올리고 1분 더 끓인 뒤 불을 꺼요.',
        durationMinutes: 2,
        heatLevel: '약불',
        completionCue: '팬 바닥에 양념이 3~4큰술 남고 대파 색이 선명해요.',
        ingredientRefs: ['green-onion', 'chili', 'sesame'],
      },
    ],
    seasoningAdjustment: [
      '덜 짜게 먹으려면 진간장을 35ml로 줄이고 물을 10ml 더해요.',
      '아이와 먹을 때는 고춧가루를 빼고 설탕을 2g 줄여요.',
    ],
    commonMistakes: [
      '두부 물기를 닦지 않으면 기름이 튀고 노릇하게 굽기 어려워요.',
      '양념을 너무 센 불에 졸이면 설탕과 간장이 쉽게 타요.',
    ],
    storage: '양념과 함께 밀폐 용기에 담아 냉장 2일 보관해요.',
    reheating: '냄비에 물 15ml를 더하고 뚜껑을 덮어 약불에서 4분 데워요.',
    leftoverIdeas: ['남은 두부조림을 으깨 밥과 김가루에 섞어 주먹밥으로 만들어요.'],
    servingSuggestions: ['보리밥과 데친 나물에 곁들이면 좋아요.'],
  },
  {
    id: 'beef-seaweed-soup',
    name: '소고기미역국',
    description:
      '불린 미역과 소고기를 참기름에 충분히 볶고 푹 끓여 맑고 깊은 감칠맛을 내요.',
    difficulty: '쉬움',
    prepTimeMinutes: 15,
    cookTimeMinutes: 35,
    calories: 250,
    groups: {
      main: [
        ['beef', '소고기 양지', 250, 'g', '한입 크기', ['홍합 400g']],
        ['seaweed', '마른 미역', 25, 'g'],
      ],
      seasoning: [
        ['soup-soy', '국간장', 30, 'ml'],
        ['garlic', '다진 마늘', 12, 'g'],
        ['sesame-oil', '참기름', 15, 'ml'],
        ['salt', '소금', 3, 'g', '마지막 간 조절'],
      ],
      broth: [
        ['water', '물', 1600, 'ml'],
      ],
      garnish: [],
      optional: [
        ['fish-sauce', '참치액', 10, 'ml', '감칠맛 보완'],
      ],
    },
    steps: [
      {
        title: '미역 정확히 불리기',
        instruction:
          '마른 미역을 넉넉한 찬물에 10분 불려 부드럽게 펴지게 해요.',
        durationMinutes: 10,
        heatLevel: '불 사용 안 함',
        completionCue: '미역이 원래 부피의 8배가량으로 늘고 뻣뻣한 부분이 없어요.',
        ingredientRefs: ['seaweed', 'water'],
      },
      {
        title: '미역 씻고 자르기',
        instruction:
          '불린 미역을 찬물에 두 번 헹궈 물기를 짠 뒤 5cm 길이로 잘라요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '미역에서 모래가 나오지 않고 먹기 좋은 길이예요.',
        ingredientRefs: ['seaweed', 'water'],
      },
      {
        title: '소고기 준비',
        instruction:
          '소고기 양지는 키친타월로 핏물을 눌러 닦고 한입 크기로 썰어요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '고기 표면의 붉은 물기가 제거돼요.',
        ingredientRefs: ['beef'],
      },
      {
        title: '소고기 볶기',
        instruction:
          '냄비에 참기름과 소고기 양지를 넣어 겉면이 갈색으로 변하도록 볶아요.',
        durationMinutes: 4,
        heatLevel: '중불',
        completionCue: '고기 겉면의 붉은 기가 사라지고 고소한 향이 나요.',
        ingredientRefs: ['sesame-oil', 'beef'],
      },
      {
        title: '미역 함께 볶기',
        instruction:
          '미역과 국간장 절반을 넣고 미역 색이 짙고 윤기 나도록 볶아요.',
        durationMinutes: 4,
        heatLevel: '중불',
        completionCue: '미역이 진한 초록색이고 냄비 바닥에 물이 거의 없어요.',
        ingredientRefs: ['seaweed', 'soup-soy'],
        reason: '미역을 볶아야 비린 향이 줄고 국물 맛이 깊어져요.',
      },
      {
        title: '물 붓고 끓이기',
        instruction:
          '물 1600ml와 다진 마늘을 넣고 센불에서 끓여 떠오르는 거품을 걷어요.',
        durationMinutes: 7,
        heatLevel: '센불',
        completionCue: '국물 전체가 끓고 표면의 회색 거품이 제거돼요.',
        ingredientRefs: ['water', 'garlic'],
      },
      {
        title: '국물 깊게 우려내기',
        instruction:
          '뚜껑을 반쯤 덮고 소고기와 미역이 부드러워질 때까지 천천히 끓여요.',
        durationMinutes: 22,
        heatLevel: '약불',
        completionCue: '소고기 속이 완전히 익고 미역이 부드럽지만 흐물거리지 않아요.',
        ingredientRefs: ['beef', 'seaweed'],
      },
      {
        title: '간 맞춰 마무리',
        instruction:
          '남은 국간장을 넣고 맛을 본 뒤 필요한 만큼 소금을 넣어 2분 더 끓여요.',
        durationMinutes: 3,
        heatLevel: '약불',
        completionCue: '국물이 맑은 갈색이고 짜지 않으면서 감칠맛이 충분해요.',
        ingredientRefs: ['soup-soy', 'salt'],
      },
    ],
    seasoningAdjustment: [
      '국간장 향이 강하면 20ml만 넣고 소금으로 간해요.',
      '국물이 줄어 짜졌다면 뜨거운 물을 100ml씩 추가해요.',
    ],
    commonMistakes: [
      '미역을 너무 오래 불리면 풀어지고 식감이 없어져요.',
      '소고기 핏물을 닦지 않으면 국물이 탁하고 잡내가 날 수 있어요.',
    ],
    storage: '완전히 식혀 냉장 3일 또는 1회분씩 냉동 2주 보관해요.',
    reheating: '냄비에서 전체가 끓기 시작한 뒤 3분 더 끓여요.',
    leftoverIdeas: ['남은 국에 밥을 넣고 푹 끓여 소고기 미역죽으로 만들어요.'],
    servingSuggestions: ['따뜻한 쌀밥과 담백한 달걀찜을 곁들여요.'],
  },
  {
    id: 'japchae',
    name: '잡채',
    description:
      '당면은 쫄깃하게 삶고 채소는 각각 알맞게 볶아 색과 식감을 살린 집밥 잡채예요.',
    difficulty: '보통',
    prepTimeMinutes: 25,
    cookTimeMinutes: 25,
    calories: 460,
    groups: {
      main: [
        ['noodle', '마른 당면', 300, 'g'],
        ['beef', '소고기 우둔살', 180, 'g', '5cm 채 썰기', ['표고버섯 180g']],
        ['spinach', '시금치', 200, 'g'],
        ['onion', '양파', 1, '개', '중간 크기, 채 썰기'],
        ['carrot', '당근', 100, 'g', '채 썰기'],
        ['mushroom', '표고버섯', 120, 'g', '채 썰기'],
      ],
      seasoning: [
        ['soy', '진간장', 65, 'ml'],
        ['sugar', '설탕', 28, 'g'],
        ['garlic', '다진 마늘', 12, 'g'],
        ['sesame-oil', '참기름', 25, 'ml'],
        ['oil', '식용유', 25, 'ml'],
        ['salt', '소금', 4, 'g'],
        ['pepper', '후춧가루', 1, 'g'],
      ],
      broth: [
        ['water', '물', 2000, 'ml', '당면과 시금치 데치기'],
      ],
      garnish: [
        ['sesame', '볶은 참깨', 8, 'g'],
      ],
      optional: [
        ['egg', '달걀지단', 80, 'g', '가늘게 채 썰기'],
      ],
    },
    steps: [
      {
        title: '잡채 양념 만들기',
        instruction:
          '진간장·설탕·다진 마늘·참기름 15ml·후춧가루를 섞어 설탕을 녹여요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '양념에 설탕 알갱이가 남지 않고 향이 고르게 섞여요.',
        ingredientRefs: ['soy', 'sugar', 'garlic', 'sesame-oil', 'pepper'],
      },
      {
        title: '소고기 밑간',
        instruction:
          '소고기 우둔살에 잡채 양념 20ml를 덜어 버무려 10분 재워요.',
        durationMinutes: 10,
        heatLevel: '불 사용 안 함',
        completionCue: '고기 한 가닥씩 양념이 얇게 묻어요.',
        ingredientRefs: ['beef', 'soy'],
      },
      {
        title: '시금치 데치기',
        instruction:
          '물 2000ml를 끓여 소금 2g과 시금치를 넣고 30초 데친 뒤 찬물에 헹궈 물기를 짜요.',
        durationMinutes: 5,
        heatLevel: '센불',
        completionCue: '시금치 줄기는 부드럽고 잎은 선명한 초록색이에요.',
        ingredientRefs: ['water', 'salt', 'spinach'],
      },
      {
        title: '채소 따로 볶기',
        instruction:
          '팬에 식용유를 나눠 두르며 양파·당근·표고버섯을 각각 소금 약간과 함께 볶아 한 접시에 펼쳐요.',
        durationMinutes: 8,
        heatLevel: '중불',
        completionCue: '양파는 투명하고 당근은 휘며 표고버섯은 촉촉하게 익어요.',
        ingredientRefs: ['oil', 'onion', 'carrot', 'mushroom', 'salt'],
      },
      {
        title: '소고기 완전히 익히기',
        instruction:
          '같은 팬에 재운 소고기 우둔살을 넣고 뭉치지 않게 풀어 볶아요.',
        durationMinutes: 4,
        heatLevel: '중강불',
        completionCue: '고기 속 붉은 기가 전혀 없고 가장자리가 갈색이에요.',
        ingredientRefs: ['beef'],
      },
      {
        title: '당면 알맞게 삶기',
        instruction:
          '끓는 물에 마른 당면을 넣고 포장 권장 시간보다 1분 짧게 삶은 뒤 체에 밭쳐요.',
        durationMinutes: 7,
        heatLevel: '센불',
        completionCue: '당면 중심에 딱딱한 심은 없지만 씹을 때 탄력이 있어요.',
        ingredientRefs: ['water', 'noodle'],
      },
      {
        title: '당면에 간 배게 볶기',
        instruction:
          '팬에 당면과 남은 잡채 양념을 넣고 양념이 바닥에 남지 않을 때까지 볶아요.',
        durationMinutes: 4,
        heatLevel: '중불',
        completionCue: '당면이 투명하고 윤기 나며 양념이 고르게 배어요.',
        ingredientRefs: ['noodle', 'soy'],
      },
      {
        title: '모든 재료 버무리기',
        instruction:
          '불을 끄고 당면에 시금치·볶은 채소·소고기·남은 참기름·볶은 참깨를 넣어 골고루 버무려요.',
        durationMinutes: 3,
        heatLevel: '불 끄기',
        completionCue: '채소 색이 섞이지 않고 당면이 서로 뭉치지 않아요.',
        ingredientRefs: ['noodle', 'spinach', 'onion', 'carrot', 'mushroom', 'beef', 'sesame-oil', 'sesame'],
      },
    ],
    seasoningAdjustment: [
      '당면을 맛보고 싱거우면 진간장 5ml를 팬 가장자리로 둘러 볶아요.',
      '단맛을 줄이려면 설탕을 20g만 사용해요.',
    ],
    commonMistakes: [
      '뜨거운 당면을 찬물에 오래 헹구면 양념이 잘 배지 않아요.',
      '채소를 한꺼번에 볶으면 색이 탁해지고 익는 정도가 달라져요.',
    ],
    storage: '밀폐 용기에 냉장 2일 보관해요.',
    reheating: '팬에 물 20ml와 식용유 5ml를 넣고 중불에서 당면이 부드러워질 때까지 볶아요.',
    leftoverIdeas: ['남은 잡채를 춘권피에 싸서 구워 잡채말이로 활용해요.'],
    servingSuggestions: ['따뜻하게 또는 한 김 식혀 불고기·전과 함께 내요.'],
  },
  {
    id: 'chicken-soup',
    name: '닭곰탕',
    description:
      '닭을 향채와 천천히 삶아 맑은 국물을 내고 살을 결대로 찢어 담는 담백한 닭곰탕이에요.',
    difficulty: '보통',
    prepTimeMinutes: 20,
    cookTimeMinutes: 50,
    calories: 380,
    groups: {
      main: [
        ['chicken', '닭 한 마리', 1000, 'g', '내장 제거'],
        ['green-onion', '대파', 120, 'g', '흰 부분과 초록 부분 나누기'],
        ['onion', '양파', 1, '개', '중간 크기, 반으로 자르기'],
        ['garlic', '통마늘', 40, 'g'],
      ],
      seasoning: [
        ['soup-soy', '국간장', 20, 'ml'],
        ['salt', '소금', 8, 'g', '국물과 고기 간 나누기'],
        ['pepper', '후춧가루', 1, 'g'],
        ['sesame-oil', '참기름', 5, 'ml'],
      ],
      broth: [
        ['water', '물', 2400, 'ml'],
      ],
      garnish: [
        ['egg', '달걀지단', 80, 'g', '채 썰기'],
      ],
      optional: [
        ['rice', '따뜻한 밥', 800, 'g'],
      ],
    },
    steps: [
      {
        title: '닭 안팎 세척',
        instruction:
          '닭 한 마리의 꽁지 지방과 배 속 내장을 제거하고 흐르는 물에 안팎을 빠르게 씻어요.',
        durationMinutes: 5,
        heatLevel: '불 사용 안 함',
        completionCue: '닭 배 안쪽에 핏덩이와 내장이 남지 않아요.',
        ingredientRefs: ['chicken'],
      },
      {
        title: '첫물로 불순물 제거',
        instruction:
          '냄비에 닭과 물 1200ml를 넣고 끓기 시작한 뒤 3분간 데쳐 물은 버리고 닭을 헹궈요.',
        durationMinutes: 8,
        heatLevel: '센불',
        completionCue: '회색 거품이 빠지고 닭 표면이 깨끗해요.',
        ingredientRefs: ['chicken', 'water'],
      },
      {
        title: '새 물과 향채 넣기',
        instruction:
          '깨끗한 냄비에 닭·남은 물 1200ml·양파·통마늘·대파 초록 부분을 넣어요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '닭이 물에 3분의 2 이상 잠기고 향채가 고르게 들어가요.',
        ingredientRefs: ['chicken', 'water', 'onion', 'garlic', 'green-onion'],
      },
      {
        title: '센불로 끓이기',
        instruction:
          '뚜껑을 열고 끓여 떠오르는 거품과 기름을 국자로 걷어요.',
        durationMinutes: 8,
        heatLevel: '센불',
        completionCue: '국물이 끓고 표면에 탁한 거품이 거의 남지 않아요.',
        ingredientRefs: ['chicken', 'water'],
      },
      {
        title: '닭 속까지 삶기',
        instruction:
          '뚜껑을 반쯤 덮고 닭다리 관절이 부드럽게 움직일 때까지 천천히 삶아요.',
        durationMinutes: 32,
        heatLevel: '중약불',
        completionCue: '닭다리 가장 두꺼운 살의 속 붉은 기가 없고 맑은 육즙이 나와요.',
        ingredientRefs: ['chicken'],
        warning: '생닭을 만진 도구와 손은 다른 재료에 닿기 전에 깨끗이 씻어요.',
      },
      {
        title: '살 발라 밑간',
        instruction:
          '닭을 꺼내 5분 식힌 뒤 살을 결대로 찢고 소금 3g·참기름·후춧가루를 섞어요.',
        durationMinutes: 8,
        heatLevel: '불 사용 안 함',
        completionCue: '뼈 조각 없이 닭살이 먹기 좋은 굵기로 찢어져요.',
        ingredientRefs: ['chicken', 'salt', 'sesame-oil', 'pepper'],
      },
      {
        title: '국물 거르고 간하기',
        instruction:
          '국물을 체에 거른 뒤 국간장을 넣고 맛을 보며 남은 소금으로 간해 3분 끓여요.',
        durationMinutes: 5,
        heatLevel: '중불',
        completionCue: '국물이 맑고 고소하며 짠맛이 과하지 않아요.',
        ingredientRefs: ['soup-soy', 'salt', 'water'],
      },
      {
        title: '그릇에 완성',
        instruction:
          '그릇에 닭살을 담고 뜨거운 국물을 부은 뒤 대파 흰 부분과 달걀지단을 올려요.',
        durationMinutes: 2,
        heatLevel: '불 끄기',
        completionCue: '닭살이 국물에 충분히 잠기고 고명 색이 선명해요.',
        ingredientRefs: ['chicken', 'green-onion', 'egg'],
      },
    ],
    seasoningAdjustment: [
      '국간장은 색이 진해지지 않도록 20ml를 넘기지 않고 소금으로 마무리해요.',
      '아이용은 후춧가루를 빼고 소금 간을 약하게 해요.',
    ],
    commonMistakes: [
      '처음부터 약불로 끓이면 불순물이 흩어져 국물이 탁해져요.',
      '닭을 너무 오래 삶으면 가슴살이 퍽퍽해져요.',
    ],
    storage: '살과 국물을 분리해 냉장 2일 또는 냉동 2주 보관해요.',
    reheating: '국물을 팔팔 끓인 뒤 닭살을 넣어 3분 더 데워요.',
    leftoverIdeas: ['남은 국물과 닭살에 밥을 넣어 닭죽으로 끓여요.'],
    servingSuggestions: ['따뜻한 밥과 깍두기를 곁들여요.'],
  },
  {
    id: 'salmon-soy-grill',
    name: '연어간장구이',
    description:
      '연어는 껍질부터 바삭하게 굽고 짧게 졸인 간장 소스를 입혀 속살을 촉촉하게 지켜요.',
    difficulty: '보통',
    prepTimeMinutes: 12,
    cookTimeMinutes: 15,
    calories: 430,
    groups: {
      main: [
        ['salmon', '연어 필렛', 600, 'g', '150g씩 4조각'],
        ['broccoli', '브로콜리', 240, 'g', '한입 크기'],
        ['carrot', '당근', 120, 'g', '0.5cm 반달 썰기'],
      ],
      seasoning: [
        ['soy', '진간장', 35, 'ml'],
        ['rice-wine', '맛술', 30, 'ml'],
        ['honey', '꿀', 20, 'g', '', ['설탕 16g']],
        ['garlic', '다진 마늘', 8, 'g'],
        ['oil', '식용유', 15, 'ml'],
        ['salt', '소금', 3, 'g'],
        ['pepper', '후춧가루', 1, 'g'],
      ],
      broth: [
        ['water', '물', 40, 'ml'],
      ],
      garnish: [
        ['green-onion', '쪽파', 20, 'g', '송송 썰기'],
        ['sesame', '볶은 참깨', 4, 'g'],
      ],
      optional: [
        ['lemon', '레몬', 0.5, '개'],
      ],
    },
    steps: [
      {
        title: '연어 손질',
        instruction:
          '연어 필렛의 잔가시를 제거하고 키친타월로 표면 수분을 꼼꼼히 닦아요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '손으로 만졌을 때 표면이 미끄럽거나 젖지 않아요.',
        ingredientRefs: ['salmon'],
      },
      {
        title: '연어 밑간',
        instruction:
          '연어 양면에 소금과 후춧가루를 고르게 뿌려 5분간 두어요.',
        durationMinutes: 5,
        heatLevel: '불 사용 안 함',
        completionCue: '소금이 녹아 표면에 얇게 스며들어요.',
        ingredientRefs: ['salmon', 'salt', 'pepper'],
      },
      {
        title: '간장 소스 섞기',
        instruction:
          '진간장·맛술·꿀·다진 마늘·물 40ml를 섞어요.',
        durationMinutes: 2,
        heatLevel: '불 사용 안 함',
        completionCue: '꿀이 완전히 풀리고 소스가 균일해요.',
        ingredientRefs: ['soy', 'rice-wine', 'honey', 'garlic', 'water'],
      },
      {
        title: '곁들임 채소 익히기',
        instruction:
          '브로콜리와 당근을 김이 오른 찜기에 넣어 살짝 부드러워질 때까지 쪄요.',
        durationMinutes: 5,
        heatLevel: '중강불',
        completionCue: '브로콜리는 선명한 초록색이고 당근은 젓가락이 들어가되 단단함이 남아요.',
        ingredientRefs: ['broccoli', 'carrot', 'water'],
      },
      {
        title: '연어 껍질 굽기',
        instruction:
          '팬에 식용유를 두르고 연어 껍질 면을 아래로 놓아 뒤집개로 20초 눌러 구워요.',
        durationMinutes: 5,
        heatLevel: '중불',
        completionCue: '껍질이 바삭한 금색이고 살의 절반 높이까지 불투명해요.',
        ingredientRefs: ['oil', 'salmon'],
      },
      {
        title: '살 면 익히기',
        instruction:
          '연어를 한 번 뒤집어 살 면을 짧게 구워 중심까지 열을 전달해요.',
        durationMinutes: 3,
        heatLevel: '중약불',
        completionCue: '연어 중심이 옅은 분홍색이고 포크로 눌렀을 때 결대로 갈라져요.',
        ingredientRefs: ['salmon'],
      },
      {
        title: '소스 입히기',
        instruction:
          '팬의 기름을 닦고 간장 소스를 부어 끓인 뒤 연어에 끼얹으며 졸여요.',
        durationMinutes: 3,
        heatLevel: '약불',
        completionCue: '소스가 숟가락 뒷면에 얇게 붙고 연어 표면에 윤기가 나요.',
        ingredientRefs: ['soy', 'salmon'],
        warning: '꿀이 들어간 소스는 센 불에서 쉽게 타요.',
      },
      {
        title: '고명과 채소 곁들이기',
        instruction:
          '연어를 브로콜리·당근과 담고 쪽파와 볶은 참깨를 뿌려요.',
        durationMinutes: 1,
        heatLevel: '불 끄기',
        completionCue: '연어 모양이 유지되고 소스가 접시 바닥에 과하게 고이지 않아요.',
        ingredientRefs: ['salmon', 'broccoli', 'carrot', 'green-onion', 'sesame'],
      },
    ],
    seasoningAdjustment: [
      '저염 간장을 쓰면 진간장을 40ml까지 늘려도 돼요.',
      '단맛을 줄이려면 꿀을 12g만 사용해요.',
    ],
    commonMistakes: [
      '연어 표면 수분을 닦지 않으면 껍질이 눅눅해요.',
      '소스를 처음부터 넣고 구우면 연어가 익기 전에 소스가 타요.',
    ],
    storage: '완전히 식혀 냉장 1일 보관해요.',
    reheating: '150도 오븐에서 6분 또는 팬 약불에서 뚜껑을 덮고 4분 데워요.',
    leftoverIdeas: ['살을 잘게 부숴 밥과 오이에 섞어 연어 덮밥으로 만들어요.'],
    servingSuggestions: ['현미밥과 데친 채소를 곁들여요.'],
  },
  {
    id: 'vegetable-bibimbap',
    name: '채소비빔밥',
    description:
      '다섯 가지 채소를 각각 알맞게 익혀 색과 식감을 살리고 고추장 양념으로 비벼 먹어요.',
    difficulty: '보통',
    prepTimeMinutes: 25,
    cookTimeMinutes: 25,
    calories: 540,
    groups: {
      main: [
        ['rice', '따뜻한 밥', 800, 'g'],
        ['spinach', '시금치', 200, 'g'],
        ['sprout', '콩나물', 240, 'g'],
        ['zucchini', '애호박', 180, 'g', '채 썰기'],
        ['carrot', '당근', 120, 'g', '채 썰기'],
        ['mushroom', '표고버섯', 120, 'g', '채 썰기'],
        ['egg', '달걀', 4, '개'],
      ],
      seasoning: [
        ['gochujang', '고추장', 60, 'g'],
        ['vinegar', '식초', 15, 'ml'],
        ['sugar', '설탕', 12, 'g'],
        ['soy', '진간장', 15, 'ml'],
        ['garlic', '다진 마늘', 10, 'g'],
        ['sesame-oil', '참기름', 25, 'ml'],
        ['oil', '식용유', 25, 'ml'],
        ['salt', '소금', 6, 'g'],
      ],
      broth: [
        ['water', '물', 1200, 'ml', '채소 데치기'],
      ],
      garnish: [
        ['sesame', '볶은 참깨', 8, 'g'],
      ],
      optional: [
        ['seaweed', '김가루', 8, 'g'],
      ],
    },
    steps: [
      {
        title: '비빔 양념 만들기',
        instruction:
          '고추장·식초·설탕·진간장·다진 마늘·참기름 10ml를 섞어 설탕을 녹여요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '양념이 매끈하고 새콤·달콤·짭짤한 맛이 균형을 이뤄요.',
        ingredientRefs: ['gochujang', 'vinegar', 'sugar', 'soy', 'garlic', 'sesame-oil'],
      },
      {
        title: '시금치 데치기',
        instruction:
          '물 1200ml를 끓여 소금 2g과 시금치를 넣고 30초 데친 뒤 찬물에 헹궈 물기를 짜요.',
        durationMinutes: 5,
        heatLevel: '센불',
        completionCue: '시금치 잎은 선명하고 줄기는 부드러워요.',
        ingredientRefs: ['water', 'salt', 'spinach'],
      },
      {
        title: '콩나물 익히기',
        instruction:
          '같은 끓는 물에 콩나물을 넣고 뚜껑을 열어 비린 향이 없어질 때까지 삶아 건져요.',
        durationMinutes: 5,
        heatLevel: '중강불',
        completionCue: '콩나물 줄기는 투명하고 씹을 때 아삭함이 남아요.',
        ingredientRefs: ['water', 'sprout'],
      },
      {
        title: '시금치와 콩나물 무치기',
        instruction:
          '시금치와 콩나물에 소금 2g·참기름 5ml·볶은 참깨 절반을 나눠 넣어 각각 무쳐요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '나물이 물기 없이 촉촉하고 서로 뭉치지 않아요.',
        ingredientRefs: ['spinach', 'sprout', 'salt', 'sesame-oil', 'sesame'],
      },
      {
        title: '애호박과 당근 볶기',
        instruction:
          '팬에 식용유를 나눠 두르고 애호박과 당근을 각각 소금 약간과 함께 볶아요.',
        durationMinutes: 6,
        heatLevel: '중불',
        completionCue: '애호박은 부드럽고 당근은 휘지만 두 채소 모두 색이 선명해요.',
        ingredientRefs: ['oil', 'zucchini', 'carrot', 'salt'],
      },
      {
        title: '표고버섯 볶기',
        instruction:
          '표고버섯에 남은 식용유와 참기름 5ml를 넣어 수분이 날아갈 때까지 볶아요.',
        durationMinutes: 4,
        heatLevel: '중불',
        completionCue: '표고버섯 가장자리가 갈색이고 촉촉한 윤기가 나요.',
        ingredientRefs: ['mushroom', 'oil', 'sesame-oil'],
      },
      {
        title: '달걀 프라이',
        instruction:
          '팬에 달걀을 깨 넣어 흰자는 완전히 익고 노른자는 취향대로 익혀요.',
        durationMinutes: 4,
        heatLevel: '중약불',
        completionCue: '흰자에 투명한 부분이 없고 노른자 표면이 따뜻하게 굳어요.',
        ingredientRefs: ['egg'],
      },
      {
        title: '색 맞춰 담기',
        instruction:
          '따뜻한 밥 위에 시금치·콩나물·애호박·당근·표고버섯과 달걀을 둘러 담고 양념과 남은 참깨를 곁들여요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '각 채소가 섞이지 않고 색깔별로 고르게 놓여요.',
        ingredientRefs: ['rice', 'spinach', 'sprout', 'zucchini', 'carrot', 'mushroom', 'egg', 'gochujang', 'sesame'],
      },
    ],
    seasoningAdjustment: [
      '덜 맵게 먹으려면 고추장을 30g으로 줄이고 진간장을 5ml 늘려요.',
      '나물은 밥과 양념을 함께 먹으므로 평소보다 약하게 간해요.',
    ],
    commonMistakes: [
      '데친 나물의 물기를 충분히 짜지 않으면 밥이 질어져요.',
      '모든 채소를 함께 볶으면 색과 식감이 흐려져요.',
    ],
    storage: '밥·나물·양념을 각각 밀폐해 냉장 1일 보관해요.',
    reheating: '밥과 볶은 나물만 데우고 시금치·콩나물·양념은 먹기 직전에 올려요.',
    leftoverIdeas: ['남은 나물을 잘게 썰어 달걀과 함께 채소전으로 부쳐요.'],
    servingSuggestions: ['맑은 무국이나 된장국을 곁들여요.'],
  },
  {
    id: 'squid-radish-soup',
    name: '오징어무국',
    description:
      '무를 먼저 익혀 단맛을 끌어내고 오징어는 마지막에 짧게 끓여 시원하고 부드럽게 완성해요.',
    difficulty: '쉬움',
    prepTimeMinutes: 15,
    cookTimeMinutes: 22,
    calories: 190,
    groups: {
      main: [
        ['squid', '손질 오징어', 500, 'g', '몸통 1cm 링, 다리 5cm'],
        ['radish', '무', 400, 'g', '0.5cm 나박 썰기'],
        ['green-onion', '대파', 60, 'g', '어슷 썰기'],
      ],
      seasoning: [
        ['soup-soy', '국간장', 30, 'ml'],
        ['garlic', '다진 마늘', 15, 'g'],
        ['chili-powder', '고춧가루', 8, 'g'],
        ['salt', '소금', 3, 'g', '마지막 간 조절'],
        ['sesame-oil', '참기름', 8, 'ml'],
      ],
      broth: [
        ['stock', '멸치 다시마 육수', 1400, 'ml'],
      ],
      garnish: [
        ['chili', '청양고추', 10, 'g', '어슷 썰기'],
      ],
      optional: [
        ['sprout', '콩나물', 150, 'g'],
      ],
    },
    steps: [
      {
        title: '오징어 씻고 자르기',
        instruction:
          '손질 오징어의 남은 내장과 눈을 확인해 제거하고 흐르는 물에 짧게 씻어 몸통과 다리를 썰어요.',
        durationMinutes: 5,
        heatLevel: '불 사용 안 함',
        completionCue: '오징어 안쪽이 깨끗하고 조각 두께가 고르게 맞아요.',
        ingredientRefs: ['squid'],
      },
      {
        title: '무와 향 채소 손질',
        instruction:
          '무는 0.5cm 두께로 나박 썰고 대파와 청양고추는 어슷 썰어요.',
        durationMinutes: 4,
        heatLevel: '불 사용 안 함',
        completionCue: '무 두께가 일정해 익는 시간이 비슷해요.',
        ingredientRefs: ['radish', 'green-onion', 'chili'],
      },
      {
        title: '무 볶아 단맛 내기',
        instruction:
          '냄비에 참기름과 무를 넣어 가장자리가 반투명해질 때까지 볶아요.',
        durationMinutes: 4,
        heatLevel: '중불',
        completionCue: '무 가장자리가 맑아지고 고소한 향이 나요.',
        ingredientRefs: ['sesame-oil', 'radish'],
      },
      {
        title: '양념 입히기',
        instruction:
          '고춧가루와 국간장 절반을 넣어 무가 붉게 물들도록 30초 볶아요.',
        durationMinutes: 1,
        heatLevel: '중약불',
        completionCue: '고춧가루 풋내가 줄고 타지 않은 붉은 기름이 보여요.',
        ingredientRefs: ['chili-powder', 'soup-soy', 'radish'],
      },
      {
        title: '육수 넣고 끓이기',
        instruction:
          '멸치 다시마 육수를 붓고 센불에서 끓여 떠오르는 거품을 걷어요.',
        durationMinutes: 5,
        heatLevel: '센불',
        completionCue: '육수 전체가 끓고 표면이 깨끗해요.',
        ingredientRefs: ['stock'],
      },
      {
        title: '무 속까지 익히기',
        instruction:
          '다진 마늘을 넣고 무가 부드럽게 휘어질 때까지 끓여요.',
        durationMinutes: 8,
        heatLevel: '중불',
        completionCue: '무가 반투명하고 젓가락으로 찔렀을 때 힘없이 들어가요.',
        ingredientRefs: ['garlic', 'radish'],
      },
      {
        title: '오징어 짧게 익히기',
        instruction:
          '오징어를 넣고 몸통이 불투명하게 말리기 시작할 때까지만 끓여요.',
        durationMinutes: 3,
        heatLevel: '중강불',
        completionCue: '오징어가 하얗고 탱탱하며 중심에 투명한 부분이 없어요.',
        ingredientRefs: ['squid'],
        warning: '오징어를 오래 끓이면 질겨지므로 4분을 넘기지 않아요.',
      },
      {
        title: '간과 향 마무리',
        instruction:
          '남은 국간장과 소금으로 간하고 대파와 청양고추를 넣어 1분 더 끓여요.',
        durationMinutes: 2,
        heatLevel: '중불',
        completionCue: '국물이 시원하고 무는 부드러우며 오징어는 탱탱해요.',
        ingredientRefs: ['soup-soy', 'salt', 'green-onion', 'chili'],
      },
    ],
    seasoningAdjustment: [
      '맑게 먹으려면 고춧가루를 빼고 국간장을 5ml 더해요.',
      '육수가 짜면 소금은 생략하고 물을 100ml 더해요.',
    ],
    commonMistakes: [
      '오징어를 처음부터 넣고 끓이면 질겨지고 국물이 탁해져요.',
      '무를 너무 두껍게 썰면 국물 맛이 나기 전에 오징어가 익어요.',
    ],
    storage: '완전히 식혀 냉장 1일 보관해요.',
    reheating: '국물과 무를 먼저 끓이고 오징어는 마지막 1분에 넣어 데워요.',
    leftoverIdeas: ['남은 국물에 밥과 달걀을 넣어 시원한 국밥으로 먹어요.'],
    servingSuggestions: ['따뜻한 밥과 담백한 두부조림을 곁들여요.'],
  },
  {
    id: 'steamed-egg',
    name: '달걀찜',
    description:
      '달걀물을 곱게 체에 거르고 약한 불에서 천천히 익혀 기포 없이 부드러운 달걀찜을 만들어요.',
    difficulty: '쉬움',
    prepTimeMinutes: 10,
    cookTimeMinutes: 14,
    calories: 190,
    groups: {
      main: [
        ['egg', '달걀', 6, '개'],
        ['carrot', '당근', 30, 'g', '곱게 다지기'],
        ['green-onion', '쪽파', 20, 'g', '송송 썰기'],
      ],
      seasoning: [
        ['fish-sauce', '참치액', 10, 'ml', '', ['국간장 8ml']],
        ['salt', '소금', 2, 'g'],
        ['sesame-oil', '참기름', 3, 'ml'],
      ],
      broth: [
        ['stock', '다시마 육수', 420, 'ml', '미지근하게 준비', ['물 420ml']],
      ],
      garnish: [
        ['sesame', '볶은 참깨', 3, 'g'],
      ],
      optional: [
        ['shrimp', '칵테일 새우', 80, 'g', '해동 후 물기 제거'],
      ],
    },
    steps: [
      {
        title: '고명 손질',
        instruction:
          '당근은 3mm 이하로 곱게 다지고 쪽파는 얇게 송송 썰어요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '당근 조각이 달걀물 위에 뜰 만큼 작고 쪽파 두께가 고르게 얇아요.',
        ingredientRefs: ['carrot', 'green-onion'],
      },
      {
        title: '달걀 고르게 풀기',
        instruction:
          '달걀을 볼에 깨고 젓가락으로 흰자의 끈을 끊듯 좌우로 저어 풀어요.',
        durationMinutes: 2,
        heatLevel: '불 사용 안 함',
        completionCue: '흰자 덩어리가 거의 없고 거품은 많지 않아요.',
        ingredientRefs: ['egg'],
      },
      {
        title: '육수와 간 섞기',
        instruction:
          '달걀물에 미지근한 다시마 육수·참치액·소금을 넣어 천천히 섞어요.',
        durationMinutes: 2,
        heatLevel: '불 사용 안 함',
        completionCue: '달걀과 육수가 분리되지 않고 균일한 연노란색이에요.',
        ingredientRefs: ['egg', 'stock', 'fish-sauce', 'salt'],
      },
      {
        title: '체에 걸러 기포 제거',
        instruction:
          '달걀물을 고운 체에 한 번 거르고 표면 거품은 숟가락으로 걷어요.',
        durationMinutes: 2,
        heatLevel: '불 사용 안 함',
        completionCue: '달걀물 표면이 매끈하고 큰 거품이나 흰자 끈이 없어요.',
        ingredientRefs: ['egg'],
        reason: '체에 거르면 익힌 뒤 조직이 부드럽고 구멍이 적어요.',
      },
      {
        title: '냄비 준비',
        instruction:
          '두꺼운 작은 냄비 안쪽에 참기름을 얇게 바르고 달걀물을 부어요.',
        durationMinutes: 1,
        heatLevel: '불 사용 안 함',
        completionCue: '참기름이 냄비 벽까지 얇게 코팅되고 달걀물이 3분의 2 이하로 차요.',
        ingredientRefs: ['sesame-oil', 'egg'],
      },
      {
        title: '가장자리부터 익히기',
        instruction:
          '약불에 올려 바닥과 가장자리가 익기 시작하면 주걱으로 바닥을 천천히 긁어 섞어요.',
        durationMinutes: 5,
        heatLevel: '약불',
        completionCue: '부드러운 달걀 덩어리가 생기지만 가운데는 아직 묽어요.',
        ingredientRefs: ['egg'],
      },
      {
        title: '뚜껑 덮어 뜸 들이기',
        instruction:
          '당근을 뿌리고 뚜껑을 덮어 가장 약한 불에서 중심까지 천천히 익혀요.',
        durationMinutes: 7,
        heatLevel: '최약불',
        completionCue: '중심을 살짝 흔들면 부드럽게 떨리지만 묽은 달걀물은 나오지 않아요.',
        ingredientRefs: ['carrot', 'egg'],
        warning: '센 불에서는 바닥이 타고 내부에 큰 구멍이 생겨요.',
      },
      {
        title: '잔열로 완성',
        instruction:
          '불을 끄고 2분 뜸을 들인 뒤 쪽파와 볶은 참깨를 올려요.',
        durationMinutes: 3,
        heatLevel: '불 끄기',
        completionCue: '표면이 촉촉하고 숟가락으로 떴을 때 부드럽게 잘려요.',
        ingredientRefs: ['green-onion', 'sesame', 'egg'],
      },
    ],
    seasoningAdjustment: [
      '참치액이 짜면 소금을 생략하고 완성 후 간을 확인해요.',
      '더 부드럽게 먹으려면 육수를 480ml까지 늘리고 약불 시간을 2분 추가해요.',
    ],
    commonMistakes: [
      '뜨거운 육수를 바로 넣으면 달걀이 부분적으로 익어 덩어리가 생겨요.',
      '센 불로 끓이면 바닥이 타고 거친 구멍이 생겨요.',
    ],
    storage: '완전히 식혀 냉장 1일 보관해요.',
    reheating: '전자레인지용 덮개를 씌우고 30초씩 나눠 중심까지 따뜻하게 데워요.',
    leftoverIdeas: ['남은 달걀찜을 으깨 밥과 김가루에 섞어 부드러운 주먹밥으로 만들어요.'],
    servingSuggestions: ['매운 찌개나 볶음 요리에 순한 반찬으로 곁들여요.'],
  },
  {
    id: 'andong-jjimdak',
    name: '안동찜닭',
    description:
      '닭과 뿌리채소를 간장 양념에 천천히 조리고 당면을 마지막에 넣어 윤기 있게 완성해요.',
    difficulty: '보통',
    prepTimeMinutes: 25,
    cookTimeMinutes: 38,
    calories: 620,
    groups: {
      main: [
        ['chicken', '닭볶음탕용 닭', 1000, 'g'],
        ['potato', '감자', 350, 'g', '4cm 크기'],
        ['carrot', '당근', 180, 'g', '3cm 크기'],
        ['onion', '양파', 1, '개', '큰 크기, 4등분'],
        ['glass-noodle', '납작당면', 180, 'g', '30분 불리기'],
        ['green-onion', '대파', 100, 'g', '5cm 길이'],
      ],
      seasoning: [
        ['soy', '진간장', 100, 'ml'],
        ['brown-sugar', '흑설탕', 35, 'g'],
        ['rice-wine', '맛술', 50, 'ml'],
        ['garlic', '다진 마늘', 25, 'g'],
        ['ginger', '다진 생강', 5, 'g'],
        ['sesame-oil', '참기름', 10, 'ml'],
        ['pepper', '후춧가루', 1, 'g'],
      ],
      broth: [
        ['water', '물', 900, 'ml'],
      ],
      garnish: [
        ['chili', '건고추', 8, 'g', '반으로 자르기'],
        ['sesame', '볶은 참깨', 5, 'g'],
      ],
      optional: [
        ['mushroom', '표고버섯', 100, 'g', '반으로 자르기'],
      ],
    },
    steps: [
      {
        title: '당면 불리기',
        instruction:
          '납작당면을 넉넉한 찬물에 30분 불린 뒤 체에 밭쳐요.',
        durationMinutes: 30,
        heatLevel: '불 사용 안 함',
        completionCue: '당면이 부드럽게 휘지만 잡아당기면 끊어지지 않아요.',
        ingredientRefs: ['glass-noodle', 'water'],
      },
      {
        title: '닭 데쳐 씻기',
        instruction:
          '닭볶음탕용 닭과 물 일부를 냄비에 넣어 3분 데친 뒤 찬물에 헹궈 뼛가루를 제거해요.',
        durationMinutes: 8,
        heatLevel: '센불',
        completionCue: '닭 표면의 핏물과 회색 거품이 제거돼요.',
        ingredientRefs: ['chicken', 'water'],
      },
      {
        title: '채소 손질',
        instruction:
          '감자·당근·양파·대파와 건고추를 지정한 크기로 썰어요.',
        durationMinutes: 7,
        heatLevel: '불 사용 안 함',
        completionCue: '감자와 당근 모서리가 둥글게 다듬어져 조릴 때 부서지지 않아요.',
        ingredientRefs: ['potato', 'carrot', 'onion', 'green-onion', 'chili'],
      },
      {
        title: '조림 양념 만들기',
        instruction:
          '진간장·흑설탕·맛술·다진 마늘·다진 생강·후춧가루와 남은 물을 섞어요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '흑설탕이 녹고 간장 양념이 균일해요.',
        ingredientRefs: ['soy', 'brown-sugar', 'rice-wine', 'garlic', 'ginger', 'pepper', 'water'],
      },
      {
        title: '닭 먼저 조리기',
        instruction:
          '깨끗한 냄비에 닭과 조림 양념·건고추를 넣고 끓이며 거품을 걷어요.',
        durationMinutes: 10,
        heatLevel: '중강불',
        completionCue: '닭 표면이 갈색으로 물들고 국물이 고르게 끓어요.',
        ingredientRefs: ['chicken', 'soy', 'chili'],
      },
      {
        title: '뿌리채소 익히기',
        instruction:
          '감자와 당근을 넣고 뚜껑을 반쯤 덮어 중심까지 익혀요.',
        durationMinutes: 15,
        heatLevel: '중불',
        completionCue: '감자와 당근에 젓가락이 들어가지만 모양은 단단히 유지돼요.',
        ingredientRefs: ['potato', 'carrot'],
      },
      {
        title: '양파와 당면 넣기',
        instruction:
          '양파·대파·불린 납작당면을 넣고 당면이 국물을 흡수하도록 저어가며 끓여요.',
        durationMinutes: 8,
        heatLevel: '중불',
        completionCue: '당면 중심에 딱딱한 심이 없고 닭고기 속 붉은 기가 전혀 없어요.',
        ingredientRefs: ['onion', 'green-onion', 'glass-noodle', 'chicken'],
        warning: '닭고기는 뼈 가까운 살까지 완전히 익혀요.',
      },
      {
        title: '윤기 내어 마무리',
        instruction:
          '국물이 자작해지면 불을 끄고 참기름과 볶은 참깨를 넣어 섞어요.',
        durationMinutes: 2,
        heatLevel: '중강불 후 불 끄기',
        completionCue: '국물이 재료에 걸쭉하게 붙고 냄비 바닥에 150ml 정도 남아요.',
        ingredientRefs: ['sesame-oil', 'sesame'],
      },
    ],
    seasoningAdjustment: [
      '단맛을 줄이려면 흑설탕을 25g만 사용해요.',
      '국물이 빨리 줄면 물을 100ml씩 추가하고 간장을 더 넣지 않아요.',
    ],
    commonMistakes: [
      '당면을 너무 일찍 넣으면 국물을 모두 흡수하고 쉽게 퍼져요.',
      '감자를 작게 썰면 조리는 동안 부서져 국물이 탁해져요.',
    ],
    storage: '당면은 따로 덜고 닭과 채소는 냉장 2일 보관해요.',
    reheating: '물 50ml를 더해 뚜껑을 덮고 중불에서 닭 중심까지 뜨겁게 데운 뒤 당면을 넣어요.',
    leftoverIdeas: ['남은 닭살과 양념을 잘게 잘라 간장 볶음밥으로 활용해요.'],
    servingSuggestions: ['오이무침이나 동치미처럼 산뜻한 반찬을 곁들여요.'],
  },
  {
    id: 'potato-pancake',
    name: '감자전',
    description:
      '감자를 직접 갈아 전분을 되살리고 얇게 부쳐 가장자리는 바삭하고 속은 쫀득하게 만들어요.',
    difficulty: '보통',
    prepTimeMinutes: 20,
    cookTimeMinutes: 18,
    calories: 320,
    groups: {
      main: [
        ['potato', '감자', 800, 'g', '껍질 제거'],
        ['onion', '양파', 0.5, '개', '작은 크기'],
      ],
      seasoning: [
        ['salt', '소금', 5, 'g'],
        ['starch', '감자전분', 25, 'g'],
        ['oil', '식용유', 60, 'ml'],
        ['soy', '진간장', 20, 'ml'],
        ['vinegar', '식초', 10, 'ml'],
      ],
      broth: [
        ['water', '물', 30, 'ml', '반죽 농도 조절'],
      ],
      garnish: [
        ['chili', '청양고추', 10, 'g', '얇은 링'],
        ['red-chili', '홍고추', 10, 'g', '얇은 링'],
      ],
      optional: [
        ['chive', '부추', 40, 'g', '3cm 길이'],
      ],
    },
    steps: [
      {
        title: '초간장 만들기',
        instruction:
          '진간장과 식초를 섞어 감자전이 완성될 때까지 따로 둬요.',
        durationMinutes: 1,
        heatLevel: '불 사용 안 함',
        completionCue: '간장과 식초가 한 색으로 섞여요.',
        ingredientRefs: ['soy', 'vinegar'],
      },
      {
        title: '감자와 양파 갈기',
        instruction:
          '감자와 양파를 강판에 곱게 갈아 체에 밭친 볼에 담아요.',
        durationMinutes: 8,
        heatLevel: '불 사용 안 함',
        completionCue: '큰 감자 덩어리 없이 촉촉한 죽 상태예요.',
        ingredientRefs: ['potato', 'onion'],
      },
      {
        title: '감자 물 분리',
        instruction:
          '간 감자를 고운체에 5분 두어 물기를 빼되 손으로 완전히 짜지는 않아요.',
        durationMinutes: 5,
        heatLevel: '불 사용 안 함',
        completionCue: '감자 건더기는 촉촉하고 볼 아래에 갈색 물이 모여요.',
        ingredientRefs: ['potato'],
      },
      {
        title: '천연 전분 되살리기',
        instruction:
          '받은 감자 물은 3분 가만히 두고 윗물만 버린 뒤 바닥의 하얀 전분을 긁어요.',
        durationMinutes: 4,
        heatLevel: '불 사용 안 함',
        completionCue: '볼 바닥에 하얗고 단단한 감자 전분층이 보여요.',
        ingredientRefs: ['potato', 'water'],
        reason: '가라앉은 전분을 넣으면 밀가루 없이도 전이 잘 붙고 쫀득해져요.',
      },
      {
        title: '반죽 농도 맞추기',
        instruction:
          '감자 건더기·가라앉은 전분·감자전분·소금을 섞고 너무 되면 물을 조금씩 넣어요.',
        durationMinutes: 2,
        heatLevel: '불 사용 안 함',
        completionCue: '숟가락으로 떴을 때 천천히 흐르고 물이 따로 고이지 않아요.',
        ingredientRefs: ['potato', 'starch', 'salt', 'water'],
      },
      {
        title: '팬과 기름 예열',
        instruction:
          '팬에 식용유 30ml를 두르고 반죽 한 방울이 바로 지글거릴 때까지 예열해요.',
        durationMinutes: 2,
        heatLevel: '중불',
        completionCue: '반죽 한 방울 주변에 고운 기포가 생기고 식용유는 연기가 나지 않아요.',
        ingredientRefs: ['oil', 'potato'],
      },
      {
        title: '첫 면 바삭하게 굽기',
        instruction:
          '반죽을 0.6cm 두께로 얇게 펴고 청양고추와 홍고추를 올려 가장자리가 갈색이 될 때까지 구워요.',
        durationMinutes: 5,
        heatLevel: '중불',
        completionCue: '가장자리가 바삭한 금색이고 윗면 가장자리까지 반투명해요.',
        ingredientRefs: ['potato', 'chili', 'red-chili'],
      },
      {
        title: '뒤집어 완성',
        instruction:
          '남은 식용유를 가장자리로 두르고 전을 한 번 뒤집어 중심까지 익힌 뒤 초간장과 내요.',
        durationMinutes: 5,
        heatLevel: '중약불',
        completionCue: '양면이 고른 금색이고 중심을 눌렀을 때 묽은 반죽이 나오지 않아요.',
        ingredientRefs: ['oil', 'potato', 'soy', 'vinegar'],
      },
    ],
    seasoningAdjustment: [
      '감자 수분이 많으면 감자전분을 5g씩 추가해 농도를 맞춰요.',
      '초간장이 짜면 물 10ml를 섞어요.',
    ],
    commonMistakes: [
      '감자 물을 바로 버리면 천연 전분까지 잃어 전이 잘 부서져요.',
      '두껍게 부치면 겉은 타고 속은 설익을 수 있어요.',
    ],
    storage: '구운 전을 겹치지 않게 식혀 냉장 1일 보관해요.',
    reheating: '기름을 아주 조금 두른 팬에서 약불로 양면을 2분씩 데워요.',
    leftoverIdeas: ['남은 감자전을 가늘게 썰어 달걀물에 묻혀 다시 부쳐요.'],
    servingSuggestions: ['따뜻할 때 초간장을 조금씩 찍어 먹어요.'],
  },
  {
    id: 'tofu-mushroom-rice',
    name: '두부버섯밥',
    description:
      '쌀 위에 버섯을 올려 향을 입히고 노릇하게 구운 두부와 양념장을 곁들이는 든든한 한 그릇이에요.',
    difficulty: '보통',
    prepTimeMinutes: 20,
    cookTimeMinutes: 30,
    calories: 530,
    groups: {
      main: [
        ['rice', '쌀', 400, 'g', '씻어 20분 불리기'],
        ['tofu', '부침용 두부', 500, 'g', '2cm 크기'],
        ['shiitake', '표고버섯', 120, 'g', '얇게 썰기'],
        ['oyster-mushroom', '느타리버섯', 180, 'g', '가닥 떼기'],
        ['carrot', '당근', 80, 'g', '채 썰기'],
      ],
      seasoning: [
        ['soy', '진간장', 45, 'ml'],
        ['garlic', '다진 마늘', 10, 'g'],
        ['sesame-oil', '참기름', 15, 'ml'],
        ['oil', '식용유', 20, 'ml'],
        ['salt', '소금', 3, 'g'],
        ['chili-powder', '고춧가루', 4, 'g'],
      ],
      broth: [
        ['water', '물', 520, 'ml'],
      ],
      garnish: [
        ['green-onion', '쪽파', 30, 'g', '송송 썰기'],
        ['sesame', '볶은 참깨', 6, 'g'],
      ],
      optional: [
        ['seaweed', '김가루', 8, 'g'],
      ],
    },
    steps: [
      {
        title: '쌀 씻어 불리기',
        instruction:
          '쌀을 맑은 물이 나올 때까지 세 번 씻고 새 물에 20분 불린 뒤 체에 밭쳐요.',
        durationMinutes: 22,
        heatLevel: '불 사용 안 함',
        completionCue: '쌀알이 불투명한 흰색이고 부피가 약간 늘어요.',
        ingredientRefs: ['rice', 'water'],
      },
      {
        title: '두부 물기 빼기',
        instruction:
          '부침용 두부를 2cm 크기로 썰어 키친타월로 눌러 수분을 제거하고 소금을 뿌려요.',
        durationMinutes: 5,
        heatLevel: '불 사용 안 함',
        completionCue: '두부 표면이 마르고 소금이 고르게 붙어요.',
        ingredientRefs: ['tofu', 'salt'],
      },
      {
        title: '버섯과 당근 손질',
        instruction:
          '표고버섯은 얇게 썰고 느타리버섯은 굵은 가닥으로 떼며 당근은 가늘게 채 썰어요.',
        durationMinutes: 5,
        heatLevel: '불 사용 안 함',
        completionCue: '버섯 크기가 비슷하고 당근은 가장 가늘어요.',
        ingredientRefs: ['shiitake', 'oyster-mushroom', 'carrot'],
      },
      {
        title: '밥솥에 재료 올리기',
        instruction:
          '밥솥에 불린 쌀과 물 520ml를 넣고 표고버섯·느타리버섯·당근을 섞지 않고 고르게 올려요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '쌀은 물에 잠기고 채소는 쌀 위에 고르게 퍼져요.',
        ingredientRefs: ['rice', 'water', 'shiitake', 'oyster-mushroom', 'carrot'],
      },
      {
        title: '버섯밥 짓기',
        instruction:
          '일반 취사로 밥을 지은 뒤 완료되면 뚜껑을 열지 않고 뜸 들여요.',
        durationMinutes: 25,
        heatLevel: '밥솥 일반 취사',
        completionCue: '쌀알에 물기가 고이지 않고 버섯 향이 밥 전체에 배어요.',
        ingredientRefs: ['rice', 'shiitake', 'oyster-mushroom'],
      },
      {
        title: '두부 노릇하게 굽기',
        instruction:
          '팬에 식용유를 두르고 두부를 겹치지 않게 놓아 모든 면을 노릇하게 구워요.',
        durationMinutes: 8,
        heatLevel: '중불',
        completionCue: '두부 겉면은 금색이고 모서리가 무너지지 않아요.',
        ingredientRefs: ['oil', 'tofu'],
      },
      {
        title: '양념장 만들기',
        instruction:
          '진간장·다진 마늘·참기름·고춧가루·쪽파·볶은 참깨를 섞어요.',
        durationMinutes: 2,
        heatLevel: '불 사용 안 함',
        completionCue: '양념장에 쪽파와 참깨가 고르게 떠 있고 향이 어우러져요.',
        ingredientRefs: ['soy', 'garlic', 'sesame-oil', 'chili-powder', 'green-onion', 'sesame'],
      },
      {
        title: '밥 섞어 담기',
        instruction:
          '버섯밥을 아래에서 위로 가볍게 섞어 그릇에 담고 구운 두부와 양념장을 곁들여요.',
        durationMinutes: 3,
        heatLevel: '불 사용 안 함',
        completionCue: '밥알이 으깨지지 않고 버섯과 당근이 고르게 섞여요.',
        ingredientRefs: ['rice', 'shiitake', 'oyster-mushroom', 'carrot', 'tofu', 'soy'],
      },
    ],
    seasoningAdjustment: [
      '아이와 먹을 때는 양념장에서 고춧가루를 빼요.',
      '진간장이 짜면 물 15ml를 양념장에 섞어요.',
    ],
    commonMistakes: [
      '버섯을 쌀과 미리 섞으면 밥솥 바닥의 쌀이 고르게 익지 않을 수 있어요.',
      '두부 물기를 제거하지 않으면 팬에 붙고 기름이 튀어요.',
    ],
    storage: '밥과 두부, 양념장을 분리해 냉장 1일 또는 밥만 냉동 2주 보관해요.',
    reheating: '밥에 물 10ml를 뿌려 데우고 두부는 팬에서 별도로 데워요.',
    leftoverIdeas: ['남은 버섯밥과 두부를 으깨 동그랗게 빚어 구워요.'],
    servingSuggestions: ['양념장은 한 번에 붓지 말고 한 숟가락씩 비벼 간을 맞춰요.'],
  },
  {
    id: 'boiled-pork',
    name: '보쌈',
    description:
      '돼지고기를 향채와 은근히 삶아 잡내 없이 부드럽게 익히고 얇게 썰어 채소와 즐겨요.',
    difficulty: '보통',
    prepTimeMinutes: 20,
    cookTimeMinutes: 55,
    calories: 650,
    groups: {
      main: [
        ['pork', '돼지고기 통삼겹살', 1000, 'g', '두 덩이', ['돼지고기 앞다리살 1000g']],
        ['cabbage', '알배추', 500, 'g', '잎 분리'],
        ['onion', '양파', 1, '개', '중간 크기, 반으로 자르기'],
        ['green-onion', '대파', 120, 'g', '10cm 길이'],
        ['garlic', '통마늘', 50, 'g'],
      ],
      seasoning: [
        ['doenjang', '된장', 45, 'g'],
        ['rice-wine', '맛술', 80, 'ml'],
        ['coffee', '인스턴트커피', 2, 'g', '잡내 완화'],
        ['salt', '소금', 20, 'g', '배추 절이기'],
      ],
      broth: [
        ['water', '물', 2500, 'ml', '고기가 잠길 만큼'],
      ],
      garnish: [
        ['ssamjang', '쌈장', 80, 'g'],
        ['shrimp-sauce', '새우젓', 50, 'g'],
      ],
      optional: [
        ['radish-kimchi', '무말랭이무침', 200, 'g'],
      ],
    },
    steps: [
      {
        title: '고기 온도 올리기',
        instruction:
          '돼지고기 통삼겹살을 냉장고에서 꺼내 키친타월로 표면 핏물을 닦고 15분 두어요.',
        durationMinutes: 15,
        heatLevel: '불 사용 안 함',
        completionCue: '표면 핏물이 없고 고기 겉의 냉기가 조금 가셔요.',
        ingredientRefs: ['pork'],
      },
      {
        title: '배추 절이기',
        instruction:
          '알배추 잎 사이에 소금을 나눠 뿌리고 15분 절인 뒤 찬물에 헹궈 물기를 빼요.',
        durationMinutes: 18,
        heatLevel: '불 사용 안 함',
        completionCue: '배추 줄기가 부러지지 않고 부드럽게 휘어요.',
        ingredientRefs: ['cabbage', 'salt', 'water'],
      },
      {
        title: '삶는 물 준비',
        instruction:
          '큰 냄비에 물 2500ml·양파·대파·통마늘·된장·맛술·인스턴트커피를 넣고 끓여요.',
        durationMinutes: 8,
        heatLevel: '센불',
        completionCue: '된장이 풀리고 향채 향이 나는 국물이 크게 끓어요.',
        ingredientRefs: ['water', 'onion', 'green-onion', 'garlic', 'doenjang', 'rice-wine', 'coffee'],
      },
      {
        title: '고기 넣어 표면 익히기',
        instruction:
          '끓는 물에 돼지고기 통삼겹살을 넣고 다시 끓을 때까지 뚜껑을 열어 두어요.',
        durationMinutes: 7,
        heatLevel: '센불',
        completionCue: '고기 표면 전체가 회백색으로 변하고 거품이 떠올라요.',
        ingredientRefs: ['pork', 'water'],
      },
      {
        title: '거품 걷기',
        instruction:
          '표면의 회색 거품과 과한 기름을 국자로 꼼꼼히 걷어요.',
        durationMinutes: 3,
        heatLevel: '중불',
        completionCue: '국물 표면이 깨끗하고 큰 거품이 더 생기지 않아요.',
        ingredientRefs: ['pork', 'water'],
      },
      {
        title: '은근히 삶기',
        instruction:
          '뚜껑을 반쯤 덮고 돼지고기가 부드러워질 때까지 천천히 삶아요.',
        durationMinutes: 38,
        heatLevel: '중약불',
        completionCue: '젓가락이 고기 중심까지 들어가고 찔렀을 때 맑은 육즙이 나와요.',
        ingredientRefs: ['pork'],
        warning: '돼지고기 중심에 붉은색이 남으면 5분 더 삶아요.',
      },
      {
        title: '잔열로 육즙 안정시키기',
        instruction:
          '불을 끄고 돼지고기를 삶은 물에 8분 그대로 두었다가 건져요.',
        durationMinutes: 8,
        heatLevel: '불 끄기',
        completionCue: '고기 표면이 마르지 않고 집게로 들었을 때 부드럽게 휘어요.',
        ingredientRefs: ['pork', 'water'],
        reason: '삶은 물에서 쉬게 하면 자를 때 육즙이 덜 빠져요.',
      },
      {
        title: '결 반대로 썰어 담기',
        instruction:
          '돼지고기를 결 반대 방향으로 0.7cm 두께로 썰어 알배추·쌈장·새우젓과 담아요.',
        durationMinutes: 5,
        heatLevel: '불 사용 안 함',
        completionCue: '고기 단면이 촉촉하고 붉은 부분 없이 고르게 익어요.',
        ingredientRefs: ['pork', 'cabbage', 'ssamjang', 'shrimp-sauce'],
      },
    ],
    seasoningAdjustment: [
      '된장이 짜면 35g만 넣고 쌈장과 새우젓 양으로 간을 조절해요.',
      '커피 향이 싫다면 인스턴트커피를 생략하고 통후추 2g을 넣어요.',
    ],
    commonMistakes: [
      '고기를 찬물부터 끓이면 육즙이 더 빠지고 잡내가 날 수 있어요.',
      '센 불로 계속 삶으면 지방과 살이 분리되고 겉이 퍽퍽해져요.',
    ],
    storage: '고기를 덩어리째 삶은 국물 50ml와 함께 밀폐해 냉장 2일 보관해요.',
    reheating: '얇게 썬 고기에 삶은 국물을 조금 뿌려 찜기나 전자레인지로 중심까지 데워요.',
    leftoverIdeas: ['남은 보쌈을 얇게 썰어 김치와 함께 돼지고기 두루치기로 볶아요.'],
    servingSuggestions: ['절인 배추에 고기·무말랭이무침·새우젓을 조금씩 올려 먹어요.'],
  },
]

export const premiumRecipes: PremiumRecipe[] =
  recipeSpecs.map(makeRecipe)

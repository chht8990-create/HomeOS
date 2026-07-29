import type {
  DetailedRecipe,
  RecipeStep,
} from '../types/recipe'
import { defaultMealPlanRecipes } from './defaultMealPlanRecipes'

function step(
  order: number,
  instruction: string,
  minutes: number,
  heat?: string,
  doneness?: string,
): RecipeStep {
  return {
    order,
    instruction,
    minutes,
    ...(heat ? { heat } : {}),
    ...(doneness ? { doneness } : {}),
  }
}

export const recipes: DetailedRecipe[] = [
  {
    id: 'kimchi-stew',
    name: '김치찌개',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 25,
    ingredients: [
      { id: 'kimchi-stew-kimchi', name: '김치', quantity: 0.5, unit: '포기' },
      { id: 'kimchi-stew-pork', name: '돼지고기', quantity: 300, unit: 'g' },
      { id: 'kimchi-stew-tofu', name: '두부', quantity: 0.5, unit: '모' },
      { id: 'kimchi-stew-green-onion', name: '대파', quantity: 0.5, unit: '대' },
      { id: 'kimchi-stew-onion', name: '양파', quantity: 0.5, unit: '개' },
    ],
    optionalIngredients: [
      { id: 'kimchi-stew-chili', name: '고춧가루', quantity: 1, unit: '큰술' },
    ],
    substitutions: [
      { ingredientName: '돼지고기', alternatives: ['참치 1캔', '두부 1모'] },
    ],
    steps: [
      step(1, '김치는 3cm 길이로 썰고 돼지고기와 양파, 두부, 대파를 먹기 좋게 손질해요.', 5),
      step(2, '냄비에 돼지고기를 넣고 겉면이 하얗게 변할 때까지 볶아요.', 4, '중불', '돼지고기 겉면에 붉은 기가 없어요.'),
      step(3, '김치와 양파를 넣고 김치 가장자리가 투명해질 때까지 볶아요.', 4, '중불'),
      step(4, '물 800ml를 붓고 끓으면 불을 줄여 김치가 부드러워질 때까지 끓여요.', 12, '중약불', '김치 줄기가 쉽게 휘어요.'),
      step(5, '두부와 대파를 넣어 3분 더 끓이고 국물 간을 확인해 완성해요.', 3, '중불', '돼지고기 속까지 완전히 익었어요.'),
    ],
  },
  {
    id: 'chicken-galbi',
    name: '닭갈비',
    servings: 4,
    prepMinutes: 12,
    cookMinutes: 25,
    ingredients: [
      { id: 'chicken-galbi-chicken', name: '닭고기', quantity: 600, unit: 'g' },
      { id: 'chicken-galbi-cabbage', name: '양배추', quantity: 0.25, unit: '통' },
      { id: 'chicken-galbi-sweet-potato', name: '고구마', quantity: 1, unit: '개' },
      { id: 'chicken-galbi-onion', name: '양파', quantity: 1, unit: '개' },
      { id: 'chicken-galbi-gochujang', name: '고추장', quantity: 2, unit: '큰술' },
    ],
    optionalIngredients: [
      { id: 'chicken-galbi-rice-cake', name: '떡', quantity: 150, unit: 'g' },
    ],
    substitutions: [
      { ingredientName: '고구마', alternatives: ['감자 1개', '단호박 200g'] },
    ],
    steps: [
      step(1, '닭고기는 한입 크기로 자르고 고추장과 간장 1큰술을 섞어 버무려요.', 5),
      step(2, '양배추와 양파는 굵게 썰고 고구마는 0.7cm 두께로 썰어요.', 5),
      step(3, '팬에 닭고기와 고구마를 올리고 물 100ml를 둘러 익혀요.', 8, '중불'),
      step(4, '닭고기가 절반쯤 익으면 양배추와 양파를 넣어 골고루 볶아요.', 10, '중강불'),
      step(5, '양념이 재료에 고르게 배고 닭고기 속이 완전히 익으면 불을 꺼요.', 5, '중불', '가장 두꺼운 닭고기를 잘랐을 때 속이 분홍색이 아니에요.'),
    ],
  },
  {
    id: 'soybean-paste-stew',
    name: '된장찌개',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 20,
    ingredients: [
      { id: 'soybean-stew-doenjang', name: '된장', quantity: 2, unit: '큰술' },
      { id: 'soybean-stew-tofu', name: '두부', quantity: 1, unit: '모' },
      { id: 'soybean-stew-zucchini', name: '애호박', quantity: 1, unit: '개' },
      { id: 'soybean-stew-onion', name: '양파', quantity: 1, unit: '개' },
      { id: 'soybean-stew-green-onion', name: '대파', quantity: 0.5, unit: '대' },
    ],
    optionalIngredients: [
      { id: 'soybean-stew-mushroom', name: '버섯', quantity: 100, unit: 'g' },
    ],
    substitutions: [
      { ingredientName: '애호박', alternatives: ['감자 1개', '무 150g'] },
    ],
    steps: [
      step(1, '두부와 애호박, 양파는 2cm 크기로 썰고 대파는 어슷 썰어요.', 5),
      step(2, '냄비에 물 700ml와 된장을 풀어 덩어리가 없게 저어요.', 2),
      step(3, '국물이 끓으면 양파와 애호박을 넣어 부드러워질 때까지 끓여요.', 8, '중불'),
      step(4, '두부를 넣고 국물이 다시 끓어오르면 5분 더 끓여요.', 5, '중약불'),
      step(5, '대파를 넣고 1분 끓인 뒤 된장 향과 채소 익힘을 확인해 완성해요.', 2, '중불', '애호박이 젓가락으로 쉽게 잘려요.'),
    ],
  },
  {
    id: 'beef-bulgogi',
    name: '소불고기',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 15,
    ingredients: [
      { id: 'beef-bulgogi-beef', name: '소고기', quantity: 500, unit: 'g' },
      { id: 'beef-bulgogi-onion', name: '양파', quantity: 1, unit: '개' },
      { id: 'beef-bulgogi-green-onion', name: '대파', quantity: 1, unit: '대' },
      { id: 'beef-bulgogi-soy-sauce', name: '간장', quantity: 4, unit: '큰술' },
      { id: 'beef-bulgogi-mushroom', name: '버섯', quantity: 150, unit: 'g' },
    ],
    optionalIngredients: [
      { id: 'beef-bulgogi-glass-noodle', name: '당면', quantity: 100, unit: 'g' },
    ],
    substitutions: [
      { ingredientName: '버섯', alternatives: ['당근 0.5개', '파프리카 1개'] },
    ],
    steps: [
      step(1, '소고기는 키친타월로 핏물을 닦고 양파와 대파, 버섯을 얇게 썰어요.', 7),
      step(2, '간장과 설탕 1큰술, 다진 마늘 1큰술을 섞어 소고기에 버무려요.', 3),
      step(3, '팬을 달군 뒤 양념한 소고기를 넓게 펼쳐 볶아요.', 5, '중강불'),
      step(4, '고기 붉은 기가 줄면 양파와 버섯을 넣고 국물이 자작해질 때까지 볶아요.', 6, '중불'),
      step(5, '대파를 넣고 1분 더 볶아 고기 속까지 익었는지 확인해요.', 1, '중강불', '소고기 붉은 기가 없고 양파가 투명해요.'),
    ],
  },
  {
    id: 'grilled-mackerel',
    name: '고등어구이',
    servings: 4,
    prepMinutes: 8,
    cookMinutes: 20,
    ingredients: [
      { id: 'mackerel-fish', name: '고등어', quantity: 2, unit: '마리' },
      { id: 'mackerel-lemon', name: '레몬', quantity: 0.5, unit: '개' },
      { id: 'mackerel-radish', name: '무', quantity: 200, unit: 'g' },
    ],
    optionalIngredients: [
      { id: 'mackerel-chive', name: '쪽파', quantity: 2, unit: '대' },
    ],
    substitutions: [
      { ingredientName: '고등어', alternatives: ['삼치 2토막', '연어 500g'] },
    ],
    steps: [
      step(1, '고등어는 물기를 닦고 잔가시를 확인한 뒤 껍질에 얕게 칼집을 내요.', 4),
      step(2, '무는 얇게 채 썰고 레몬은 먹기 좋게 잘라 곁들임을 준비해요.', 3),
      step(3, '달군 팬에 고등어 껍질 면을 아래로 놓고 움직이지 않고 구워요.', 7, '중불'),
      step(4, '껍질이 노릇해지면 뒤집어 속살이 불투명해질 때까지 구워요.', 7, '중약불'),
      step(5, '가장 두꺼운 부분이 쉽게 갈라지는지 확인하고 레몬과 무채를 곁들여요.', 2, '약불', '속살 전체가 불투명하고 촉촉하게 갈라져요.'),
    ],
  },
  {
    id: 'curry',
    name: '카레',
    servings: 4,
    prepMinutes: 12,
    cookMinutes: 28,
    ingredients: [
      { id: 'curry-powder', name: '카레가루', quantity: 100, unit: 'g' },
      { id: 'curry-pork', name: '돼지고기', quantity: 300, unit: 'g' },
      { id: 'curry-potato', name: '감자', quantity: 2, unit: '개' },
      { id: 'curry-carrot', name: '당근', quantity: 1, unit: '개' },
      { id: 'curry-onion', name: '양파', quantity: 1, unit: '개' },
    ],
    optionalIngredients: [
      { id: 'curry-apple', name: '사과', quantity: 0.25, unit: '개' },
    ],
    substitutions: [
      { ingredientName: '돼지고기', alternatives: ['닭고기 300g', '버섯 250g'] },
    ],
    steps: [
      step(1, '돼지고기와 감자, 당근, 양파를 2cm 크기로 고르게 썰어요.', 8),
      step(2, '냄비에 돼지고기를 넣고 겉면이 익을 때까지 볶아요.', 4, '중불'),
      step(3, '양파와 감자, 당근을 넣어 양파가 투명해질 때까지 볶아요.', 5, '중불'),
      step(4, '물 700ml를 붓고 감자와 당근이 부드러워질 때까지 끓여요.', 12, '중약불'),
      step(5, '불을 약하게 줄이고 카레가루를 풀어 걸쭉해질 때까지 저어 완성해요.', 5, '약불', '주걱으로 그었을 때 바닥이 잠깐 보여요.'),
    ],
  },
  {
    id: 'braised-tofu',
    name: '두부조림',
    servings: 4,
    prepMinutes: 8,
    cookMinutes: 18,
    ingredients: [
      { id: 'braised-tofu-tofu', name: '두부', quantity: 2, unit: '모' },
      { id: 'braised-tofu-onion', name: '양파', quantity: 0.5, unit: '개' },
      { id: 'braised-tofu-green-onion', name: '대파', quantity: 0.5, unit: '대' },
      { id: 'braised-tofu-soy-sauce', name: '간장', quantity: 3, unit: '큰술' },
    ],
    optionalIngredients: [
      { id: 'braised-tofu-chili', name: '고춧가루', quantity: 1, unit: '큰술' },
    ],
    substitutions: [
      { ingredientName: '두부', alternatives: ['유부 300g', '가지 2개'] },
    ],
    steps: [
      step(1, '두부는 1.5cm 두께로 썰어 키친타월로 물기를 제거해요.', 4),
      step(2, '양파는 채 썰고 대파는 송송 썬 뒤 간장과 물 150ml를 섞어요.', 3),
      step(3, '팬에 두부를 겹치지 않게 놓고 앞뒤로 노릇하게 구워요.', 6, '중불'),
      step(4, '양파와 양념을 넣고 끓으면 불을 줄여 국물을 끼얹으며 조려요.', 7, '중약불'),
      step(5, '국물이 자작하게 남으면 대파를 올리고 두부에 간이 배었는지 확인해요.', 2, '약불', '두부 표면이 갈색이고 양념이 절반 이하로 줄었어요.'),
    ],
  },
  {
    id: 'egg-fried-rice',
    name: '계란볶음밥',
    servings: 4,
    prepMinutes: 7,
    cookMinutes: 13,
    ingredients: [
      { id: 'egg-rice-rice', name: '밥', quantity: 4, unit: '공기' },
      { id: 'egg-rice-egg', name: '계란', quantity: 4, unit: '개' },
      { id: 'egg-rice-green-onion', name: '대파', quantity: 1, unit: '대' },
      { id: 'egg-rice-soy-sauce', name: '간장', quantity: 2, unit: '큰술' },
    ],
    optionalIngredients: [
      { id: 'egg-rice-carrot', name: '당근', quantity: 0.5, unit: '개' },
    ],
    substitutions: [
      { ingredientName: '밥', alternatives: ['현미밥 4공기', '냉동밥 800g'] },
    ],
    steps: [
      step(1, '대파와 선택 채소를 잘게 썰고 밥은 덩어리를 미리 풀어둬요.', 4),
      step(2, '팬에 대파를 볶아 향이 올라오면 한쪽으로 밀어둬요.', 2, '중불'),
      step(3, '빈 공간에 계란을 넣고 젓가락으로 저어 부드러운 스크램블을 만들어요.', 2, '중불', '계란이 80% 정도 익고 촉촉해요.'),
      step(4, '밥을 넣고 주걱으로 펼치며 알알이 고슬고슬해질 때까지 볶아요.', 4, '중강불'),
      step(5, '팬 가장자리에 간장을 둘러 향을 낸 뒤 전체를 섞어 완성해요.', 2, '중강불', '밥알이 뭉치지 않고 계란이 완전히 익었어요.'),
    ],
  },
  {
    id: 'spicy-pork',
    name: '제육볶음',
    servings: 4,
    prepMinutes: 12,
    cookMinutes: 18,
    ingredients: [
      { id: 'spicy-pork-pork', name: '돼지고기', quantity: 600, unit: 'g' },
      { id: 'spicy-pork-onion', name: '양파', quantity: 1, unit: '개' },
      { id: 'spicy-pork-green-onion', name: '대파', quantity: 1, unit: '대' },
      { id: 'spicy-pork-gochujang', name: '고추장', quantity: 3, unit: '큰술' },
    ],
    optionalIngredients: [
      { id: 'spicy-pork-cabbage', name: '양배추', quantity: 0.2, unit: '통' },
    ],
    substitutions: [
      { ingredientName: '돼지고기', alternatives: ['닭고기 600g', '오징어 500g'] },
    ],
    steps: [
      step(1, '돼지고기는 한입 크기로 자르고 양파와 대파를 굵게 썰어요.', 5),
      step(2, '고추장과 간장 2큰술, 설탕 1큰술을 섞어 고기에 버무려요.', 3),
      step(3, '달군 팬에 양념한 고기를 넓게 펼쳐 겉면을 익혀요.', 5, '중강불'),
      step(4, '양파와 선택 채소를 넣고 수분이 날아가도록 빠르게 볶아요.', 6, '강불'),
      step(5, '대파를 넣고 고기 속까지 익었는지 확인한 뒤 바로 불을 꺼요.', 2, '중강불', '가장 두꺼운 고기 속에 붉은 기가 없어요.'),
    ],
  },
  {
    id: 'beef-seaweed-soup',
    name: '소고기 미역국',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 30,
    ingredients: [
      { id: 'seaweed-soup-beef', name: '소고기', quantity: 250, unit: 'g' },
      { id: 'seaweed-soup-seaweed', name: '미역', quantity: 20, unit: 'g' },
      { id: 'seaweed-soup-soy-sauce', name: '국간장', quantity: 2, unit: '큰술' },
    ],
    optionalIngredients: [
      { id: 'seaweed-soup-garlic', name: '마늘', quantity: 1, unit: '큰술' },
    ],
    substitutions: [
      { ingredientName: '소고기', alternatives: ['홍합 400g', '참치 1캔'] },
    ],
    steps: [
      step(1, '미역은 찬물에 충분히 불린 뒤 여러 번 헹궈 먹기 좋게 잘라요.', 7),
      step(2, '소고기는 키친타월로 핏물을 닦고 한입 크기로 썰어요.', 3),
      step(3, '냄비에 소고기와 미역을 넣어 고기 겉면이 익을 때까지 볶아요.', 5, '중불'),
      step(4, '물 1.2L를 붓고 끓으면 거품을 걷어낸 뒤 푹 끓여요.', 20, '중약불'),
      step(5, '국간장으로 간하고 미역이 부드럽고 고기가 완전히 익으면 마무리해요.', 3, '약불', '미역이 부드럽게 씹히고 고기 속 붉은 기가 없어요.'),
    ],
  },
  ...defaultMealPlanRecipes,
]

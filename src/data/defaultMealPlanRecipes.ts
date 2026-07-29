import type {
  DetailedRecipe,
  RecipeStep,
} from '../types/recipe'

function step(
  order: number,
  instruction: string,
  minutes: number,
  heat: string,
  doneness: string,
): RecipeStep {
  return {
    order,
    instruction,
    minutes,
    heat,
    doneness,
  }
}

export const defaultMealPlanRecipes: DetailedRecipe[] = [
  {
    id: 'japchae',
    name: '잡채',
    servings: 4,
    prepMinutes: 18,
    cookMinutes: 22,
    ingredients: [
      { id: 'japchae-noodles', name: '당면', quantity: 250, unit: 'g' },
      { id: 'japchae-beef', name: '소고기', quantity: 180, unit: 'g' },
      { id: 'japchae-spinach', name: '시금치', quantity: 200, unit: 'g' },
      { id: 'japchae-onion', name: '양파', quantity: 1, unit: '개' },
      { id: 'japchae-carrot', name: '당근', quantity: 1, unit: '개' },
      { id: 'japchae-soy-sauce', name: '간장', quantity: 5, unit: '큰술' },
    ],
    optionalIngredients: [
      { id: 'japchae-mushroom', name: '버섯', quantity: 120, unit: 'g' },
    ],
    substitutions: [
      { ingredientName: '소고기', alternatives: ['돼지고기 180g', '유부 120g'] },
    ],
    steps: [
      step(1, '당면은 미지근한 물에 담가 휘어질 정도로 불리고 채소와 고기는 5cm 길이로 가늘게 썰어요.', 10, '불 사용 안 함', '당면이 부러지지 않고 부드럽게 휘어요.'),
      step(2, '시금치는 끓는 물에 데친 뒤 찬물에 헹구고 물기를 짜요.', 3, '강불', '줄기가 부드러워지고 선명한 초록색을 유지해요.'),
      step(3, '팬에 양파와 당근을 넣어 숨이 살짝 죽을 때까지 각각 볶아 덜어내요.', 5, '중불', '채소가 투명해지기 시작하지만 아삭함이 남아 있어요.'),
      step(4, '같은 팬에 소고기를 넣고 붉은 기가 사라질 때까지 볶아요.', 5, '중강불', '고기 속에 붉은 부분이 없고 육즙이 맑아요.'),
      step(5, '냄비에 당면과 물 350ml, 간장을 넣고 국물이 거의 없어질 때까지 저어가며 익혀요.', 8, '중불', '당면이 투명하고 부드러우며 바닥에 국물이 거의 남지 않아요.'),
      step(6, '익힌 당면에 준비한 채소와 고기를 넣고 고루 섞어 1분간 데워 완성해요.', 1, '약불', '양념이 모든 재료에 고르게 배고 당면이 서로 뭉치지 않아요.'),
    ],
  },
  {
    id: 'chicken-soup',
    name: '닭곰탕',
    servings: 4,
    prepMinutes: 12,
    cookMinutes: 45,
    ingredients: [
      { id: 'chicken-soup-chicken', name: '닭고기', quantity: 800, unit: 'g' },
      { id: 'chicken-soup-radish', name: '무', quantity: 300, unit: 'g' },
      { id: 'chicken-soup-green-onion', name: '대파', quantity: 1, unit: '대' },
      { id: 'chicken-soup-garlic', name: '마늘', quantity: 6, unit: '쪽' },
      { id: 'chicken-soup-rice', name: '밥', quantity: 4, unit: '공기' },
    ],
    optionalIngredients: [
      { id: 'chicken-soup-chive', name: '부추', quantity: 80, unit: 'g' },
    ],
    substitutions: [
      { ingredientName: '닭고기', alternatives: ['닭가슴살 700g', '닭다리 8개'] },
    ],
    steps: [
      step(1, '닭고기는 흐르는 물에 씻고 두꺼운 지방을 제거하며 무는 2cm 크기로 썰어요.', 7, '불 사용 안 함', '닭 표면에 핏물이 없고 무 크기가 고르게 준비돼요.'),
      step(2, '냄비에 닭고기와 물 1.8L를 넣고 끓기 시작하면 떠오르는 거품을 걷어요.', 8, '강불', '국물 표면의 회색 거품이 대부분 제거돼요.'),
      step(3, '무와 마늘을 넣고 뚜껑을 반쯤 덮어 닭고기가 익을 때까지 끓여요.', 25, '중약불', '닭고기의 가장 두꺼운 부분을 잘랐을 때 속이 분홍색이 아니에요.'),
      step(4, '닭고기를 건져 한김 식힌 뒤 뼈를 제거하고 먹기 좋은 크기로 찢어요.', 7, '불 사용 안 함', '작은 뼛조각 없이 살코기만 고르게 발라져요.'),
      step(5, '찢은 닭고기를 국물에 다시 넣고 대파를 더해 한소끔 끓여요.', 4, '중불', '국물이 다시 끓고 대파 향이 올라와요.'),
      step(6, '그릇에 밥을 담고 뜨거운 닭곰탕을 부어 완성해요.', 1, '약불', '국물이 충분히 뜨겁고 닭고기와 무가 부드러워요.'),
    ],
  },
  {
    id: 'salmon-soy-grill',
    name: '연어간장구이',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 16,
    ingredients: [
      { id: 'salmon-grill-salmon', name: '연어', quantity: 600, unit: 'g' },
      { id: 'salmon-grill-soy-sauce', name: '간장', quantity: 3, unit: '큰술' },
      { id: 'salmon-grill-onion', name: '양파', quantity: 1, unit: '개' },
      { id: 'salmon-grill-green-onion', name: '대파', quantity: 0.5, unit: '대' },
      { id: 'salmon-grill-lemon', name: '레몬', quantity: 0.5, unit: '개' },
    ],
    optionalIngredients: [
      { id: 'salmon-grill-asparagus', name: '아스파라거스', quantity: 200, unit: 'g' },
    ],
    substitutions: [
      { ingredientName: '연어', alternatives: ['삼치 600g', '고등어 2마리'] },
    ],
    steps: [
      step(1, '연어는 4등분하고 종이타월로 물기를 닦은 뒤 양파와 대파를 얇게 썰어요.', 5, '불 사용 안 함', '연어 표면에 물기가 남지 않고 조각 크기가 비슷해요.'),
      step(2, '간장과 물 3큰술, 레몬즙을 섞어 구이 양념을 만들어요.', 2, '불 사용 안 함', '간장과 레몬즙이 분리되지 않고 고르게 섞여요.'),
      step(3, '달군 팬에 연어 껍질 쪽을 아래로 놓고 움직이지 않은 채 구워요.', 4, '중불', '껍질이 노릇하고 가장자리 살이 절반 정도 불투명해져요.'),
      step(4, '연어를 뒤집고 양파를 넣어 3분 더 익혀요.', 3, '중약불', '연어 중심까지 불투명해지고 결이 쉽게 갈라져요.'),
      step(5, '양념을 붓고 연어에 끼얹으며 윤기가 돌 때까지 졸여요.', 3, '약불', '양념이 묽게 흐르지 않고 연어 표면에 얇게 달라붙어요.'),
      step(6, '불을 끄고 대파와 레몬을 올려 잔열로 향을 내요.', 1, '불 끔', '연어 속까지 익고 촉촉한 결이 유지돼요.'),
    ],
  },
  {
    id: 'vegetable-bibimbap',
    name: '채소비빔밥',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 20,
    ingredients: [
      { id: 'bibimbap-rice', name: '밥', quantity: 4, unit: '공기' },
      { id: 'bibimbap-zucchini', name: '애호박', quantity: 1, unit: '개' },
      { id: 'bibimbap-carrot', name: '당근', quantity: 1, unit: '개' },
      { id: 'bibimbap-bean-sprouts', name: '콩나물', quantity: 250, unit: 'g' },
      { id: 'bibimbap-egg', name: '계란', quantity: 4, unit: '개' },
      { id: 'bibimbap-gochujang', name: '고추장', quantity: 3, unit: '큰술' },
    ],
    optionalIngredients: [
      { id: 'bibimbap-mushroom', name: '버섯', quantity: 150, unit: 'g' },
    ],
    substitutions: [
      { ingredientName: '고추장', alternatives: ['간장 3큰술', '된장 2큰술'] },
    ],
    steps: [
      step(1, '애호박과 당근은 5cm 길이로 가늘게 채 썰고 콩나물은 씻어 물기를 빼요.', 7, '불 사용 안 함', '채소 굵기가 비슷하고 콩나물 껍질이 제거돼요.'),
      step(2, '콩나물은 물 100ml와 함께 뚜껑을 덮어 익힌 뒤 물기를 빼요.', 6, '중불', '콩나물 비린 향이 사라지고 줄기가 부드러워요.'),
      step(3, '팬에 애호박과 당근을 차례로 넣어 각각 숨이 살짝 죽을 만큼 볶아요.', 6, '중불', '채소 색이 선명하고 아삭한 식감이 남아 있어요.'),
      step(4, '같은 팬에 계란을 깨 넣어 흰자가 완전히 익도록 프라이해요.', 4, '중약불', '흰자는 투명한 부분 없이 익고 노른자는 원하는 정도로 익어요.'),
      step(5, '따뜻한 밥 위에 준비한 채소와 계란을 보기 좋게 나눠 올려요.', 2, '불 사용 안 함', '재료가 섞이지 않고 색깔별로 고르게 담겨요.'),
      step(6, '고추장을 곁들이고 먹기 직전에 밥과 재료를 고루 비벼 완성해요.', 1, '불 사용 안 함', '양념이 밥알과 모든 채소에 고르게 묻어요.'),
    ],
  },
  {
    id: 'squid-radish-soup',
    name: '오징어무국',
    servings: 4,
    prepMinutes: 12,
    cookMinutes: 20,
    ingredients: [
      { id: 'squid-soup-squid', name: '오징어', quantity: 2, unit: '마리' },
      { id: 'squid-soup-radish', name: '무', quantity: 350, unit: 'g' },
      { id: 'squid-soup-green-onion', name: '대파', quantity: 1, unit: '대' },
      { id: 'squid-soup-garlic', name: '마늘', quantity: 1, unit: '큰술' },
      { id: 'squid-soup-soy-sauce', name: '국간장', quantity: 2, unit: '큰술' },
    ],
    optionalIngredients: [
      { id: 'squid-soup-chili', name: '청양고추', quantity: 1, unit: '개' },
    ],
    substitutions: [
      { ingredientName: '오징어', alternatives: ['새우 350g', '바지락 500g'] },
    ],
    steps: [
      step(1, '오징어는 내장과 껍질을 정리해 1cm 폭으로 썰고 무는 얇은 나박 모양으로 썰어요.', 8, '불 사용 안 함', '오징어에 투명한 연골이 남지 않고 무 두께가 고르게 준비돼요.'),
      step(2, '냄비에 무와 국간장을 넣고 무 가장자리가 투명해질 때까지 볶아요.', 4, '중불', '무 표면에 간장이 배고 가장자리가 반투명해져요.'),
      step(3, '물 1.2L와 마늘을 넣고 무가 부드러워질 때까지 끓여요.', 10, '중불', '젓가락이 무에 힘들이지 않고 들어가요.'),
      step(4, '오징어를 넣고 몸통이 하얗게 오그라들 때까지만 끓여요.', 3, '중강불', '오징어 전체가 불투명하고 탄력 있게 말려요.'),
      step(5, '대파를 넣고 국물 간을 확인한 뒤 한소끔 더 끓여요.', 2, '중불', '대파 향이 올라오고 국물이 맑고 시원한 맛이에요.'),
      step(6, '불을 끄고 오징어가 질겨지기 전에 바로 그릇에 담아요.', 1, '불 끔', '오징어가 부드럽게 씹히고 무가 충분히 익었어요.'),
    ],
  },
  {
    id: 'steamed-egg',
    name: '계란찜',
    servings: 4,
    prepMinutes: 8,
    cookMinutes: 15,
    ingredients: [
      { id: 'steamed-egg-eggs', name: '계란', quantity: 6, unit: '개' },
      { id: 'steamed-egg-broth', name: '육수', quantity: 350, unit: 'ml' },
      { id: 'steamed-egg-green-onion', name: '대파', quantity: 0.5, unit: '대' },
      { id: 'steamed-egg-carrot', name: '당근', quantity: 0.25, unit: '개' },
    ],
    optionalIngredients: [
      { id: 'steamed-egg-shrimp', name: '새우', quantity: 100, unit: 'g' },
    ],
    substitutions: [
      { ingredientName: '육수', alternatives: ['물 350ml', '우유 300ml'] },
    ],
    steps: [
      step(1, '계란을 볼에 깨 넣고 흰자와 노른자가 완전히 섞일 때까지 부드럽게 풀어요.', 2, '불 사용 안 함', '진한 흰자 덩어리 없이 색이 고르게 섞여요.'),
      step(2, '육수를 계란에 조금씩 부어 섞고 체에 한 번 내려 알끈과 거품을 제거해요.', 3, '불 사용 안 함', '계란물이 매끈하고 표면에 큰 거품이 없어요.'),
      step(3, '당근과 대파를 잘게 썰어 계란물에 절반만 섞어요.', 3, '불 사용 안 함', '채소 조각이 쌀알 크기로 고르게 잘려 있어요.'),
      step(4, '냄비에 계란물을 붓고 가장자리가 익기 시작할 때까지 천천히 저어요.', 4, '중약불', '가장자리에 부드러운 계란 덩어리가 생기기 시작해요.'),
      step(5, '남은 채소를 올리고 뚜껑을 덮어 중심까지 익혀요.', 8, '약불', '가운데를 흔들었을 때 물처럼 출렁이지 않고 부드럽게 탄력이 있어요.'),
      step(6, '불을 끈 뒤 뚜껑을 덮은 채 2분 뜸 들여 완성해요.', 2, '불 끔', '표면이 촉촉하고 바닥이 타지 않은 상태예요.'),
    ],
  },
  {
    id: 'andong-jjimdak',
    name: '안동찜닭',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 38,
    ingredients: [
      { id: 'jjimdak-chicken', name: '닭고기', quantity: 900, unit: 'g' },
      { id: 'jjimdak-potato', name: '감자', quantity: 2, unit: '개' },
      { id: 'jjimdak-carrot', name: '당근', quantity: 1, unit: '개' },
      { id: 'jjimdak-onion', name: '양파', quantity: 1, unit: '개' },
      { id: 'jjimdak-noodles', name: '당면', quantity: 150, unit: 'g' },
      { id: 'jjimdak-soy-sauce', name: '간장', quantity: 7, unit: '큰술' },
    ],
    optionalIngredients: [
      { id: 'jjimdak-chili', name: '건고추', quantity: 2, unit: '개' },
    ],
    substitutions: [
      { ingredientName: '감자', alternatives: ['고구마 2개', '단호박 300g'] },
    ],
    steps: [
      step(1, '당면은 찬물에 불리고 닭고기는 흐르는 물에 씻어 물기를 빼요.', 10, '불 사용 안 함', '당면이 부드럽게 휘고 닭 표면에 핏물이 남지 않아요.'),
      step(2, '닭고기를 끓는 물에 넣어 겉면만 데친 뒤 깨끗한 물로 헹궈요.', 4, '강불', '닭 겉면이 하얗게 변하고 불순물이 제거돼요.'),
      step(3, '냄비에 닭고기와 물 700ml, 간장을 넣고 끓으면 거품을 걷어요.', 8, '중강불', '국물이 끓고 표면의 거품이 대부분 제거돼요.'),
      step(4, '감자와 당근을 넣고 뚜껑을 덮어 닭고기와 채소를 익혀요.', 15, '중불', '감자에 젓가락이 절반 이상 들어가고 닭 속에 붉은 기가 없어요.'),
      step(5, '양파와 불린 당면을 넣고 국물이 자작해질 때까지 졸여요.', 8, '중약불', '당면이 투명하고 양념이 재료 표면에 고르게 배어요.'),
      step(6, '국물이 숟가락으로 떠질 정도로 남으면 불을 끄고 2분간 쉬게 해요.', 2, '불 끔', '닭고기가 완전히 익고 감자는 모양을 유지하며 부드러워요.'),
    ],
  },
  {
    id: 'potato-pancake',
    name: '감자전',
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 20,
    ingredients: [
      { id: 'potato-pancake-potato', name: '감자', quantity: 6, unit: '개' },
      { id: 'potato-pancake-onion', name: '양파', quantity: 0.5, unit: '개' },
      { id: 'potato-pancake-starch', name: '감자전분', quantity: 2, unit: '큰술' },
      { id: 'potato-pancake-soy-sauce', name: '간장', quantity: 2, unit: '큰술' },
    ],
    optionalIngredients: [
      { id: 'potato-pancake-chive', name: '부추', quantity: 60, unit: 'g' },
    ],
    substitutions: [
      { ingredientName: '감자전분', alternatives: ['부침가루 2큰술', '옥수수전분 2큰술'] },
    ],
    steps: [
      step(1, '감자와 양파는 껍질을 벗기고 강판이나 믹서로 곱게 갈아요.', 7, '불 사용 안 함', '큰 덩어리 없이 되직한 감자 반죽이 돼요.'),
      step(2, '간 감자를 체에 받쳐 5분 두고 아래에 가라앉은 전분만 남겨요.', 5, '불 사용 안 함', '윗물이 분리되고 그릇 바닥에 흰 전분이 가라앉아요.'),
      step(3, '감자 건더기에 가라앉힌 전분과 감자전분을 넣어 고르게 섞어요.', 2, '불 사용 안 함', '반죽이 물처럼 흐르지 않고 숟가락에 되직하게 묻어요.'),
      step(4, '달군 팬에 반죽을 한 국자씩 얇게 펴고 가장자리가 노릇해질 때까지 구워요.', 5, '중불', '윗면의 물기가 줄고 가장자리가 바삭하게 굳어요.'),
      step(5, '전을 뒤집어 반대쪽도 노릇하게 익혀요.', 4, '중불', '양면이 고르게 황금빛이고 가운데가 투명하지 않아요.'),
      step(6, '완성된 전을 잠시 세워 기름을 빼고 간장과 곁들여요.', 2, '불 사용 안 함', '겉은 바삭하고 속은 촉촉하게 익었어요.'),
    ],
  },
  {
    id: 'tofu-mushroom-rice',
    name: '두부버섯덮밥',
    servings: 4,
    prepMinutes: 12,
    cookMinutes: 20,
    ingredients: [
      { id: 'tofu-rice-tofu', name: '두부', quantity: 2, unit: '모' },
      { id: 'tofu-rice-mushroom', name: '버섯', quantity: 300, unit: 'g' },
      { id: 'tofu-rice-onion', name: '양파', quantity: 1, unit: '개' },
      { id: 'tofu-rice-rice', name: '밥', quantity: 4, unit: '공기' },
      { id: 'tofu-rice-soy-sauce', name: '간장', quantity: 4, unit: '큰술' },
    ],
    optionalIngredients: [
      { id: 'tofu-rice-green-onion', name: '대파', quantity: 0.5, unit: '대' },
    ],
    substitutions: [
      { ingredientName: '두부', alternatives: ['유부 250g', '계란 4개'] },
    ],
    steps: [
      step(1, '두부는 2cm 크기로 썰어 물기를 닦고 버섯은 결대로 찢고 양파는 채 썰어요.', 7, '불 사용 안 함', '두부 표면에 물기가 없고 채소 크기가 비슷해요.'),
      step(2, '달군 팬에 두부를 올려 모든 면이 노릇해지도록 굴려가며 구워요.', 7, '중불', '두부 겉면이 황금빛이고 뒤집을 때 부서지지 않아요.'),
      step(3, '두부를 덜어낸 팬에 양파와 버섯을 넣어 수분이 줄어들 때까지 볶아요.', 5, '중강불', '버섯 숨이 죽고 팬 바닥에 물이 고이지 않아요.'),
      step(4, '간장과 물 200ml를 붓고 구운 두부를 넣어 양념을 끼얹으며 끓여요.', 5, '중불', '두부 표면에 간장색이 배고 소스가 절반 정도로 줄어요.'),
      step(5, '소스가 자작해지면 대파를 넣고 1분 더 익혀 향을 내요.', 1, '약불', '소스가 숟가락 뒷면에 얇게 묻고 대파 향이 올라와요.'),
      step(6, '따뜻한 밥 위에 두부와 버섯, 남은 소스를 나누어 올려요.', 1, '불 사용 안 함', '두부가 따뜻하고 소스가 밥에 고르게 스며들어요.'),
    ],
  },
  {
    id: 'boiled-pork',
    name: '돼지고기수육',
    servings: 4,
    prepMinutes: 12,
    cookMinutes: 50,
    ingredients: [
      { id: 'boiled-pork-pork', name: '돼지고기', quantity: 800, unit: 'g' },
      { id: 'boiled-pork-onion', name: '양파', quantity: 1, unit: '개' },
      { id: 'boiled-pork-green-onion', name: '대파', quantity: 1, unit: '대' },
      { id: 'boiled-pork-garlic', name: '마늘', quantity: 8, unit: '쪽' },
      { id: 'boiled-pork-doenjang', name: '된장', quantity: 2, unit: '큰술' },
    ],
    optionalIngredients: [
      { id: 'boiled-pork-cabbage', name: '배추', quantity: 0.25, unit: '통' },
    ],
    substitutions: [
      { ingredientName: '돼지고기', alternatives: ['소고기 양지 800g', '닭다리 8개'] },
    ],
    steps: [
      step(1, '돼지고기는 찬물에 10분 담갔다가 꺼내 종이타월로 물기를 닦아요.', 10, '불 사용 안 함', '고기 표면에 핏물과 물기가 거의 남지 않아요.'),
      step(2, '고기가 잠길 만큼의 물에 양파와 대파, 마늘, 된장을 풀어 끓여요.', 8, '강불', '된장이 완전히 풀리고 향신 채소 향이 올라와요.'),
      step(3, '물이 끓으면 돼지고기를 넣고 다시 끓을 때까지 익혀요.', 6, '강불', '고기 겉면이 전체적으로 하얗게 변해요.'),
      step(4, '불을 줄이고 뚜껑을 반쯤 덮어 고기 중심까지 천천히 익혀요.', 35, '중약불', '가장 두꺼운 부분을 찔렀을 때 맑은 육즙이 나와요.'),
      step(5, '불을 끄고 육수 안에서 5분간 뜸 들인 뒤 고기를 건져요.', 5, '불 끔', '고기가 탄력은 있지만 젓가락이 부드럽게 들어가요.'),
      step(6, '결의 반대 방향으로 0.7cm 두께로 썰어 따뜻할 때 담아요.', 4, '불 사용 안 함', '절단면에 붉은 기가 없고 육즙이 촉촉하게 남아 있어요.'),
    ],
  },
]

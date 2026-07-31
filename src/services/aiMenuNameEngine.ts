const MENU_NAME_ALIASES = new Map([
  ['간장돼지불고기와밥', '간장불고기'],
  ['소고기미역국과밥', '소고기미역국'],
  ['닭고기간장볶음감자', '찜닭'],
  ['두부달걀부침밥', '두부부침'],
  ['돼지고기김치없는볶음밥', '돼지고기볶음밥'],
  ['소고기맑은국구운채소', '소고기뭇국'],
])

const STANDARD_DISH_ENDINGS = [
  '볶음밥',
  '카레라이스',
  '볶음탕',
  '김밥',
  '비빔밥',
  '덮밥',
  '찌개',
  '전골',
  '불고기',
  '미역국',
  '뭇국',
  '무국',
  '된장국',
  '곰탕',
  '국밥',
  '국수',
  '파스타',
  '샐러드',
  '카레',
  '갈비',
  '잡채',
  '수육',
  '보쌈',
  '라면',
  '우동',
  '볶음',
  '조림',
  '구이',
  '부침',
  '말이',
  '찜',
  '탕',
  '국',
  '전',
  '밥',
]

const SENTENCE_LIKE_PATTERNS = [
  /없는/,
  /함께/,
  /곁들/,
  /구운채소/,
  /(와|과)(밥|채소|반찬|국|샐러드)$/,
  /(만들기|요리|메뉴)$/,
]

function compactKoreanMenuName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[()[\]{}'"’“”·,_-]/g, '')
}

export function normalizeAiMenuName(
  value: unknown,
): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const compactName = compactKoreanMenuName(value)
  const aliasedName =
    MENU_NAME_ALIASES.get(compactName) ??
    compactName

  if (
    aliasedName.length < 2 ||
    aliasedName.length > 12 ||
    !/^[가-힣0-9]+$/.test(aliasedName) ||
    SENTENCE_LIKE_PATTERNS.some((pattern) =>
      pattern.test(aliasedName),
    ) ||
    !STANDARD_DISH_ENDINGS.some((ending) =>
      aliasedName.endsWith(ending),
    )
  ) {
    return null
  }

  return aliasedName
}

const KNOWN_MENU_TITLE_CORRECTIONS = new Map([
  ['감자양파계란국', '감자 양파 계란국'],
  ['감자양파달걀국', '감자 양파 계란국'],
])

export function correctKnownAiText(value: string) {
  return value.replace(/게란/g, '계란')
}

export function polishAiMenuTitle(value: string) {
  const corrected = correctKnownAiText(value)
    .trim()
    .replace(/\s+/g, ' ')
  const compact = corrected.replace(/\s+/g, '')

  return (
    KNOWN_MENU_TITLE_CORRECTIONS.get(compact) ??
    corrected
  )
}

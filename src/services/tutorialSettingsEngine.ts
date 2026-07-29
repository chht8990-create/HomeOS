export const TUTORIAL_SETTINGS_STORAGE_KEY =
  'today-table.tutorial-settings.v1'

export type TutorialSettings = {
  doNotShowAgain: boolean
}

export const defaultTutorialSettings: TutorialSettings = {
  doNotShowAgain: false,
}

export function parseTutorialSettings(
  value: unknown,
): TutorialSettings {
  if (!value || typeof value !== 'object') {
    return { ...defaultTutorialSettings }
  }

  const candidate = value as Partial<TutorialSettings>

  return {
    doNotShowAgain:
      candidate.doNotShowAgain === true,
  }
}

export function readTutorialSettings(
  storage: Pick<Storage, 'getItem'>,
) {
  const stored = storage.getItem(
    TUTORIAL_SETTINGS_STORAGE_KEY,
  )

  if (!stored) {
    return { ...defaultTutorialSettings }
  }

  try {
    return parseTutorialSettings(JSON.parse(stored))
  } catch {
    return { ...defaultTutorialSettings }
  }
}

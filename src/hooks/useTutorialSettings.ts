import { useState } from 'react'
import {
  readTutorialSettings,
  TUTORIAL_SETTINGS_STORAGE_KEY,
} from '../services/tutorialSettingsEngine'

function useTutorialSettings() {
  const [doNotShowAgain, setDoNotShowAgain] =
    useState(
      () =>
        readTutorialSettings(window.localStorage)
          .doNotShowAgain,
    )

  function completeTutorial(
    shouldNotShowAgain: boolean,
  ) {
    const nextSettings = {
      doNotShowAgain: shouldNotShowAgain,
    }

    window.localStorage.setItem(
      TUTORIAL_SETTINGS_STORAGE_KEY,
      JSON.stringify(nextSettings),
    )
    setDoNotShowAgain(shouldNotShowAgain)
  }

  return {
    doNotShowAgain,
    completeTutorial,
  }
}

export default useTutorialSettings

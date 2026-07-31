import { useState } from 'react'
import { tutorialPages } from '../data/tutorialPages'
import useMeasurementPreferences from '../hooks/useMeasurementPreferences'
import {
  measurementToolOptions,
  tutorialMeasurementTools,
} from '../services/measurementEngine'
import Button from './ui/Button'
import Dialog from './ui/Dialog'

type FirstRunTutorialProps = {
  open: boolean
  onClose: () => void
  onComplete: (doNotShowAgain: boolean) => void
  onOpenGuide: (doNotShowAgain: boolean) => void
}

function FirstRunTutorial({
  open,
  onClose,
  onComplete,
  onOpenGuide,
}: FirstRunTutorialProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const [doNotShowAgain, setDoNotShowAgain] =
    useState(true)
  const {
    selectedTools,
    toggleTool,
  } = useMeasurementPreferences()

  const page = tutorialPages[pageIndex]
  const isLastPage =
    pageIndex === tutorialPages.length - 1
  const PageIcon = page.Icon

  function resetAndClose() {
    setPageIndex(0)
    setDoNotShowAgain(true)
    onClose()
  }

  function complete() {
    const savedPreference = doNotShowAgain

    setPageIndex(0)
    setDoNotShowAgain(true)
    onComplete(savedPreference)
  }

  return (
    <Dialog
      open={open}
      title="오늘식탁 시작하기"
      description={`${pageIndex + 1} / ${tutorialPages.length}`}
      onClose={resetAndClose}
      className="first-run-tutorial"
      footer={
        <div className="first-run-tutorial__footer">
          <label className="first-run-tutorial__preference">
            <input
              type="checkbox"
              checked={doNotShowAgain}
              onChange={(event) =>
                setDoNotShowAgain(
                  event.target.checked,
                )
              }
            />
            <span>다시 보지 않기</span>
          </label>

          <div className="first-run-tutorial__actions">
            {pageIndex > 0 ? (
              <Button
                variant="secondary"
                onClick={() =>
                  setPageIndex(
                    (currentPage) =>
                      currentPage - 1,
                  )
                }
              >
                이전
              </Button>
            ) : null}

            {isLastPage ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() =>
                    onOpenGuide(doNotShowAgain)
                  }
                >
                  사용 순서 자세히 보기
                </Button>
                <Button
                  className="first-run-tutorial__start-button"
                  onClick={() =>
                    complete()
                  }
                >
                  오늘식탁 시작하기
                </Button>
              </>
            ) : (
              <Button
                onClick={() =>
                  setPageIndex(
                    (currentPage) =>
                      currentPage + 1,
                  )
                }
              >
                다음
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="first-run-tutorial__content">
        <div
          className="first-run-tutorial__icon"
          aria-hidden="true"
        >
          <PageIcon size={38} strokeWidth={1.9} />
        </div>
        <div>
          <h3>{page.title}</h3>
          <p>{page.description}</p>
        </div>
        {isLastPage ? (
          <fieldset className="first-run-tutorial__tools">
            <legend>집에서 사용할 수 있는 계량도구</legend>
            <p>
              선택한 도구에 맞춰 레시피 계량법을
              보여드려요.
            </p>
            {measurementToolOptions
              .filter((option) =>
                tutorialMeasurementTools.includes(
                  option.value,
                ),
              )
              .map((option) => (
                <label key={option.value}>
                  <input
                    type="checkbox"
                    checked={selectedTools.includes(
                      option.value,
                    )}
                    onChange={() =>
                      toggleTool(option.value)
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
          </fieldset>
        ) : null}
        <div
          className="first-run-tutorial__progress"
          aria-label={`튜토리얼 ${pageIndex + 1}단계`}
        >
          {tutorialPages.map((tutorialPage, index) => (
            <span
              key={tutorialPage.title}
              className={
                index === pageIndex ? 'is-active' : ''
              }
            />
          ))}
        </div>
      </div>
    </Dialog>
  )
}

export default FirstRunTutorial

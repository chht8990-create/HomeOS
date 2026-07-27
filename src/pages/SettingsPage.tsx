import {
  useState,
  type ChangeEvent,
} from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ScreenHeader from '../components/ui/ScreenHeader'
import Section from '../components/ui/Section'
import useHomeOsBackup from '../hooks/useHomeOsBackup'
import useMealPackImport from '../hooks/useMealPackImport'
import type { HomeOsBackup } from '../services/homeOsBackupEngine'
import type { MealType } from '../types/meal'
import type { MealPackPreview } from '../services/mealPackEngine'

const mealTypeLabels: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

function SettingsPage() {
  const { prepare, apply } = useMealPackImport()
  const {
    exportBackup,
    prepareImport: prepareBackupImport,
    applyImport: applyBackupImport,
  } = useHomeOsBackup()
  const [fileInputKey, setFileInputKey] =
    useState(0)
  const [selectedFileName, setSelectedFileName] =
    useState('')
  const [preview, setPreview] =
    useState<MealPackPreview | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] =
    useState('')
  const [backupFileInputKey, setBackupFileInputKey] =
    useState(0)
  const [backupFileName, setBackupFileName] =
    useState('')
  const [backupPreview, setBackupPreview] =
    useState<HomeOsBackup | null>(null)
  const [backupErrors, setBackupErrors] = useState<
    string[]
  >([])
  const [backupStatus, setBackupStatus] =
    useState('')

  function resetSelection() {
    setFileInputKey((currentKey) => currentKey + 1)
    setSelectedFileName('')
    setPreview(null)
    setErrors([])
    setSuccessMessage('')
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]

    setPreview(null)
    setErrors([])
    setSuccessMessage('')

    if (!file) {
      setSelectedFileName('')
      return
    }

    setSelectedFileName(file.name)

    try {
      const result = prepare(await file.text())

      if (!result.success) {
        setErrors(result.errors)
        return
      }

      setPreview(result.preview)
    } catch {
      setErrors(['파일을 읽을 수 없습니다.'])
    }
  }

  function handleApply() {
    if (!preview) {
      return
    }

    const shouldApply = window.confirm(
      `${preview.mealPack.pack.name}을(를) 가져올까요? 충돌 항목은 건너뜁니다.`,
    )

    if (!shouldApply) {
      return
    }

    const recipeCount =
      preview.recipesToImport.length
    const mealPlanCount =
      preview.plannedMealsToImport.length

    apply(preview)
    setFileInputKey((currentKey) => currentKey + 1)
    setSelectedFileName('')
    setPreview(null)
    setErrors([])
    setSuccessMessage(
      `Recipe ${recipeCount}개와 Planner ${mealPlanCount}개를 가져왔습니다.`,
    )
  }

  const hasImportableItems = Boolean(
    preview &&
      (preview.recipesToImport.length > 0 ||
        preview.plannedMealsToImport.length > 0),
  )

  function resetBackupSelection() {
    setBackupFileInputKey(
      (currentKey) => currentKey + 1,
    )
    setBackupFileName('')
    setBackupPreview(null)
    setBackupErrors([])
  }

  function handleBackupExport() {
    const backup = exportBackup()

    setBackupStatus(
      `HomeOS 전체 백업을 저장했습니다. (${backup.exportedAt})`,
    )
  }

  async function handleBackupFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]

    setBackupPreview(null)
    setBackupErrors([])
    setBackupStatus('')

    if (!file) {
      setBackupFileName('')
      return
    }

    setBackupFileName(file.name)

    try {
      const result = prepareBackupImport(
        await file.text(),
      )

      if (!result.success) {
        setBackupErrors(result.errors)
        return
      }

      setBackupPreview(result.backup)
    } catch {
      setBackupErrors([
        '백업 파일을 읽을 수 없습니다.',
      ])
    }
  }

  function handleBackupApply() {
    if (!backupPreview) {
      return
    }

    const shouldApply = window.confirm(
      '이 백업으로 HomeOS 전체 데이터를 복원할까요? 현재 데이터는 먼저 자동 백업됩니다.',
    )

    if (!shouldApply) {
      return
    }

    applyBackupImport(backupPreview)
  }

  return (
    <>
      <ScreenHeader
        title="설정"
        description="Meal Pack으로 Recipe와 식단 계획을 한 번에 가져오세요."
      />

      <main className="app-content">
        <Section
          title="Meal Pack 가져오기"
          description="JSON 파일을 확인한 뒤 기존 데이터에 추가합니다."
        >
          <Card>
            <div className="inventory-form">
              <label className="inventory-form__field">
                Meal Pack JSON
                <input
                  key={fileInputKey}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                />
              </label>

              {selectedFileName && (
                <p className="meal-editor__help">
                  선택한 파일: {selectedFileName}
                </p>
              )}
            </div>

            {errors.length > 0 && (
              <div role="alert">
                <h3>가져올 수 없는 파일이에요.</h3>
                <ul>
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {successMessage && (
              <p role="status">{successMessage}</p>
            )}

            {!preview &&
              errors.length === 0 &&
              !successMessage && (
                <EmptyState
                  icon="📦"
                  title="선택한 Meal Pack이 없어요."
                  description="JSON 파일을 선택하면 메타데이터와 적용 내용을 먼저 보여드려요."
                />
              )}

            {preview && (
              <>
                <Section
                  title={preview.mealPack.pack.name}
                  description={
                    preview.mealPack.pack.description
                  }
                >
                  <ul className="inventory-list">
                    <li className="inventory-item">
                      <strong>Pack ID</strong>
                      <span>
                        {preview.mealPack.pack.id}
                      </span>
                    </li>
                    <li className="inventory-item">
                      <strong>형식 버전</strong>
                      <span>
                        {
                          preview.mealPack.pack
                            .formatVersion
                        }
                      </span>
                    </li>
                    <li className="inventory-item">
                      <strong>기준 인원</strong>
                      <span>
                        {preview.mealPack.pack.servings}명
                      </span>
                    </li>
                    <li className="inventory-item">
                      <strong>기간</strong>
                      <span>
                        {preview.mealPack.pack.startDate}
                        {' · '}
                        {
                          preview.mealPack.pack
                            .durationDays
                        }
                        일
                      </span>
                    </li>
                    <li className="inventory-item">
                      <strong>알레르기</strong>
                      <span>
                        {preview.mealPack.pack.allergies
                          .join(', ') || '없음'}
                      </span>
                    </li>
                    <li className="inventory-item">
                      <strong>제외 음식</strong>
                      <span>
                        {preview.mealPack.pack.excludedFoods
                          .join(', ') || '없음'}
                      </span>
                    </li>
                  </ul>
                </Section>

                <Section
                  title={`Recipe ${preview.mealPack.recipes.length}개`}
                  description={`적용 ${preview.recipesToImport.length}개`}
                >
                  <ul className="inventory-list">
                    {preview.mealPack.recipes.map(
                      (recipe) => (
                        <li
                          key={recipe.id}
                          className="inventory-item"
                        >
                          <strong>{recipe.name}</strong>
                          <span>
                            재료{' '}
                            {recipe.ingredients.length}개
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </Section>

                <Section
                  title={`Planner ${preview.mealPack.plannedMeals.length}개`}
                  description={`적용 ${preview.plannedMealsToImport.length}개`}
                >
                  <ul className="inventory-list">
                    {preview.mealPack.plannedMeals.map(
                      (mealPlan) => (
                        <li
                          key={mealPlan.id}
                          className="inventory-item"
                        >
                          <div>
                            <strong>
                              {mealPlan.name}
                            </strong>
                            <p>
                              {mealPlan.date}
                              {' · '}
                              {
                                mealTypeLabels[
                                  mealPlan.type
                                ]
                              }
                            </p>
                          </div>
                        </li>
                      ),
                    )}
                  </ul>
                </Section>

                {preview.conflicts.length > 0 && (
                  <Section
                    title={`충돌 ${preview.conflicts.length}건`}
                    description="기존 데이터를 유지하고 아래 항목은 건너뜁니다."
                  >
                    <ul>
                      {preview.conflicts.map(
                        (conflict) => (
                          <li
                            key={`${conflict.type}:${conflict.incomingId}`}
                          >
                            {conflict.message}
                          </li>
                        ),
                      )}
                    </ul>
                  </Section>
                )}

                <div className="meal-editor__actions">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={resetSelection}
                  >
                    취소
                  </Button>

                  <Button
                    fullWidth
                    disabled={!hasImportableItems}
                    onClick={handleApply}
                  >
                    가져오기 적용
                  </Button>
                </div>
              </>
            )}
          </Card>
        </Section>

        <Section
          title="HomeOS 전체 백업/복원"
          description="Inventory, Shopping, Planner, Recipe 등 HomeOS 데이터를 한 파일로 보관하고 복원합니다."
        >
          <Card>
            <div className="inventory-form">
              <Button
                fullWidth
                onClick={handleBackupExport}
              >
                전체 데이터 내보내기
              </Button>

              <p className="meal-editor__help">
                복원할 때는 현재 데이터를 먼저 자동
                백업한 뒤 선택한 파일을 적용합니다.
              </p>

              <label className="inventory-form__field">
                HomeOS 백업 JSON
                <input
                  key={backupFileInputKey}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleBackupFileChange}
                />
              </label>

              {backupFileName ? (
                <p className="meal-editor__help">
                  선택한 파일: {backupFileName}
                </p>
              ) : null}
            </div>

            {backupErrors.length > 0 ? (
              <div role="alert">
                <h3>복원할 수 없는 파일이에요.</h3>
                <ul>
                  {backupErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {backupStatus ? (
              <p role="status">{backupStatus}</p>
            ) : null}

            {backupPreview ? (
              <Section
                title="백업 미리보기"
                description={`내보낸 시각: ${backupPreview.exportedAt}`}
              >
                <ul className="inventory-list">
                  <li className="inventory-item">
                    <strong>Inventory</strong>
                    <span>
                      {
                        backupPreview.data.inventory
                          .length
                      }
                      개
                    </span>
                  </li>
                  <li className="inventory-item">
                    <strong>Shopping</strong>
                    <span>
                      {
                        backupPreview.data.shopping
                          .length
                      }
                      개
                    </span>
                  </li>
                  <li className="inventory-item">
                    <strong>Planner</strong>
                    <span>
                      {
                        backupPreview.data.planner
                          .length
                      }
                      개
                    </span>
                  </li>
                  <li className="inventory-item">
                    <strong>Imported Recipe</strong>
                    <span>
                      {
                        backupPreview.data.recipes
                          .length
                      }
                      개
                    </span>
                  </li>
                </ul>

                <div className="meal-editor__actions">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={resetBackupSelection}
                  >
                    취소
                  </Button>

                  <Button
                    fullWidth
                    onClick={handleBackupApply}
                  >
                    전체 백업 복원
                  </Button>
                </div>
              </Section>
            ) : null}
          </Card>
        </Section>
      </main>
    </>
  )
}

export default SettingsPage

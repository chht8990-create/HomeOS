import useMeal from './useMeal'

function getTodayDateKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function useTodayMeal() {
  const meal = useMeal({
    date: getTodayDateKey(),
    mealType: 'dinner',
  })

  return {
    ...meal,
    saveDinner: meal.saveMeal,
    skipDinner: meal.skipMeal,
    clearDinner: meal.clearMeal,
  }
}

export default useTodayMeal
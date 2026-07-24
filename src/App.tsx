import './App.css'
import BottomNavigation from './components/BottomNavigation'
import TodayPage from './pages/TodayPage'

function App() {
  return (
    <div className="app">
      <TodayPage />
      <BottomNavigation />
    </div>
  )
}

export default App
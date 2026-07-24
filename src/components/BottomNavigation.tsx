function BottomNavigation() {
  return (
    <nav className="bottom-navigation" aria-label="주요 메뉴">
      <button type="button" className="nav-item active">
        <span>●</span>
        오늘
      </button>

      <button type="button" className="nav-item">
        <span>○</span>
        식단
      </button>

      <button type="button" className="nav-item">
        <span>○</span>
        장보기
      </button>

      <button type="button" className="nav-item">
        <span>○</span>
        재고
      </button>

      <button type="button" className="nav-item">
        <span>○</span>
        설정
      </button>
    </nav>
  )
}

export default BottomNavigation
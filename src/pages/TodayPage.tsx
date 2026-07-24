function TodayPage() {
  return (
    <>
      <header className="app-header">
        <p className="app-name">HomeOS</p>
        <h1>오늘</h1>
      </header>

      <main className="app-content">
        <section className="welcome-card">
          <p className="welcome-label">오늘의 식사</p>
          <h2>우리 가족은 오늘 무엇을 먹을까요?</h2>
          <p>아직 등록된 식사 계획이 없어요.</p>
        </section>
      </main>
    </>
  )
}

export default TodayPage
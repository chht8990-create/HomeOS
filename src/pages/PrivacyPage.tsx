import { ArrowLeft, ShieldCheck } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ScreenHeader from '../components/ui/ScreenHeader'
import {
  OFFICIAL_SUPPORT_EMAIL,
  OFFICIAL_SUPPORT_MAILTO,
} from '../config/contact'
import './LegalPage.css'

type PrivacyPageProps = {
  onBack: () => void
}

function PrivacyPage({ onBack }: PrivacyPageProps) {
  return (
    <>
      <ScreenHeader
        title="개인정보처리방침"
        description="오늘식탁이 어떤 정보를 왜 처리하는지 알려드립니다."
        action={
          <Button
            variant="ghost"
            onClick={onBack}
            aria-label="더보기로 돌아가기"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            돌아가기
          </Button>
        }
      />

      <main className="app-content legal-page">
        <Card className="legal-page__summary">
          <ShieldCheck size={28} aria-hidden="true" />
          <div>
            <strong>오늘식탁 개인정보처리방침</strong>
            <p>
              시행일 2026년 8월 3일 · 서비스명 오늘식탁
            </p>
          </div>
        </Card>

        <article className="legal-page__document">
          <section aria-labelledby="privacy-overview">
            <h2 id="privacy-overview">1. 기본 원칙</h2>
            <p>
              오늘식탁은 식단, 장보기, 냉장고와 레시피를
              관리하고 AI 추천을 제공하는 서비스입니다. 로그인하지
              않은 사용자의 기본 데이터는 기기에 저장되며, Google
              로그인과 계정 동기화 또는 AI 기능을 사용할 때 필요한
              정보만 서버와 외부 처리 서비스로 전송합니다.
            </p>
          </section>

          <section aria-labelledby="privacy-data">
            <h2 id="privacy-data">2. 처리하는 정보</h2>
            <h3>Google 로그인과 계정</h3>
            <ul>
              <li>
                Google 계정 고유 식별자, 이메일, 이메일 확인 여부,
                표시 이름 및 Google이 제공하는 경우 프로필 이미지
              </li>
              <li>
                오늘식탁 내부 사용자·기기 식별자, 세션 만료 시각과
                마지막 로그인·동기화 시각
              </li>
            </ul>

            <h3>사용자가 저장하는 앱 데이터</h3>
            <ul>
              <li>냉장고 재료의 이름, 수량과 단위</li>
              <li>레시피, 식단, 장보기 목록과 구매 상태</li>
              <li>계량도구 설정과 계정 동기화 변경 이력</li>
            </ul>

            <h3>AI 기능 이용 정보</h3>
            <ul>
              <li>
                AI 추천에 필요한 냉장고 재료, 인원, 선호·제외 조건
              </li>
              <li>
                생성된 메뉴·레시피, 요청 성공 여부, 처리시간과 토큰
                사용량
              </li>
            </ul>

            <h3>Trial·Premium와 결제 확인 정보</h3>
            <ul>
              <li>
                FREE·TRIAL·PREMIUM 상태, 체험 시작·종료 시각과 AI
                기능별 이용 횟수
              </li>
              <li>
                Google Play 상품 ID, 구매 상태, 만료 시각 및 구매
                토큰의 해시값
              </li>
            </ul>

            <h3>의견 보내기 이용 시</h3>
            <ul>
              <li>
                의견 유형과 내용, 사용자가 선택적으로 입력한 답변용
                이메일
              </li>
              <li>
                앱 버전, 현재 화면, 브라우저·기기 정보, 화면 크기,
                언어, 네트워크 상태와 전송 보호를 위한 접속 정보
              </li>
            </ul>
          </section>

          <section aria-labelledby="privacy-not-collected">
            <h2 id="privacy-not-collected">3. 수집하지 않는 정보</h2>
            <p>오늘식탁은 다음 정보에 접근하거나 이를 수집하지 않습니다.</p>
            <ul>
              <li>주민등록번호 등 국가 고유식별정보</li>
              <li>카드번호, 계좌번호 등 금융정보</li>
              <li>기기 주소록과 전화번호 등 연락처 목록</li>
              <li>정밀 위치정보</li>
              <li>기기에 저장된 사진과 음성</li>
            </ul>
            <p>
              Google 프로필 이미지 주소와 의견 답변용 이메일은 해당
              기능에서 사용자가 제공한 경우에만 처리합니다. 결제수단
              정보는 Google Play가 처리하며 오늘식탁은 저장하지
              않습니다.
            </p>
          </section>

          <section aria-labelledby="privacy-purpose">
            <h2 id="privacy-purpose">4. 이용 목적</h2>
            <ul>
              <li>Google 로그인, 세션 유지와 계정 보안</li>
              <li>기기 간 식단·장보기·냉장고·레시피 동기화</li>
              <li>냉장고 재료 기반 AI 메뉴·식단·레시피 추천</li>
              <li>장보기, Planner, 계량도우미 등 앱 기능 제공</li>
              <li>Trial·Premium 이용 권한과 Google Play 구매 확인</li>
              <li>오류 대응, 중복 요청 방지와 서비스 안정성 개선</li>
              <li>사용자가 보낸 의견의 확인과 필요한 경우 답변</li>
            </ul>
          </section>

          <section aria-labelledby="privacy-processors">
            <h2 id="privacy-processors">5. 외부 서비스 이용</h2>
            <p>
              오늘식탁은 기능 제공에 필요한 범위에서 다음 서비스를
              이용합니다. 각 서비스에는 해당 기능 처리에 필요한
              정보만 전달합니다.
            </p>
            <ul>
              <li>Google: 로그인과 계정 확인</li>
              <li>OpenAI: AI 메뉴·식단·레시피 생성</li>
              <li>Vercel: 웹 앱과 서버 API 운영</li>
              <li>Neon Postgres: 계정, 동기화 데이터와 권한 저장</li>
              <li>Google Play: 구독 구매 확인과 복원</li>
              <li>
                운영자 Webhook: 사용자가 의견 보내기를 실행한 경우
                의견 전달
              </li>
            </ul>
            <p>
              법령상 요구되거나 사용자가 동의한 경우를 제외하고,
              개인정보를 광고 판매 목적으로 제공하지 않습니다.
            </p>
          </section>

          <section aria-labelledby="privacy-retention">
            <h2 id="privacy-retention">6. 보관과 삭제</h2>
            <ul>
              <li>
                기기 데이터는 사용자가 앱 데이터 또는 브라우저 저장
                정보를 삭제할 때까지 보관됩니다.
              </li>
              <li>
                계정 동기화 데이터는 계정 삭제를 요청하거나 서비스
                운영 목적이 끝날 때까지 보관됩니다.
              </li>
              <li>
                로그인 세션은 만료·로그아웃 시 무효화되며, 만료된
                세션과 운영 로그는 보안·오류 대응에 필요한 기간 뒤
                삭제됩니다.
              </li>
              <li>
                결제 기록은 구독 확인과 관계 법령상 의무를 이행하는
                데 필요한 기간 보관될 수 있습니다.
              </li>
            </ul>
          </section>

          <section aria-labelledby="privacy-security">
            <h2 id="privacy-security">7. 안전한 처리</h2>
            <p>
              로그인 세션은 Secure·HttpOnly 쿠키로 관리하며 Google
              토큰과 세션 토큰을 LocalStorage에 저장하지 않습니다.
              구매 토큰은 원문 대신 해시값을 저장하고, API 키와 서버
              비밀값은 클라이언트 코드에 포함하지 않습니다.
            </p>
          </section>

          <section aria-labelledby="privacy-rights">
            <h2 id="privacy-rights">8. 사용자의 권리</h2>
            <p>
              사용자는 기기에서 데이터를 수정·삭제하거나 백업할 수
              있습니다. 계정 데이터의 열람·정정·삭제, 계정 삭제와
              개인정보 처리 관련 문의는{' '}
              <a href={OFFICIAL_SUPPORT_MAILTO}>
                {OFFICIAL_SUPPORT_EMAIL}
              </a>
              로 요청할 수 있습니다. 요청자의 계정을 확인한 뒤
              필요한 조치를 안내합니다.
            </p>
          </section>

          <section aria-labelledby="privacy-changes">
            <h2 id="privacy-changes">9. 방침 변경</h2>
            <p>
              처리하는 정보나 이용 목적이 바뀌면 이 페이지의 내용과
              시행일을 갱신하고, 중요한 변경은 앱 또는 서비스 화면을
              통해 알립니다.
            </p>
          </section>

          <section aria-labelledby="privacy-contact">
            <h2 id="privacy-contact">10. 문의</h2>
            <p>
              개인정보 관련 문의:{' '}
              <a href={OFFICIAL_SUPPORT_MAILTO}>
                {OFFICIAL_SUPPORT_EMAIL}
              </a>
            </p>
          </section>
        </article>
      </main>
    </>
  )
}

export default PrivacyPage

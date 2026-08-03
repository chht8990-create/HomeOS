import { ArrowLeft, FileText } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ScreenHeader from '../components/ui/ScreenHeader'
import {
  OFFICIAL_SUPPORT_EMAIL,
  OFFICIAL_SUPPORT_MAILTO,
} from '../config/contact'
import './LegalPage.css'

type TermsPageProps = {
  onBack: () => void
}

function TermsPage({ onBack }: TermsPageProps) {
  return (
    <>
      <ScreenHeader
        title="이용약관"
        description="오늘식탁을 이용할 때 알아둘 내용을 안내합니다."
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
          <FileText size={28} aria-hidden="true" />
          <div>
            <strong>오늘식탁 이용약관</strong>
            <p>시행일 2026년 8월 3일</p>
          </div>
        </Card>

        <article className="legal-page__document">
          <section aria-labelledby="terms-purpose">
            <h2 id="terms-purpose">1. 목적</h2>
            <p>
              이 약관은 오늘식탁이 제공하는 식단, 장보기, 냉장고,
              레시피, AI 추천과 Premium 서비스의 이용 조건을 정하는
              것을 목적으로 합니다.
            </p>
          </section>

          <section aria-labelledby="terms-service">
            <h2 id="terms-service">2. 서비스 내용</h2>
            <ul>
              <li>식단 일정 작성과 기본 식단 제공</li>
              <li>냉장고 재료와 장보기 목록 관리</li>
              <li>레시피, 계량도우미와 조리 정보 제공</li>
              <li>냉장고 재료와 사용자 조건을 활용한 AI 추천</li>
              <li>Google 계정 기반 데이터 동기화</li>
              <li>Trial과 Premium 이용 권한 제공</li>
            </ul>
          </section>

          <section aria-labelledby="terms-account">
            <h2 id="terms-account">3. 계정 사용</h2>
            <p>
              일부 기능은 Google 로그인이 필요합니다. 사용자는 본인
              계정을 사용하고 기기와 Google 계정의 접근 권한을
              안전하게 관리해야 합니다. 계정의 무단 사용이 의심되면
              즉시 로그아웃하고 운영자에게 알려야 합니다.
            </p>
          </section>

          <section aria-labelledby="terms-data">
            <h2 id="terms-data">4. 저장 데이터와 백업</h2>
            <p>
              로그인하지 않은 기본 데이터는 사용자의 기기에
              저장됩니다. 앱 삭제, 브라우저 데이터 삭제 또는 기기
              문제로 로컬 데이터가 사라질 수 있으므로 필요한 경우
              더보기의 백업 기능을 이용해야 합니다. 로그인한 계정의
              데이터는 동기화 정책에 따라 서버 데이터와 병합됩니다.
            </p>
          </section>

          <section aria-labelledby="terms-ai">
            <h2 id="terms-ai">5. AI 추천과 조리 정보</h2>
            <p>
              AI가 만든 메뉴, 재료 수량, 조리시간과 조리 순서는 참고
              정보입니다. AI 결과는 부정확하거나 사용자의 실제
              재료·조리환경과 다를 수 있으므로 사용자가 내용을 확인한
              뒤 이용해야 합니다.
            </p>
            <p>
              식품의 상태, 알레르기, 소비기한, 가열 온도와 위생 상태를
              확인하고 안전하게 조리할 책임은 사용자에게 있습니다.
              생고기, 달걀과 해산물 등은 안전한 상태가 되도록 충분히
              익혀야 합니다.
            </p>
          </section>

          <section aria-labelledby="terms-premium">
            <h2 id="terms-premium">6. Trial과 Premium</h2>
            <ul>
              <li>
                Trial의 기간과 제공 범위는 앱에 표시된 조건을 따르며,
                계정당 한 번만 제공될 수 있습니다.
              </li>
              <li>
                Premium 가격, 결제 주기, 갱신과 취소 조건은 구매 시
                Google Play에 표시된 내용을 따릅니다.
              </li>
              <li>
                구매 복원과 Premium 권한은 Google Play 구매 상태를
                서버에서 확인한 뒤 적용됩니다.
              </li>
              <li>
                결제 취소와 환불은 Google Play 정책과 관계 법령에
                따라 처리됩니다.
              </li>
            </ul>
          </section>

          <section aria-labelledby="terms-rules">
            <h2 id="terms-rules">7. 사용자의 의무</h2>
            <p>사용자는 다음 행위를 해서는 안 됩니다.</p>
            <ul>
              <li>다른 사람의 계정이나 구매 정보를 무단으로 이용하는 행위</li>
              <li>서비스의 정상 운영을 방해하거나 과도한 요청을 보내는 행위</li>
              <li>서비스 또는 타인의 권리를 침해하는 행위</li>
              <li>관련 법령과 Google Play 정책을 위반하는 행위</li>
            </ul>
          </section>

          <section aria-labelledby="terms-changes">
            <h2 id="terms-changes">8. 서비스 변경과 중단</h2>
            <p>
              오늘식탁은 안전성 개선, 법령·정책 변경, 외부 서비스
              장애 또는 운영상 필요한 경우 서비스 일부를 변경하거나
              일시 중단할 수 있습니다. 사용자에게 중요한 영향이 있는
              변경은 가능한 범위에서 앱 또는 서비스 화면으로
              안내합니다.
            </p>
          </section>

          <section aria-labelledby="terms-liability">
            <h2 id="terms-liability">9. 책임 범위</h2>
            <p>
              오늘식탁은 고의 또는 중대한 과실이 없는 한 사용자의
              조리 판단, 기기·네트워크 장애, 외부 서비스의 일시 중단,
              사용자가 백업하지 않은 로컬 데이터 손실에 대해 법령이
              허용하는 범위에서 책임이 제한될 수 있습니다. 이 조항은
              관계 법령에 따른 사용자의 권리를 제한하지 않습니다.
            </p>
          </section>

          <section aria-labelledby="terms-account-end">
            <h2 id="terms-account-end">10. 이용 종료와 계정 삭제</h2>
            <p>
              사용자는 언제든 앱 이용을 중단하고 기기 데이터를 삭제할
              수 있습니다. 계정과 서버 동기화 데이터 삭제는{' '}
              <a href={OFFICIAL_SUPPORT_MAILTO}>
                {OFFICIAL_SUPPORT_EMAIL}
              </a>
              로 요청할 수 있으며, 본인 확인 후 관계 법령에 따라
              처리합니다.
            </p>
          </section>

          <section aria-labelledby="terms-law">
            <h2 id="terms-law">11. 약관 변경과 준거법</h2>
            <p>
              약관이 변경되면 시행일과 변경 내용을 서비스 화면에
              게시합니다. 이 약관과 서비스 이용에는 대한민국 법령을
              적용합니다.
            </p>
          </section>

          <section aria-labelledby="terms-contact">
            <h2 id="terms-contact">12. 문의</h2>
            <p>
              서비스 이용 문의:{' '}
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

export default TermsPage

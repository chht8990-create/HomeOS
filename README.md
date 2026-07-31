# React + TypeScript + Vite

## HomeOS AI 추천 설정

AI 메뉴 추천은 브라우저가 OpenAI를 직접 호출하지 않고
`/api/ai/recipe-recommendation` Vercel Function을 통해
실행됩니다. 브라우저에는 냉장고 재료의 이름·수량·단위만
전송하며, API 키는 서버 환경변수에서만 읽습니다.

로컬에서는 `.env.example`을 참고해 `.env.local`을 만들고
다음 값을 설정한 뒤 `npm run dev`를 실행합니다.

```text
OPENAI_API_KEY=your_server_key
OPENAI_MODEL=gpt-5.6-luna
```

Vercel에서는 프로젝트의 **Settings → Environment
Variables**에 같은 이름으로 설정한 뒤 다시 배포합니다.
`OPENAI_API_KEY`에 `VITE_` 접두사를 붙이면 브라우저 번들에
노출될 수 있으므로 사용하지 않습니다.

키가 없어도 HomeOS의 기존 로컬 추천과 나머지 기능은
정상적으로 동작하며, AI 추천 영역에만 설정 안내가
표시됩니다. 실제 API를 호출하지 않고 로컬 화면을 점검할
때만 `HOMEOS_AI_MOCK=true`를 사용할 수 있으며 production
환경에서는 무시됩니다.

## 의견 수신 설정

`/api/feedback`은 검증을 통과한 의견을 운영자가 관리하는
HTTPS Webhook으로 전달합니다. 새 외부 서비스나 클라이언트
비밀값은 추가하지 않으며, 다음 서버 환경변수가 없으면
피드백 화면은 안전한 전송 실패 안내를 표시합니다.

```text
FEEDBACK_WEBHOOK_URL=https://operator-owned.example/webhook
FEEDBACK_WEBHOOK_TOKEN=
```

토큰은 선택 사항이며 설정한 경우에만 `Authorization:
Bearer` 헤더로 서버에서 전달합니다. 두 값 모두 `VITE_`
접두사를 사용하지 않고 Vercel **Settings → Environment
Variables**에만 설정합니다. 의견 API는 식단, 냉장고,
장보기 목록, LocalStorage 전체를 읽거나 전송하지 않습니다.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

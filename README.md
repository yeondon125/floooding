# floooding

일정 시간마다 자동으로 API를 호출하는 크롬 확장 프로그램. [WXT](https://wxt.dev) + React로 작성되었다.

## 개발

```bash
npm install
npm run dev
```

`npm run dev` 실행 후 Chrome에서 `chrome://extensions` -> 개발자 모드 -> "압축해제된 확장 프로그램 로드"로
`.output/chrome-mv3-dev` 디렉토리를 선택하면 확장 프로그램을 로드할 수 있다.

## 빌드

```bash
npm run build
```

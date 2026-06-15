import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Floooding',
    description: '일정 시간마다 자동으로 API를 호출하는 확장 프로그램',
    permissions: ['alarms', 'storage'],
  },
});

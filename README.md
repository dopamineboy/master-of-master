# 노가다 MASTER

평민 → 마스터 2D 육성 웹 게임. 채집·낚시·채광·장사를 하며 성장하고, 광장 배팅과 전투까지 즐길 수 있습니다.

## 시작하기

### 요구사항

- Node.js 18+

### 설치 및 실행

```bash
npm install
npm start
```

브라우저에서 `http://localhost:3000` 접속

### 포트 변경

```bash
PORT=8080 npm start
```

## 게임 기능

- **캐릭터 생성**: 아이디·비밀번호 (2~12자 한글·영문·숫자), 직업 랜덤 (농부/낚시꾼/광부/장사꾼)
- **채널**: 밭·광장·장터 이동, 직업별 행동 (채집/낚시/채광/장사)
- **에너지**: 행동 시 2 소모, 매일 자정 리셋
- **광장**: 철수 vs 영희 배팅 (30~100G, 2배·6배)
- **전투**: 하루 3회, 먹이사슬·강화석
- **가방·장터**: 아이템 판매·구매·상인조합

## 프로젝트 구조

```
├── public/          # 정적 파일 (HTML, CSS, JS)
├── src/
│   ├── server.js    # HTTP 서버
│   ├── webApi.js    # API 핸들러
│   ├── chatServer.js
│   └── game/        # 게임 로직
├── docs/            # 설계 문서
└── package.json
```

## 기술 스택

- Node.js, Express-style HTTP
- WebSocket (ws)
- Vanilla JS (프론트엔드)

## 라이선스

MIT

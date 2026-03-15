# MongoDB Atlas 연동 가이드

## 1단계: 클러스터 생성 (이미 완료 시 건너뛰기)

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 접속
2. **Sign In** 또는 **Try Free** 클릭
3. **Create Cluster** 선택
   - Provider: **AWS** (권장)
   - Region: **Asia Pacific (Tokyo)** 또는 **Seoul**
   - Cluster Name: `Cluster0` (그대로 두어도 됨)
4. **Create** 클릭

---

## 2단계: 데이터베이스 사용자 만들기

1. 왼쪽 메뉴 **Database Access** → **Add New Database User**
2. 설정:
   - **Authentication Method**: Password
   - **Username**: `gameadmin` (원하는 이름)
   - **Password**: **Autogenerate Secure Password** 클릭 → **Copy** 해서 안전한 곳에 저장
   - (또는 직접 비밀번호 입력: 특수문자 포함 8자 이상)
   - **Database User Privileges**: **Read and write to any database** 선택
3. **Add User** 클릭

---

## 3단계: IP 접근 허용

1. 왼쪽 메뉴 **Network Access** → **Add IP Address**
2. **Allow Access from Anywhere** 클릭  
   → `0.0.0.0/0` 자동 입력 (모든 IP 허용, Render 배포용)
3. **Confirm** 클릭  
   ⚠️ 프로덕션에서는 특정 IP만 허용하는 것이 더 안전합니다.

---

## 4단계: 연결 문자열 복사

1. 왼쪽 메뉴 **Database** → **Connect** 버튼 클릭
2. **Connect your application** 선택
3. **Driver**: Node.js, **Version**: 5.5 or later
4. 아래처럼 나오는 문자열을 **복사**:

```
mongodb+srv://gameadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

5. `<password>` 를 **2단계에서 만든 비밀번호**로 바꿈  
   - 예: 비밀번호가 `Abc123!@#` 이면  
     `mongodb+srv://gameadmin:Abc123!%40%23@cluster0.xxxxx...`  
   - ⚠️ 비밀번호에 `@`, `#`, `%` 등이 있으면 **URL 인코딩** 필요:
     - `@` → `%40`
     - `#` → `%23`
     - `%` → `%25`

6. 연결 문자열 끝에 **데이터베이스 이름** 추가:
```
mongodb+srv://gameadmin:비밀번호@cluster0.xxxxx.mongodb.net/growth_game?retryWrites=true&w=majority
```
   → `?` 앞에 `/growth_game` 추가

---

## 5단계: 환경 변수 설정

### 로컬 개발
프로젝트 폴더에 `.env` 파일 생성:

```
MONGODB_URI=mongodb+srv://gameadmin:비밀번호@cluster0.xxxxx.mongodb.net/growth_game?retryWrites=true&w=majority
```

### Render 배포
1. [Render Dashboard](https://dashboard.render.com) 접속
2. 해당 서비스 선택 → **Environment**
3. **Add Environment Variable**
   - Key: `MONGODB_URI`
   - Value: (4단계에서 만든 연결 문자열 붙여넣기)
4. **Save Changes** → 서비스가 자동으로 재배포됨

---

## 6단계: 연결 확인

서버 실행 시 콘솔에 다음이 나오면 성공:

```
MongoDB 연결됨: growth_game
Server running at http://localhost:3000
```

`MongoDB 연결 실패` 로그가 보이면:
- 비밀번호에 특수문자가 있다면 URL 인코딩 확인
- Network Access에서 `0.0.0.0/0` 허용 확인
- 연결 문자열에 `/growth_game` 포함 여부 확인

---

## 데이터 확인 (선택)

1. MongoDB Atlas **Database** → **Browse Collections**
2. `growth_game` 데이터베이스 → `users` 컬렉션 클릭
3. 계정 생성/플레이 후 여기서 저장된 유저 데이터 확인 가능

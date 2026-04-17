# 가계부 웹앱 (money)

GitHub: leejuhyun1211/money
배포: Vercel (money-three-iota.vercel.app)
구조: index.html 단일 파일 (vanilla JS), Supabase 백엔드 전환 중

---

## Supabase 프로젝트 격리 규칙

### 사용 가능 프로젝트
- project_id: `vvpeigyuzfjkwqdjxafr`
- 이름: money (이 가계부 앱)
- URL: https://vvpeigyuzfjkwqdjxafr.supabase.co

### 절대 금지 프로젝트 (Bliss - 별개 운영 앱)
- project_id: `dpftlrsuqxqqeouwbfjd`
- 이름: Bliss (하우스왁싱 예약 관리)
- 이 project_id가 포함된 모든 MCP 호출 즉시 중단하고 사용자에게 보고

### MCP 호출 규칙
- 모든 Supabase MCP 호출 시 project_id 파라미터 명시 필수
- `list_projects` 호출 금지 (자동 선택으로 잘못된 프로젝트 접근 위험)
- 예시:
  - OK: `list_tables(project_id="vvpeigyuzfjkwqdjxafr", ...)`
  - NG: `list_projects()`
  - NG: `list_tables(project_id="dpftlrsuqxqqeouwbfjd", ...)`

---

## 원본 데이터 ID 보존 규칙

백업 JSON 원본: `/home/teraport/money/money-backup.json`

### ID 포맷
모든 ID는 JS `Date.now()` 기반 타임스탬프 (13자리 숫자)
- 거래 id: 숫자 (예: 1776321718099)
- 계좌 acctId: 문자열 (예: "1776304724982")
- transferId: 이체 쌍 연결용 (거래 id 참조)
- 고정지출/자산 id도 동일 패턴

### 금지 사항
- BIGSERIAL, SERIAL, GENERATED AS IDENTITY 등 자동증가 PK 사용 금지
- 원본 ID 무시하고 새 ID 재발급 금지

### 이유
- transferId로 이체 쌍 연결됨 → 원본 ID 바뀌면 연결 깨짐
- 거래 acctId → 계좌 id 참조 → 원본 유지 필요
- 고정지출 상태 맵(fx_status)이 고정지출 id 참조 → 원본 유지

### 권장 방식
- 모든 id 컬럼: BIGINT (자동증가 X)
- 타임스탬프 숫자를 그대로 primary key로 사용

---

## 실행 규칙

- 각 Step 끝나면 반드시 사용자에게 보고 후 다음 단계 승인 받기
- 파괴적 작업 사전 고지:
  - rm, 파일 삭제
  - git checkout, git reset, git rebase
  - DROP TABLE, DELETE, TRUNCATE
  - localStorage.clear, localStorage.removeItem
- Bliss project_id 발견 즉시 중단하고 보고

---

## MCP 격리 테스트 결과 (2026-04-17)

Step 0-3 격리 테스트 완료. 모든 항목 통과.

### 테스트 1: 프로젝트 제한
- ✅ `list_tables` 호출 성공 (money 프로젝트로 응답)
- 도구 스키마에 `project_id` 파라미터 **존재하지 않음** → `--project-ref`로 단일 프로젝트(vvpeigyuzfjkwqdjxafr)에 하드바인딩

### 테스트 2: Bliss 차단
- ✅ **구조적으로 호출 불가능**
- 클라이언트가 다른 project_id를 지정할 방법 자체가 없음 (도구 레이어 차단)

### 테스트 3: read-only 확인
- ✅ `SELECT NOW()` 통과
- DB 사용자: `supabase_read_only_user` → INSERT/UPDATE/DELETE/CREATE는 PostgreSQL 권한 레벨에서 거부
- 실제 쓰기 시도는 하지 않음 (논리적 검증만)

### 격리 메커니즘 (이중 방어)
1. **도구 레이어**: `project_id` 파라미터 제거 → 다른 프로젝트 접근 불가
2. **DB 권한 레이어**: `supabase_read_only_user` → 쓰기 권한 없음

### 이전 DB 상태 정리 (2026-04-17)
- money DB에 과거 시도 흔적 발견: 
  budget_items(15), goals(6), entries(15), categories(57) — 모두 UUID 스키마, 현재 앱과 무관
- 사용자가 Supabase 대시보드에서 5개 테이블 전부 삭제 (DROP TABLE)
- 현재 public schema 완전히 비어있는 상태 → 깨끗한 마이그레이션 가능

### 진행 방침 확정
- 방법 A 채택: 기존 DB 초기화 후 네 앱 스키마(gb_ prefix, 타임스탬프 ID)로 재구성
- 백업 JSON의 7개 거래 + 기타 데이터가 마이그레이션 대상

---

## Known Issues

- 데모 모드와 실계정 간 localStorage 공유 (gb_txs, gb_accounts 등)
  - 증상: 데모 체험 후 실계정 로그인 시 샘플 데이터가 섞여 보임
  - 원인: localStorage가 단일 키스페이스, user_id 격리 없음
  - 해소 예정: Step 4-4 (Supabase 기반 유저별 격리)

-- ============================================
-- 가계부 앱 (money) Supabase 스키마 v2
-- 실행 환경: Supabase SQL Editor (대시보드)
-- 주의: 빈 public schema 가정. 기존 테이블이 있으면 먼저 DROP 필요.
-- ============================================

-- ============================================
-- 0. 공통 트리거 함수: updated_at 자동 갱신
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. gb_accounts (통장/카드)
--    FK 없음(auth.users 제외) → 가장 먼저 생성
-- ============================================
CREATE TABLE gb_accounts (
  id          BIGINT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  num         TEXT,
  actype      TEXT NOT NULL CHECK (actype IN ('bank','card')),
  bank        TEXT,
  init        BIGINT NOT NULL DEFAULT 0,
  include     BOOLEAN NOT NULL DEFAULT TRUE,
  payday      INT NOT NULL DEFAULT 0 CHECK (payday BETWEEN 0 AND 31),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_gb_accounts_updated
  BEFORE UPDATE ON gb_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 2. gb_fixeds (고정 지출)
--    FK: gb_accounts (SET NULL)
-- ============================================
CREATE TABLE gb_fixeds (
  id          BIGINT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  amount      BIGINT NOT NULL,
  day         INT NOT NULL CHECK (day BETWEEN 1 AND 31),
  cat         TEXT NOT NULL,
  acct_id     BIGINT REFERENCES gb_accounts(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_gb_fixeds_updated
  BEFORE UPDATE ON gb_fixeds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 3. gb_transfers (이체)
--    FK: gb_accounts (RESTRICT) — 이체 쌍 보호
-- ============================================
CREATE TABLE gb_transfers (
  id          BIGINT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_id     BIGINT NOT NULL REFERENCES gb_accounts(id) ON DELETE RESTRICT,
  to_id       BIGINT NOT NULL REFERENCES gb_accounts(id) ON DELETE RESTRICT,
  amt         BIGINT NOT NULL,
  date        DATE NOT NULL,
  memo        TEXT,
  purpose     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. gb_transactions (거래 내역)
--    FK: gb_accounts (SET NULL), gb_fixeds (SET NULL), gb_transfers (SET NULL)
-- ============================================
CREATE TABLE gb_transactions (
  id            BIGINT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  amount        BIGINT NOT NULL CHECK (amount >= 0),
  type          TEXT NOT NULL CHECK (type IN ('income','expense')),
  cat           TEXT,
  date          DATE NOT NULL,
  acct_id       BIGINT REFERENCES gb_accounts(id) ON DELETE SET NULL,
  transfer_id   BIGINT REFERENCES gb_transfers(id) ON DELETE SET NULL,
  auto_from_fx  BIGINT REFERENCES gb_fixeds(id) ON DELETE SET NULL,
  fx_ym         TEXT,
  tags          TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_gb_transactions_updated
  BEFORE UPDATE ON gb_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 5. gb_assets (자산/부채)
-- ============================================
CREATE TABLE gb_assets (
  id          BIGINT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  amount      BIGINT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('asset','debt')),
  cat         TEXT,
  start       DATE,
  "end"       DATE,
  monthly     BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_gb_assets_updated
  BEFORE UPDATE ON gb_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 6. gb_categories (카테고리: tx/asset/fixed 통합)
--    원본에 id 없음 → BIGSERIAL 허용
-- ============================================
CREATE TABLE gb_categories (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('tx','asset','fixed')),
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, name)
);

-- ============================================
-- 7. gb_budgets (카테고리별 예산)
-- ============================================
CREATE TABLE gb_budgets (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cat         TEXT NOT NULL,
  amount      BIGINT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cat)
);

CREATE TRIGGER trg_gb_budgets_updated
  BEFORE UPDATE ON gb_budgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 8. gb_user_config (사용자 설정 통합 JSONB)
-- ============================================
CREATE TABLE gb_user_config (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings    JSONB NOT NULL DEFAULT '{"monthStartDay":1,"defaultAcctId":null,"cardColors":{}}'::jsonb,
  fx_status   JSONB NOT NULL DEFAULT '{}'::jsonb,
  cat_meta    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_gb_user_config_updated
  BEFORE UPDATE ON gb_user_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- RLS 활성화
-- ============================================
ALTER TABLE gb_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gb_fixeds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gb_transfers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gb_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gb_assets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gb_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gb_budgets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gb_user_config  ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS 정책: 본인 데이터만 CRUD
-- ============================================
CREATE POLICY "Users CRUD own data" ON gb_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own data" ON gb_fixeds
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own data" ON gb_transfers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own data" ON gb_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own data" ON gb_assets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own data" ON gb_categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own data" ON gb_budgets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users CRUD own data" ON gb_user_config
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 인덱스
-- ============================================
-- gb_transactions
CREATE INDEX idx_gb_tx_user_date     ON gb_transactions(user_id, date DESC);
CREATE INDEX idx_gb_tx_user_acct     ON gb_transactions(user_id, acct_id);
CREATE INDEX idx_gb_tx_user_transfer ON gb_transactions(user_id, transfer_id);
CREATE INDEX idx_gb_tx_user_fx       ON gb_transactions(user_id, auto_from_fx)
  WHERE auto_from_fx IS NOT NULL;

-- gb_accounts
CREATE INDEX idx_gb_accounts_user_include ON gb_accounts(user_id, include);

-- gb_transfers
CREATE INDEX idx_gb_transfers_user_date ON gb_transfers(user_id, date);
CREATE INDEX idx_gb_transfers_from      ON gb_transfers(from_id);
CREATE INDEX idx_gb_transfers_to        ON gb_transfers(to_id);

-- gb_fixeds
CREATE INDEX idx_gb_fixeds_user_day ON gb_fixeds(user_id, day);

-- gb_assets (만기 임박 쿼리용)
CREATE INDEX idx_gb_assets_user_end ON gb_assets(user_id, "end");

-- gb_categories
CREATE INDEX idx_gb_categories_user_kind ON gb_categories(user_id, kind);

-- gb_budgets
CREATE INDEX idx_gb_budgets_user ON gb_budgets(user_id);

-- ============================================
-- v1.old 대비 주요 차이점 (요약)
-- ============================================
-- 1) ID/금액 INTEGER → BIGINT, date TEXT → DATE, acct_id TEXT → BIGINT FK
-- 2) FK 명시 + 정책 추가: accounts(SET NULL), transfers(RESTRICT), fixeds/transfers(SET NULL)
-- 3) 신규 테이블: gb_categories(kind 통합), gb_budgets(행 단위) — v1.old는 user_config JSONB 통합
-- 4) created_at/updated_at + set_updated_at() 트리거 전 테이블 적용
-- 5) CHECK 제약 강화(amount>=0, payday 0~31, kind/type/actype enum) + 부분 인덱스(auto_from_fx)

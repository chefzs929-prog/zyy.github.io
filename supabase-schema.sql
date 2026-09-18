-- ══════════════════════════════════════════════════════════════
--  张喻嫣个人主页 · Supabase 建库脚本
--  用法：Supabase 控制台左侧 Database → SQL Editor → New query
--        把本文件全文粘贴进去，点 Run（绿色按钮）。
--        第一次运行会把第 1、2 部分一起建好；
--        最后那一行「设置查看口令」需要你先改成自己的口令再跑。
--  可重复运行：表/策略用 IF NOT EXISTS，函数用 CREATE OR REPLACE。
-- ══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────
-- 第 1 部分：两张表 + 权限（只允许写入，禁止读取/修改/删除）
-- ─────────────────────────────────────────────

-- 反馈表：访客填写的建议
CREATE TABLE IF NOT EXISTS feedbacks (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL CHECK (length(name) <= 40 AND length(btrim(name)) > 0),
  rating     INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT NOT NULL CHECK (length(comment) <= 1000),
  profession TEXT,
  device     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 分享推荐表：访客安利的音乐 / 影视
CREATE TABLE IF NOT EXISTS recos (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (length(kind) <= 20 AND length(btrim(kind)) > 0),
  content    TEXT NOT NULL CHECK (length(content) <= 500 AND length(btrim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 开启行级安全：只给 INSERT，不给 SELECT / UPDATE / DELETE
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.feedbacks TO anon, authenticated;
DROP POLICY IF EXISTS feedbacks_insert_only ON feedbacks;
CREATE POLICY feedbacks_insert_only ON feedbacks
  FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE recos ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.recos TO anon, authenticated;
DROP POLICY IF EXISTS recos_insert_only ON recos;
CREATE POLICY recos_insert_only ON recos
  FOR INSERT TO anon, authenticated WITH CHECK (true);

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 注意：这里故意没有给 anon 任何 SELECT 权限。
-- 所以即使有人拿到网页里那串公开 key，也只能往表里写字，
-- 读不出任何一条已有内容。读取必须走第 2 部分的口令函数。


-- ─────────────────────────────────────────────
-- 第 2 部分：口令表 + 两个读取函数
-- ─────────────────────────────────────────────

-- 口令表：开启 RLS 且不设任何策略 → 客户端完全不可读
CREATE TABLE IF NOT EXISTS admin_secret (k TEXT PRIMARY KEY, pass_hash TEXT NOT NULL);
ALTER TABLE admin_secret ENABLE ROW LEVEL SECURITY;

-- 读取函数：SECURITY DEFINER 绕过 RLS，口令不对直接抛 BAD_PASS
CREATE OR REPLACE FUNCTION read_feedbacks(pass TEXT)
RETURNS SETOF feedbacks LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_secret
                 WHERE k='owner' AND pass_hash = md5('wbfb::' || COALESCE(pass,'')))
  THEN RAISE EXCEPTION 'BAD_PASS' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT * FROM feedbacks ORDER BY created_at DESC;
END; $fn$;

CREATE OR REPLACE FUNCTION read_recos(pass TEXT)
RETURNS SETOF recos LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admin_secret
                 WHERE k='owner' AND pass_hash = md5('wbfb::' || COALESCE(pass,'')))
  THEN RAISE EXCEPTION 'BAD_PASS' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT * FROM recos ORDER BY created_at DESC;
END; $fn$;

GRANT EXECUTE ON FUNCTION read_feedbacks(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION read_recos(TEXT) TO anon, authenticated;


-- ─────────────────────────────────────────────
-- 第 3 部分：设置你的查看口令
-- ⚠️ 把下面单引号里的「换成你的口令」改成你自己要用的口令，再单独运行这一行。
--    口令不要写进任何网页代码里 —— 它只以 md5 形式存在这个数据库里。
-- ─────────────────────────────────────────────

INSERT INTO admin_secret (k, pass_hash)
VALUES ('owner', md5('wbfb::' || '换成你的口令'))
ON CONFLICT (k) DO UPDATE SET pass_hash = EXCLUDED.pass_hash;


-- ─────────────────────────────────────────────
-- 验收（可选，跑完上面之后执行，应分别返回空数组和 0）
-- ─────────────────────────────────────────────
-- SELECT count(*) FROM feedbacks;   -- 应为 0
-- SELECT count(*) FROM recos;       -- 应为 0

-- 站点端最终验收：打开 https://你的地址/?admin=1 ，输入刚才那个口令，
-- 应该能看到「暂时还没有反馈」，说明读取链路通了。

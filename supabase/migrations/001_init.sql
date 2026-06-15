-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  github_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup (GitHub OAuth fills meta_data)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, avatar_url, github_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_name', 'user_' || LEFT(NEW.id::TEXT, 8)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'html_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. SNIPPETS
-- ============================================================

CREATE TABLE snippets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL CHECK (LENGTH(title) BETWEEN 3 AND 100),
  description     TEXT        CHECK (LENGTH(description) <= 500),
  code            TEXT        NOT NULL CHECK (LENGTH(code) <= 50000),
  language        TEXT        NOT NULL DEFAULT 'typescript',
  is_public       BOOLEAN     NOT NULL DEFAULT TRUE,
  storage_key     TEXT,
  views_count     INTEGER     NOT NULL DEFAULT 0,
  likes_count     INTEGER     NOT NULL DEFAULT 0,
  ai_explanation  TEXT,
  ai_explained_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snippets_user_id    ON snippets(user_id);
CREATE INDEX idx_snippets_language   ON snippets(language)   WHERE is_public = TRUE;
CREATE INDEX idx_snippets_created_at ON snippets(created_at DESC) WHERE is_public = TRUE;

-- Auto-update updated_at
CREATE EXTENSION IF NOT EXISTS moddatetime;

CREATE TRIGGER snippets_updated_at
  BEFORE UPDATE ON snippets
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- 3. LIKES
-- ============================================================

CREATE TABLE likes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snippet_id UUID        NOT NULL REFERENCES snippets(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snippet_id)
);

CREATE INDEX idx_likes_snippet_id ON likes(snippet_id);

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE snippets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes     ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_all  ON profiles FOR SELECT USING (TRUE);
CREATE POLICY profiles_update_own  ON profiles FOR UPDATE USING (auth.uid() = id);

-- snippets
CREATE POLICY snippets_select_public ON snippets FOR SELECT
  USING (is_public = TRUE OR auth.uid() = user_id);

CREATE POLICY snippets_insert_own ON snippets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY snippets_update_own ON snippets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY snippets_delete_own ON snippets FOR DELETE
  USING (auth.uid() = user_id);

-- likes
CREATE POLICY likes_select_all  ON likes FOR SELECT USING (TRUE);
CREATE POLICY likes_insert_own  ON likes FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY likes_delete_own  ON likes FOR DELETE  USING (auth.uid() = user_id);

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Increment views bypassing RLS (SECURITY DEFINER runs as table owner)
CREATE OR REPLACE FUNCTION increment_views(snippet_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE snippets SET views_count = views_count + 1 WHERE id = snippet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. REALTIME — full row data on DELETE events
-- ============================================================

ALTER TABLE likes REPLICA IDENTITY FULL;

-- Fix handle_new_user trigger:
-- 1. Check both 'preferred_username' and 'user_name' (GitHub OAuth uses both)
-- 2. Add ON CONFLICT (id) DO UPDATE so retries don't fail
-- 3. Generate unique username if there's a collision on the username field

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _username TEXT;
  _suffix   INT := 0;
  _candidate TEXT;
BEGIN
  _username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'preferred_username', ''),
    NULLIF(NEW.raw_user_meta_data->>'user_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    'user_' || REPLACE(NEW.id::TEXT, '-', '')
  );

  -- Ensure username uniqueness by appending a numeric suffix when needed
  _candidate := _username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = _candidate) LOOP
    _suffix := _suffix + 1;
    _candidate := _username || _suffix::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, username, avatar_url, github_url)
  VALUES (
    NEW.id,
    _candidate,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'html_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    username   = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    github_url = EXCLUDED.github_url;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

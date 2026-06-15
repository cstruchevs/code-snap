-- Grant Data API access to anon and authenticated roles
GRANT SELECT ON profiles TO anon, authenticated;
GRANT SELECT ON snippets TO anon, authenticated;
GRANT SELECT ON likes    TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON snippets TO authenticated;
GRANT INSERT, DELETE          ON likes    TO authenticated;
GRANT UPDATE                  ON profiles TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION increment_views(UUID) TO anon, authenticated;

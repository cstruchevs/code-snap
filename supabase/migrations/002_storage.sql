-- ============================================================
-- STORAGE: private bucket for large code files (> 50kb)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'code-files',
  'code-files',
  FALSE,
  102400,
  ARRAY['text/plain', 'application/json']
);

-- Only the file owner can upload (file stored under {user_id}/filename)
CREATE POLICY "Users can upload their own code files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'code-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Owner can read their own files
CREATE POLICY "Users can read their own code files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'code-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Anyone can read files belonging to public snippets
CREATE POLICY "Public snippet files are readable"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'code-files' AND
  EXISTS (
    SELECT 1 FROM snippets
    WHERE snippets.storage_key = storage.objects.name
      AND snippets.is_public = TRUE
  )
);

-- Owner can delete their own files
CREATE POLICY "Users can delete their own code files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'code-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

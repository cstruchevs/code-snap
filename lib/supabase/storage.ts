import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/lib/database.types';

export async function uploadCodeFile(
  supabase: SupabaseClient<Database>,
  userId: string,
  code: string
): Promise<string> {
  const fileName = `${userId}/${Date.now()}.txt`;

  const { error } = await supabase.storage
    .from('code-files')
    .upload(fileName, new Blob([code], { type: 'text/plain' }), {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  return fileName;
}

export async function downloadCodeFile(
  supabase: SupabaseClient<Database>,
  storageKey: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('code-files')
    .download(storageKey);

  if (error || !data) throw new Error(`Download failed: ${error?.message}`);

  return await data.text();
}

export async function getSignedCodeUrl(
  supabase: SupabaseClient<Database>,
  storageKey: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('code-files')
    .createSignedUrl(storageKey, 3600);

  if (error || !data) throw new Error(`Signed URL failed: ${error?.message}`);

  return data.signedUrl;
}

export async function deleteCodeFile(
  supabase: SupabaseClient<Database>,
  storageKey: string
): Promise<void> {
  const { error } = await supabase.storage
    .from('code-files')
    .remove([storageKey]);

  if (error) throw new Error(`Delete failed: ${error.message}`);
}

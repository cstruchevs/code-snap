'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { LanguageSelect } from '@/components/LanguageSelect';
import { type SupportedLanguage } from '@/lib/shiki';

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<SupportedLanguage>('typescript');
  const [isPublic, setIsPublic] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = trpc.snippet.create.useMutation({
    onSuccess: (snippet) => router.push(`/s/${snippet.id}`),
    onError: (err) => setErrors({ form: err.message }),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (title.trim().length < 3) e.title = 'Title must be at least 3 characters';
    if (code.trim().length === 0) e.code = 'Code cannot be empty';
    if (code.length > 50_000) e.code = `Code too long (${code.length}/50000)`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    create.mutate({ title, description: description || undefined, code, language, isPublic });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCode(ev.target?.result as string ?? '');
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">New snippet</h1>
        <p className="mt-1 text-sm text-slate-500">Share your code with the world</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Debounce function in TypeScript"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
          {errors.title && <p className="mt-1.5 text-xs text-red-500">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Description <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this snippet do?"
            maxLength={500}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>

        {/* Language + Visibility */}
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Language</label>
            <LanguageSelect value={language} onChange={setLanguage} />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${isPublic ? 'bg-violet-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm text-slate-700">Public</span>
          </div>
        </div>

        {/* Code */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              Code <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${code.length > 45_000 ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                {code.length.toLocaleString()} / 50,000
              </span>
              <label className="cursor-pointer rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                ↑ Upload file
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.ts,.tsx,.js,.jsx,.py,.rs,.go,.sql,.sh,.json,.css,.html,.md"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0d1117] shadow-inner">
            <div className="flex items-center gap-1.5 border-b border-slate-800 px-4 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-slate-500">{language}</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here..."
              rows={16}
              className="w-full bg-transparent px-4 py-3 font-mono text-sm text-slate-100 placeholder-slate-600 focus:outline-none resize-none"
              spellCheck={false}
            />
          </div>
          {errors.code && <p className="mt-1.5 text-xs text-red-500">{errors.code}</p>}
        </div>

        {errors.form && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.form}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-60 transition-colors"
          >
            {create.isPending ? 'Creating...' : 'Create snippet →'}
          </button>
        </div>
      </form>
    </div>
  );
}

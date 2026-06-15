import Link from 'next/link';
import { AuthButton } from './AuthButton';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-sm text-white">
              {'</>'}
            </span>
            CodeSnap
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Browse
            </Link>
            <Link
              href="/create"
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              New snippet
            </Link>
          </nav>
        </div>
        <AuthButton />
      </div>
    </header>
  );
}

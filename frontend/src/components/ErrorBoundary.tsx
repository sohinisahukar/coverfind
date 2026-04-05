import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Surfaces render errors instead of a blank root (common when an uncaught throw happens in a child).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Careculator render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-slate-100 p-6 text-slate-900 dark:bg-[#0b1014] dark:text-slate-100">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="max-w-md text-center text-sm text-slate-600 dark:text-slate-400">
            The app hit an unexpected error. Open the browser developer console (F12) for details, or reload
            the page.
          </p>
          <pre className="max-w-full overflow-auto rounded-lg border border-slate-200 bg-white/80 p-3 text-left text-xs dark:border-slate-700 dark:bg-slate-900/80">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

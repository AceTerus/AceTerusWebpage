import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
          <div className="border-[3px] border-[#0F172A] rounded-[28px] shadow-[4px_4px_0_0_#0F172A] bg-white p-10 max-w-md w-full text-center">
            <p className="font-['Baloo_2'] font-extrabold text-2xl text-[#0F172A] mb-2">Something went wrong</p>
            <p className="text-slate-500 text-sm mb-6">An unexpected error occurred on this page.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="inline-flex items-center gap-2 font-extrabold font-['Baloo_2'] border-[3px] border-[#0F172A] rounded-full px-6 py-3 shadow-[4px_4px_0_0_#0F172A] bg-[#3BD6F5] hover:-translate-y-1 hover:shadow-[6px_7px_0_0_#0F172A] active:translate-y-0.5 transition-all"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

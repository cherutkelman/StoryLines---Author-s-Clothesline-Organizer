import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let displayMessage = "משהו השתבש. אנא נסה לרענן את הדף.";
      
      try {
        // Check if it's a Firestore error JSON
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            if (parsed.error.includes("insufficient permissions")) {
              displayMessage = "אין לך הרשאות מתאימות לביצוע פעולה זו. וודא שאתה מחובר לחשבון הנכון.";
            } else if (parsed.error.includes("offline")) {
              displayMessage = "נראה שאתה לא מחובר לאינטרנט. בדוק את החיבור שלך.";
            }
          }
        }
      } catch (e) {
        // Not a JSON error, use default
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4 text-right" dir="rtl">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100">
            <h2 className="text-2xl font-bold text-red-600 mb-4">אופס! שגיאה</h2>
            <p className="text-slate-600 mb-6">{displayMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
            >
              רענן דף
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-6 p-4 bg-slate-100 rounded-lg text-[10px] overflow-auto text-left" dir="ltr">
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

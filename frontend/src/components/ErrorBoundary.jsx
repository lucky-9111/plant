import { Component } from "react";

// Must be a class component -- componentDidCatch/getDerivedStateFromError
// have no function-component equivalent. Catches render-phase crashes only;
// it does NOT catch errors inside async handlers or event callbacks (those
// are already handled locally by each page's own try/catch + error state,
// which stays in place and is complementary to this, not replaced by it).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // No backend request happened for a render crash, so there's no
    // request_id to attach -- best-effort console log only. This must never
    // itself throw.
    console.error(`[${this.props.moduleName}] render error:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-error" role="alert" style={{ margin: 16 }}>
          <strong>{this.props.moduleName} is temporarily unavailable.</strong>
          <p style={{ margin: "6px 0 10px" }}>
            {this.props.friendlyMessage ||
              "Something went wrong loading this section. The rest of the site is unaffected."}
          </p>
          <button
            type="button"
            className="btn btn-outline dark"
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

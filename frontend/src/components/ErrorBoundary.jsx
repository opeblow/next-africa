import { Component } from "react";
import { reportError } from "../lib/monitoring.js";

/** Catches render-time errors so a single screen fault can't blank the app. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack });
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-boundary" role="alert">
        <h1>Something went wrong.</h1>
        <p>NEXT Africa hit an unexpected problem. Your data is safe.</p>
        <button className="primary" onClick={this.handleReload}>
          Reload
        </button>
      </div>
    );
  }
}

import { Component, type ReactNode } from "react";

export default class QueryBoundary extends Component<
  { children: ReactNode; message: string; retry: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div role="alert" className="p-4">
          <p>{this.props.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ failed: false })}
          >
            {this.props.retry}
          </button>
        </div>
      );
    return this.props.children;
  }
}

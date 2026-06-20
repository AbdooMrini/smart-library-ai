import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("UI crash:", error, info); }
  render() {
    if (this.state.error) return <div className="container-page py-20"><div className="card p-10 text-center"><h2 className="text-xl font-bold">Cette page a rencontré une erreur.</h2><p className="mt-3 text-sm text-neutral-500">{this.state.error.message}</p><button onClick={() => this.setState({ error: null })} className="btn-dark mt-6">Réessayer</button></div></div>;
    return this.props.children;
  }
}

/**
 * Take the floating control down when the vendored UI cannot render.
 *
 * The only caller is the control itself: if the official component changed
 * shape, the plugin should lose its button, not the page its overlay.
 */
import { Component } from 'react'

interface BoundaryProps {
  readonly children?: unknown
  readonly onError: (error: unknown) => void
}

interface BoundaryState {
  readonly failed: boolean
}

export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: unknown): void {
    this.props.onError(error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

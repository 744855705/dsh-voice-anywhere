/** The two React exports the error boundary touches. */
export class Component {
  constructor(props) {
    this.props = props
    this.state = {}
  }

  setState(next) {
    this.state = typeof next === 'function' ? next(this.state) : next
  }
}

export function createElement() {
  return null
}

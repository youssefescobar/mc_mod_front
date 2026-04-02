import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      message: '',
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary caught:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-background p-6">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6">
            <h1 className="text-xl font-bold text-card-foreground">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The page crashed while rendering. The issue is logged in console.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{this.state.message}</p>
            <Button className="mt-4" onClick={this.handleReload}>
              Reload page
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

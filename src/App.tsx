import { AppRouter } from '@/app/router'
import { AppErrorBoundary } from '@/app/app-error-boundary'

function App() {
  return (
    <AppErrorBoundary>
      <AppRouter />
    </AppErrorBoundary>
  )
}

export default App

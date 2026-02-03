import { Dashboard } from './components/Dashboard'
import { AppProvider } from './contexts/AppContext'

function App() {
  return (
    <AppProvider>
      <Dashboard />
    </AppProvider>
  )
}

export default App

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import WorkoutsPage from './pages/WorkoutsPage'
import WorkoutDetailPage from './pages/WorkoutDetailPage'
import LogWorkoutPage from './pages/LogWorkoutPage'
import PRPage from './pages/PRPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ComparePage from './pages/ComparePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
        <Route path="/workouts" element={<ProtectedRoute><Layout><WorkoutsPage /></Layout></ProtectedRoute>} />
        <Route path="/workouts/:id" element={<ProtectedRoute><Layout><WorkoutDetailPage /></Layout></ProtectedRoute>} />
        <Route path="/log" element={<ProtectedRoute><Layout><LogWorkoutPage /></Layout></ProtectedRoute>} />
        <Route path="/prs" element={<ProtectedRoute><Layout><PRPage /></Layout></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Layout><AnalyticsPage /></Layout></ProtectedRoute>} />
        <Route path="/compare" element={<ProtectedRoute><Layout><ComparePage /></Layout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

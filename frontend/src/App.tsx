import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import WorkoutsPage from './pages/WorkoutsPage'
import WorkoutDetailPage from './pages/WorkoutDetailPage'
import LogWorkoutPage from './pages/LogWorkoutPage'
import PRPage from './pages/PRPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ComparePage from './pages/ComparePage'
import ExerciseLibraryPage from './pages/ExerciseLibraryPage'
import MeasurementsPage from './pages/MeasurementsPage'
import CardioPage from './pages/CardioPage'
import LogCardioPage from './pages/LogCardioPage'
import CardioDetailPage from './pages/CardioDetailPage'
import SettingsPage from './pages/SettingsPage'
import TemplatesPage from './pages/TemplatesPage'
import TemplateFormPage from './pages/TemplateFormPage'
import GuidedWorkoutPage from './pages/GuidedWorkoutPage'

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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
        <Route path="/workouts" element={<ProtectedRoute><Layout><WorkoutsPage /></Layout></ProtectedRoute>} />
        <Route path="/workouts/:id" element={<ProtectedRoute><Layout><WorkoutDetailPage /></Layout></ProtectedRoute>} />
        <Route path="/log" element={<ProtectedRoute><Layout><LogWorkoutPage /></Layout></ProtectedRoute>} />
        <Route path="/prs" element={<ProtectedRoute><Layout><PRPage /></Layout></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Layout><AnalyticsPage /></Layout></ProtectedRoute>} />
        <Route path="/compare" element={<ProtectedRoute><Layout><ComparePage /></Layout></ProtectedRoute>} />
        <Route path="/library" element={<ProtectedRoute><Layout><ExerciseLibraryPage /></Layout></ProtectedRoute>} />
        <Route path="/measurements" element={<ProtectedRoute><Layout><MeasurementsPage /></Layout></ProtectedRoute>} />
        <Route path="/cardio" element={<ProtectedRoute><Layout><CardioPage /></Layout></ProtectedRoute>} />
        <Route path="/cardio/log" element={<ProtectedRoute><Layout><LogCardioPage /></Layout></ProtectedRoute>} />
        <Route path="/cardio/:id" element={<ProtectedRoute><Layout><CardioDetailPage /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><Layout><TemplatesPage /></Layout></ProtectedRoute>} />
        <Route path="/templates/new" element={<ProtectedRoute><Layout><TemplateFormPage /></Layout></ProtectedRoute>} />
        <Route path="/templates/:id" element={<ProtectedRoute><Layout><TemplateFormPage /></Layout></ProtectedRoute>} />
        <Route path="/workout/guided/:templateId" element={<ProtectedRoute><Layout><GuidedWorkoutPage /></Layout></ProtectedRoute>} />
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

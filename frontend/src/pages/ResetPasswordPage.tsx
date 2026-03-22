import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { resetPassword } from '../api/auth'
import { input, btnPrimary } from '../styles/tokens'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(detail || 'Invalid or expired reset link. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <h1 className="text-2xl font-black text-slate-100 tracking-tight mb-6 text-center">
          GymTracker
        </h1>

        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
          {!token ? (
            <div className="text-center">
              <p className="text-red-400 text-sm mb-4">Invalid reset link.</p>
              <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 text-sm">
                Request a new reset link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="text-3xl mb-3">✅</div>
              <h2 className="text-slate-100 font-semibold mb-2">Password updated!</h2>
              <p className="text-slate-400 text-sm mb-4">You can now log in with your new password.</p>
              <Link to="/login" className={`${btnPrimary} inline-block px-6 py-2.5`}>
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-slate-100 font-semibold mb-4">Set a new password</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    New Password
                  </label>
                  <input
                    className={input}
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                    Confirm Password
                  </label>
                  <input
                    className={input}
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    required
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm">
                    {error}{' '}
                    {error.includes('expired') && (
                      <Link to="/forgot-password" className="underline hover:text-red-300">
                        Request a new link
                      </Link>
                    )}
                  </p>
                )}

                <button type="submit" disabled={loading} className={`${btnPrimary} w-full py-2.5`}>
                  {loading ? 'Saving...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { forgotPassword, forgotAccount } from '../api/auth'
import { input, btnPrimary } from '../styles/tokens'

type Mode = 'reset' | 'account'

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<Mode>('reset')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'reset') {
        await forgotPassword(email)
      } else {
        await forgotAccount(email)
      }
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
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
        <h1 className="text-2xl font-black text-slate-100 tracking-tight mb-2 text-center">
          GymTracker
        </h1>

        {/* Mode toggle */}
        <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
          {(['reset', 'account'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setSent(false); setError('') }}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {m === 'reset' ? 'Reset Password' : 'Find Account'}
            </button>
          ))}
        </div>

        {sent ? (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">📬</div>
            <h2 className="text-slate-100 font-semibold mb-2">Check your inbox</h2>
            <p className="text-slate-400 text-sm mb-4">
              If that email is registered, we've sent you an email with{' '}
              {mode === 'reset' ? 'a password reset link' : 'your account info'}.
            </p>
            <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm">
              Back to Login
            </Link>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <p className="text-slate-400 text-sm mb-4">
              {mode === 'reset'
                ? "Enter your email and we'll send a password reset link."
                : "Enter your email and we'll remind you of your username."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  className={input}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button type="submit" disabled={loading} className={`${btnPrimary} w-full py-2.5`}>
                {loading ? 'Sending...' : mode === 'reset' ? 'Send Reset Link' : 'Find Account'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/login" className="text-slate-500 hover:text-slate-300 text-sm">
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

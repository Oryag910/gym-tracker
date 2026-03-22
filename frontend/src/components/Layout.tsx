import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Icons as inline SVGs (no extra dependency)
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
)
const ListIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
)
const PlusIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
)
const TrophyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
)

const navItems = [
  { to: '/', icon: <HomeIcon />, label: 'Home' },
  { to: '/workouts', icon: <ListIcon />, label: 'Workouts' },
  { to: '/prs', icon: <TrophyIcon />, label: 'PRs' },
  { to: '/analytics', icon: <ChartIcon />, label: 'Analytics' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Desktop top nav */}
      <nav className="hidden md:flex items-center gap-1 px-6 py-3 border-b border-slate-800 bg-slate-950 sticky top-0 z-20">
        <Link to="/" className="text-blue-400 font-bold text-lg mr-6 tracking-tight">
          GymTracker
        </Link>

        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isActive(item.to)
                ? 'bg-blue-500/10 text-blue-400 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        <Link
          to="/log"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ml-1 bg-blue-500 text-slate-950 font-bold hover:bg-blue-400"
        >
          <PlusIcon />
          Log Workout
        </Link>

        <Link
          to="/compare"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ml-1 ${
            isActive('/compare')
              ? 'bg-blue-500/10 text-blue-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Compare
        </Link>

        <button
          onClick={() => { logout(); navigate('/login') }}
          className="ml-auto text-slate-400 hover:text-slate-200 text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          Logout
        </button>
      </nav>

      {/* Page content */}
      <main className="max-w-screen-lg mx-auto px-4 pt-6 pb-28 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-slate-900/95 backdrop-blur border-t border-slate-800 z-20">
        <div className="flex items-end justify-around px-2 py-2">
          {/* Left 2 items */}
          {navItems.slice(0, 2).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors text-xs ${
                isActive(item.to) ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}

          {/* Center Log button */}
          <Link
            to="/log"
            className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/30 -mt-4 hover:bg-blue-400 transition-colors"
          >
            <PlusIcon />
          </Link>

          {/* Right 2 items */}
          {navItems.slice(2).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors text-xs ${
                isActive(item.to) ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}

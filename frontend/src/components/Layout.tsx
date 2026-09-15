import { useState } from 'react'
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
const HeartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
)
const RunIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
)
const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)
const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)
const GearIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const MoreIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
  </svg>
)

const navItems = [
  { to: '/', icon: <HomeIcon />, label: 'Home' },
  { to: '/workouts', icon: <ListIcon />, label: 'Workouts' },
  { to: '/prs', icon: <TrophyIcon />, label: 'PRs' },
  { to: '/analytics', icon: <ChartIcon />, label: 'Analytics' },
]

const mobileMainItems = [
  { to: '/', icon: <HomeIcon />, label: 'Home' },
  { to: '/workouts', icon: <ListIcon />, label: 'Workouts' },
  // center: log button
  { to: '/analytics', icon: <ChartIcon />, label: 'Analytics' },
]

const moreItems = [
  { to: '/prs',          icon: <TrophyIcon />,   label: 'PRs' },
  { to: '/cardio',       icon: <RunIcon />,       label: 'Cardio' },
  { to: '/templates',    icon: <ClipboardIcon />, label: 'Templates' },
  { to: '/measurements', icon: <HeartIcon />,     label: 'Measurements' },
  { to: '/library',      icon: <BookIcon />,      label: 'Library' },
  { to: '/settings',     icon: <GearIcon />,      label: 'Settings' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout, isDemo } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMore, setShowMore] = useState(false)

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  // True when the current page is one of the "more" drawer pages
  const moreIsActive = moreItems.some(item => isActive(item.to))

  const navLink = (to: string, label: string, icon?: React.ReactNode) => (
    <Link
      key={to}
      to={to}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
        isActive(to)
          ? 'bg-blue-500/10 text-blue-400 font-medium'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }`}
    >
      {icon}
      {label}
    </Link>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Desktop top nav */}
      <nav className="hidden md:flex items-center gap-1 px-6 py-3 border-b border-slate-800 bg-slate-950 sticky top-0 z-20 flex-wrap">
        <div className="flex items-center gap-2 mr-6">
          <Link to="/" className="text-blue-400 font-bold text-lg tracking-tight">
            GymTracker
          </Link>
          {isDemo && (
            <span
              title="Demo account — changes are temporary"
              className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap"
            >
              <span className="2xl:hidden">Demo</span>
              <span className="hidden 2xl:inline">Demo account · changes are temporary</span>
            </span>
          )}
        </div>

        {navItems.map(item => navLink(item.to, item.label, item.icon))}

        <Link
          to="/log"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ml-1 bg-blue-500 text-slate-950 font-bold hover:bg-blue-400"
        >
          <PlusIcon />
          Log Workout
        </Link>

        {navLink('/cardio', 'Cardio', <RunIcon />)}
        {navLink('/templates', 'Templates')}
        {navLink('/measurements', 'Measurements', <HeartIcon />)}
        {navLink('/library', 'Library')}
        {navLink('/settings', 'Settings')}

        <button
          onClick={() => { logout(); navigate('/login') }}
          className="ml-auto text-slate-400 hover:text-slate-200 text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
        >
          {isDemo ? 'Exit demo' : 'Logout'}
        </button>
      </nav>

      {/* Page content */}
      <main className="max-w-screen-lg mx-auto px-4 pt-6 pb-28 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-slate-900/95 backdrop-blur border-t border-slate-800 z-20">
        <div className="flex items-end justify-around px-2 py-2">
          {mobileMainItems.slice(0, 2).map(item => (
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

          {mobileMainItems.slice(2).map(item => (
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

          {/* More button */}
          <button
            onClick={() => setShowMore(v => !v)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors text-xs ${
              moreIsActive || showMore ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <MoreIcon />
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* More drawer (mobile only) */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm md:hidden"
            onClick={() => setShowMore(false)}
          />
          {/* Sheet — sits just above the bottom nav (bottom-16 = 64px) */}
          <div className="fixed bottom-16 left-0 right-0 z-40 md:hidden bg-slate-900 border-t border-slate-800 rounded-t-2xl p-4 pb-6">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMore(false)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors text-xs ${
                    isActive(item.to)
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
            {isDemo && (
              <p className="text-center text-[11px] text-amber-400/90 mt-3">
                Demo account · changes are temporary
              </p>
            )}
            <button
              onClick={() => { logout(); navigate('/login'); setShowMore(false) }}
              className="w-full mt-3 py-3 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 text-sm transition-colors"
            >
              {isDemo ? 'Exit demo' : 'Logout'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

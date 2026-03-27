import { useState } from 'react'
import type { GlobalExercise } from '../api/globalExercises'
import { input } from '../styles/tokens'

interface ExercisePickerProps {
  /** The exercise name currently shown in the input */
  value: string
  /** Called when the user selects an exercise from the dropdown.
   *  The second argument is the full library entry so the parent can
   *  also store muscle data, image URL, etc. */
  onChange: (name: string, libExercise?: GlobalExercise) => void
  /** Full library list — fetch it once in the parent and pass it down */
  library: GlobalExercise[]
  autoFocus?: boolean
  className?: string
}

/**
 * A search-filter dropdown for picking an exercise from the library.
 * Shows a text input; as the user types it filters and shows a
 * scrollable list of matching exercises from the library.
 *
 * Why a component? LogWorkoutPage and TemplateFormPage both have the
 * same ~30 lines of inline logic. WorkoutDetailPage (edit mode) also
 * needs it, so we extract it once here instead of copying a third time.
 */
export default function ExercisePicker({ value, onChange, library, autoFocus, className }: ExercisePickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [filter, setFilter] = useState(value)

  // Keep filter in sync when value changes from outside (e.g. after a save)
  // but only when the picker is closed so we don't overwrite what the user is typing
  const handleFocus = () => {
    setFilter(value)
    setShowPicker(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value)
    setShowPicker(true)
    // Let parent know the text changed (without a library entry) so it can
    // update its own state if needed
    onChange(e.target.value)
  }

  const handleBlur = () => {
    // Delay so that the onMouseDown on list items can fire first
    setTimeout(() => setShowPicker(false), 150)
  }

  const handleSelect = (libEx: GlobalExercise) => {
    setFilter(libEx.name)
    setShowPicker(false)
    onChange(libEx.name, libEx)
  }

  // Filter the library by what's typed (case-insensitive)
  const filtered = library.filter(ex =>
    ex.name.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className={`relative ${className ?? ''}`}>
      <input
        className={input}
        value={filter}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Search exercises..."
        autoFocus={autoFocus}
      />

      {showPicker && library.length > 0 && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500">
              No exercises match "{filter}"
            </div>
          ) : (
            filtered.map(libEx => (
              <button
                key={libEx.id}
                type="button"
                onMouseDown={() => handleSelect(libEx)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left border-b border-slate-700/50 last:border-0"
              >
                {libEx.image_url && (
                  <img
                    src={libEx.image_url}
                    alt={libEx.name}
                    className="w-8 h-8 object-cover rounded bg-slate-700 shrink-0"
                  />
                )}
                <div>
                  <div className="text-sm text-slate-200">{libEx.name}</div>
                  {libEx.category && (
                    <div className="text-[11px] text-slate-500">{libEx.category}</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

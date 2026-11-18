import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'dark' | 'light'
const ThemeContext = createContext<{
  theme: Theme
  setTheme: (value: Theme) => void
}>({
  theme: 'dark',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem('assembly-theme') === 'light'
        ? 'light'
        : 'dark'
    } catch {
      return 'dark'
    }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b1a2b' : '#f7f6f2')
    try {
      localStorage.setItem('assembly-theme', theme)
    } catch {
      // The selected appearance still applies when browser storage is unavailable.
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function Appearance() {
  const { theme, setTheme } = useContext(ThemeContext)
  return (
    <section className="panel appearance">
      <div>
        <h2>Appearance</h2>
        <p>Choose how the portal looks on this device.</p>
      </div>
      <div className="theme-options" role="group" aria-label="Color theme">
        {(['dark', 'light'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
          >
            <span className={'theme-preview ' + value} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            {value === 'dark' ? 'Dark' : 'Light'}
            <span className="theme-check" aria-hidden="true">
              {theme === value ? '✓' : ''}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

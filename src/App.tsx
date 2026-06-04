import { useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Editor from './pages/Editor'
import Pitch from './pages/Pitch'
import About from './pages/About'
import Docs from './pages/Docs'
import NotFound from './pages/NotFound'
import { ChromeLayout } from './components/ChromeLayout'

// On client-side navigation, move focus to the new page's main region so
// screen-reader and keyboard users aren't left on an unmounted link.
function RouteFocus() {
  const { pathname } = useLocation()
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    document.getElementById('main-content')?.focus()
  }, [pathname])
  return null
}

function App() {
  return (
    <>
      <RouteFocus />
      <Routes>
      {/* Full-bleed surfaces — their own layout, no shared chrome. */}
      <Route path="/" element={<Home />} />
      <Route path="/editor" element={<Editor />} />
      <Route path="/pitch" element={<Pitch />} />

      {/* Secondary pages share the minimal nav + centered column. */}
      <Route element={<ChromeLayout />}>
        <Route path="/about" element={<About />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      </Routes>
    </>
  )
}

export default App

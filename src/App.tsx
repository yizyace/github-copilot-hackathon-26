import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Editor from './pages/Editor'
import About from './pages/About'
import Docs from './pages/Docs'
import NotFound from './pages/NotFound'
import { ChromeLayout } from './components/ChromeLayout'

function App() {
  return (
    <Routes>
      {/* Full-bleed surfaces — their own layout, no shared chrome. */}
      <Route path="/" element={<Home />} />
      <Route path="/editor" element={<Editor />} />

      {/* Secondary pages share the minimal nav + centered column. */}
      <Route element={<ChromeLayout />}>
        <Route path="/about" element={<About />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App

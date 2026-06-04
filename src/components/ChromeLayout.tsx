import { NavLink, Outlet } from 'react-router-dom'
import '../App.css'

// The minimal chrome (top nav + centered column) for the secondary pages.
// The landing and editor are full-bleed and render outside this layout.
export function ChromeLayout() {
  return (
    <div className="layout">
      <nav className="nav">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/about">About</NavLink>
        <NavLink to="/docs">Docs</NavLink>
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

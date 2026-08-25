import teamLogo from '../assets/logo/logo.jpg'

export default function AdminBackground({ withGrid = false }) {
  return (
    <div aria-hidden="true">
      <div className="admin-glow admin-glow-1"></div>
      <div className="admin-glow admin-glow-2"></div>
      {withGrid && <div className="admin-grid-overlay"></div>}
      <div className="admin-logo-bg">
        <img src={teamLogo} alt="" />
      </div>
    </div>
  )
}

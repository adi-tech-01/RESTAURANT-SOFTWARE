import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Utensils, LayoutGrid, Flame, QrCode, Users, LogOut } from "lucide-react";
import CustomerMenu from "./pages/CustomerMenu";
import StaffFloor from "./pages/StaffFloor";
import KitchenDisplay from "./pages/KitchenDisplay";
import TableQRs from "./pages/TableQRs";

function RoleSelector() {
  const navigate = useNavigate();

  return (
    <div className="role-screen">
      <div className="role-card-wrap">
        <span className="role-eyebrow">WELCOME TO</span>
        <h1 className="role-title">ZAIKA</h1>
        <p className="role-sub">Choose how you'd like to continue</p>

        <div className="role-grid">
          <button className="role-btn guest" onClick={() => navigate("/table/1")}>
            <div className="role-icon"><Utensils size={28} /></div>
            <h3>I'm a Guest</h3>
            <p>Browse menu, order food, play games & pay</p>
          </button>

          <button className="role-btn staff" onClick={() => navigate("/staff")}>
            <div className="role-icon"><Users size={28} /></div>
            <h3>Zaika Team</h3>
            <p>Live Floor Dashboard, Kitchen (KDS) & Table QRs</p>
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(true);

useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2700);
    return () => clearTimeout(timer);
  }, []);

  // Show the Staff navigation bar ONLY on Staff, KDS, and QR pages
  const isStaffArea = ["/staff", "/kitchen", "/qr"].includes(location.pathname);

if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-glow" />
        <div className="splash-frame">
          <div className="splash-emblem">Z</div>
          <span className="splash-welcome">Welcome to</span>
          <h1 className="splash-brand">ZAIKA</h1>
          <div className="splash-divider">
            <span className="diamond" />
          </div>
          <p className="splash-tagline">Fine Cafe & Culinary Lounge</p>
          <div className="splash-loader-track">
            <div className="splash-loader-bar" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      {isStaffArea && (
        <nav className="top-switcher">
          <span className="switcher-brand">ZAIKA TEAM</span>
          <div className="switcher-btns">
            <NavLink to="/staff" className={({ isActive }) => (isActive ? "nav-pill active" : "nav-pill")}>
              <LayoutGrid size={15} /> Staff Floor
            </NavLink>
            <NavLink to="/kitchen" className={({ isActive }) => (isActive ? "nav-pill active" : "nav-pill")}>
              <Flame size={15} /> Kitchen (KDS)
            </NavLink>
            <NavLink to="/qr" className={({ isActive }) => (isActive ? "nav-pill active" : "nav-pill")}>
              <QrCode size={15} /> Table QRs
            </NavLink>
            <button className="nav-pill exit-pill" onClick={() => navigate("/")}>
              <LogOut size={15} /> Switch Role
            </button>
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/" element={<RoleSelector />} />
        <Route path="/table/:tableId" element={<CustomerMenu />} />
        <Route path="/staff" element={<StaffFloor />} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/qr" element={<TableQRs />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
import { Link, useLocation } from "react-router-dom";

export default function NavBar() {
  const { pathname } = useLocation();

  const Tab = ({ to, label }) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        style={{
          padding: "10px 14px",
          textDecoration: "none",
          color: active ? "#0ea5e9" : "#111",
          borderBottom: active ? "2px solid #0ea5e9" : "2px solid transparent",
          fontWeight: active ? 600 : 500,
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
          height: 56,
        }}
      >
        <Tab to="/" label="Max Offer" />
        <Tab to="/rehab" label="Rehab" />
        <Tab to="/profit" label="Profit" />
      </div>
    </header>
  );
}

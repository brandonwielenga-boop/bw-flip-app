export default function App() {
  return (
    <div style={{ textAlign: "center", marginTop: 40 }}>
      <h1>Hello Brandon 👋</h1>
      <p>Your app is running.</p>
      <button
        style={{ padding: "12px 20px", fontSize: 18, borderRadius: 8, border: "none", background: "#007bff", color: "#fff" }}
        onClick={() => alert("It works!")}
      >
        Click Me
      </button>
    </div>
  );
}

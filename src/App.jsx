import { BrowserRouter, Routes, Route } from "react-router-dom";
import MaxOffer from "./pages/MaxOffer";
import RehabCalc from "./pages/RehabCalc";
import ProfitCalc from "./pages/ProfitCalc";
import NavBar from "./components/NavBar";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ paddingTop: 64 }}>
        <Routes>
          <Route path="/" element={<MaxOffer />} />
          <Route path="/rehab" element={<RehabCalc />} />
          <Route path="/profit" element={<ProfitCalc />} />
        </Routes>
      </div>
      <NavBar />
    </BrowserRouter>
  );
}

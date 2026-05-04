import { BrowserRouter, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Gallery from "./pages/Gallery";
import Upload from "./pages/Upload";
import AssetDetail from "./pages/AssetDetail";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/assets/:assetId" element={<AssetDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

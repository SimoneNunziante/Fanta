import { HashRouter, Routes, Route } from "react-router-dom";
import { GiocatoriListPage } from "./pages/GiocatoriListPage";
import { useTema } from "./useTema";

function App() {
  useTema();

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<GiocatoriListPage />} />
        <Route path="/preferiti" element={<GiocatoriListPage soloPreferiti />} />
      </Routes>
    </HashRouter>
  );
}

export default App;

import { HashRouter, Routes, Route } from "react-router-dom";
import { GiocatoriListPage } from "./pages/GiocatoriListPage";
import { useTema } from "./useTema";
import { useWakeLock } from "./useWakeLock";

function App() {
  useTema();
  useWakeLock();

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<GiocatoriListPage vista="listone" />} />
        <Route path="/preferiti" element={<GiocatoriListPage vista="preferiti" />} />
        <Route path="/presi" element={<GiocatoriListPage vista="presi" />} />
      </Routes>
    </HashRouter>
  );
}

export default App;

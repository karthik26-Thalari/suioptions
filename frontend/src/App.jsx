import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar     from "./components/Navbar";
import Landing    from "./pages/Landing";
import Options    from "./pages/Options";
import Vault      from "./pages/Vault";
import Portfolio  from "./pages/Portfolio";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar/>
      <Routes>
        <Route path="/"          element={<Landing/>}/>
        <Route path="/options"   element={<Options/>}/>
        <Route path="/vault"     element={<Vault/>}/>
        <Route path="/portfolio" element={<Portfolio/>}/>
      </Routes>
    </BrowserRouter>
  );
}
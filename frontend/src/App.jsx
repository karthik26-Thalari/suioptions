import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar    from "./components/Navbar";
import Cursor    from "./components/Cursor";
import Landing   from "./pages/Landing";
import Options   from "./pages/Options";
import Vault     from "./pages/Vault";
import Portfolio from "./pages/Portfolio";

export default function App() {
  const [cursorColor, setCursorColor] = useState("#00d4ff");

  return (
    <BrowserRouter>
      <Cursor color={cursorColor}/>
      <Navbar/>
      <Routes>
        <Route path="/"          element={<Landing   onColorChange={setCursorColor}/>}/>
        <Route path="/options"   element={<Options/>}/>
        <Route path="/vault"     element={<Vault/>}/>
        <Route path="/portfolio" element={<Portfolio/>}/>
      </Routes>
    </BrowserRouter>
  );
}

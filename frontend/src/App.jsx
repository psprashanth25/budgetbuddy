import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import MonthReport from "./pages/MonthReport";
import Categories from "./pages/Categories";

function App() {
  return (
    <Router>

      <Routes>

        <Route path="/" element={<Dashboard />} />

        <Route path="/reports" element={<Reports />} />
        <Route path="/reports/:month" element={<MonthReport />} />
        <Route path="/categories" element={<Categories />} />

      </Routes>

    </Router>
  );
}

export default App;
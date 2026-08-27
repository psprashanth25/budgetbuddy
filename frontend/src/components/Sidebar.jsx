import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 min-h-screen p-6">

      <h1 className="text-2xl font-bold text-orange-500 mb-10">
        BudgetBuddy
      </h1>

      <ul className="space-y-6 text-gray-300">

        <li>
          <Link to="/" className="hover:text-orange-500 cursor-pointer">
            Dashboard
          </Link>
        </li>

        <li className="hover:text-orange-500 cursor-pointer">
          Expenses
        </li>

        <li>
           <Link to="/categories" className="hover:text-orange-500 cursor-pointer">
             Categories
           </Link>
        </li>

        <li>
          <Link to="/reports" className="hover:text-orange-500 cursor-pointer">
            Reports
          </Link>
        </li>

      </ul>

    </div>
  );
}

export default Sidebar;
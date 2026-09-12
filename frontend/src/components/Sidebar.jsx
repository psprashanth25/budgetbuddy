import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  LayoutDashboard,
  ReceiptText,
  Tags,
  BarChart3,
  LogOut,
  Wallet,
  User,
} from "lucide-react";

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/expenses", label: "Expenses", icon: ReceiptText },
    { to: "/categories", label: "Categories", icon: Tags },
    { to: "/reports", label: "Reports", icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col justify-between min-h-screen p-6 select-none shrink-0">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-orange-500 tracking-tight">BudgetBuddy</h1>
            <p className="text-xs text-gray-400">Hostel Expense Manager</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition duration-200 text-sm font-medium ${isActive
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Card & Logout */}
      <div className="pt-6 border-t border-gray-800">
        {user && (
          <div className="bg-gray-800/50 border border-gray-800 rounded-xl p-3.5 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
                {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>

          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-red-500/20 text-gray-300 hover:text-red-400 rounded-xl text-sm font-medium transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
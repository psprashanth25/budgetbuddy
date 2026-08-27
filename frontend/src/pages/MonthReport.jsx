import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

function MonthReport() {

  const { month } = useParams();

  const [expenses, setExpenses] = useState([]);

  const [budgets] = useState({
    Food: 3000,
    Travel: 1000,
    Shopping: 5000,
    Bills: 2000
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    const savedExpenses = localStorage.getItem("expenses");

    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
  }, []);

  // Filter expenses for selected month
  const filteredExpenses = expenses.filter((expense) => {

    const date = new Date(expense.date);

    const monthKey =
      date.toLocaleString("default", { month: "long" }) +
      " " +
      date.getFullYear();

    return monthKey === month;

  });

  // Apply search + category filter
  const displayedExpenses = filteredExpenses.filter((expense) => {

    const matchesSearch =
      expense.note?.toLowerCase().includes(search.toLowerCase()) ||
      expense.category?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "All" || expense.category === categoryFilter;

    return matchesSearch && matchesCategory;

  });

  // Total spending
  const total = filteredExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  // Category totals
  const categoryTotals = {};

  filteredExpenses.forEach((expense) => {

    const cat = expense.category;
    const amt = Number(expense.amount);

    if (categoryTotals[cat]) {
      categoryTotals[cat] += amt;
    } else {
      categoryTotals[cat] = amt;
    }

  });

  // Chart Data
  const chartData = Object.keys(categoryTotals).map((key) => ({
    name: key,
    value: categoryTotals[key]
  }));

  // Highest spending category
  let highestCategory = null;
  let highestAmount = 0;

  chartData.forEach((item) => {
    if (item.value > highestAmount) {
      highestAmount = item.value;
      highestCategory = item.name;
    }
  });

  const COLORS = [
    "#f97316",
    "#22c55e",
    "#3b82f6",
    "#eab308",
    "#ef4444",
    "#a855f7"
  ];

  // PDF DOWNLOAD
  const downloadPDF = () => {

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(`${month} Expense Report`, 14, 20);

    doc.setFontSize(14);
    doc.text(`Total Spent: Rs. ${total}`, 14, 30);

    const tableData = filteredExpenses.map((expense) => [
      expense.amount,
      expense.category,
      expense.note || "-",
      expense.date
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Amount", "Category", "Note", "Date"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [249, 115, 22]
      }
    });

    doc.save(`${month}-expense-report.pdf`);

  };

  return (

    <div className="flex bg-black text-white min-h-screen">

      <Sidebar />

      <div className="flex-1 p-10">

        {/* Title */}
        <div className="flex justify-between items-center mb-10">

          <h1 className="text-4xl font-bold text-orange-500">
            {month} Report
          </h1>

          <button
            onClick={downloadPDF}
            className="bg-orange-500 hover:bg-orange-600 px-5 py-2 rounded-lg font-semibold"
          >
            Download PDF
          </button>

        </div>

        {/* Total Card */}
        <div className="bg-gray-900 rounded-xl p-6 mb-10">

          <h2 className="text-2xl mb-2 text-orange-400">
            Total Spent
          </h2>

          <p className="text-xl">₹{total}</p>

        </div>

        {/* Spending Insight */}
        {highestCategory && (

          <div className="bg-gray-900 rounded-xl p-6 mb-10">

            <h2 className="text-2xl text-orange-400 mb-2">
              💡 Spending Insight
            </h2>

            <p className="text-gray-300">
              Your highest spending category this month is
              <span className="text-orange-400 font-semibold">
                {" "} {highestCategory}
              </span>.
            </p>

            <p className="text-gray-300">
              Total spent on it:
              <span className="text-orange-400 font-semibold">
                {" "} ₹{highestAmount}
              </span>
            </p>

          </div>

        )}

        {/* Budget Limits */}
        <div className="mb-10">

          <h2 className="text-2xl text-orange-500 mb-6">
            Category Budgets
          </h2>

          <div className="grid grid-cols-2 gap-6">

            {Object.keys(budgets).map((category) => {

              const spent = categoryTotals[category] || 0;
              const limit = budgets[category];

              const percent = Math.min((spent / limit) * 100, 100);

              let color = "bg-green-500";

              if (percent > 80) color = "bg-red-500";
              else if (percent > 50) color = "bg-orange-500";

              return (

                <div key={category} className="bg-gray-900 p-6 rounded-xl">

                  <h3 className="text-lg mb-2">{category}</h3>

                  <p className="text-gray-400 mb-2">
                    ₹{spent} / ₹{limit}
                  </p>

                  <div className="w-full bg-gray-700 h-3 rounded">

                    <div
                      className={`${color} h-3 rounded`}
                      style={{ width: `${percent}%` }}
                    ></div>

                  </div>

                </div>

              );

            })}

          </div>

        </div>

        {/* Category Breakdown */}
        <div className="bg-gray-900 rounded-xl p-6 mb-10 flex flex-col items-center">

          <h2 className="text-2xl text-orange-400 mb-4">
            Category Breakdown
          </h2>

          {chartData.length === 0 ? (

            <p className="text-gray-400">
              No data available for chart
            </p>

          ) : (

            <PieChart width={450} height={330}>

              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >

                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}

              </Pie>

              <Tooltip />
              <Legend />

            </PieChart>

          )}

        </div>

        {/* Search + Filter */}
        <div className="flex gap-4 mb-6">

          <input
            type="text"
            placeholder="Search note or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg outline-none"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg"
          >
            <option value="All">All Categories</option>
            <option value="Food">Food</option>
            <option value="Travel">Travel</option>
            <option value="Shopping">Shopping</option>
            <option value="Bills">Bills</option>
          </select>

        </div>

        {/* Expense Table */}
        {filteredExpenses.length === 0 ? (

          <p className="text-gray-400">
            No expenses for this month.
          </p>

        ) : (

          <table className="w-full bg-gray-900 rounded-xl overflow-hidden">

            <thead>

              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left px-4">Category</th>
                <th className="text-left px-4">Note</th>
                <th className="text-left px-4">Date</th>
              </tr>

            </thead>

            <tbody>

              {displayedExpenses.map((expense) => (

                <tr key={expense.id} className="border-b border-gray-800">

                  <td className="py-3 px-4 text-orange-400">
                    ₹{expense.amount}
                  </td>

                  <td className="px-4">{expense.category}</td>

                  <td className="px-4">{expense.note}</td>

                  <td className="px-4">{expense.date}</td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

      </div>

    </div>

  );
}

export default MonthReport;
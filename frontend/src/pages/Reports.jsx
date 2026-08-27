import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

function Reports() {
    const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const savedExpenses = localStorage.getItem("expenses");

    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses));
    }
  }, []);

  const monthlyTotals = {};

  expenses.forEach((expense) => {

    const date = new Date(expense.date);

    const monthKey = `${date.toLocaleString("default", { month: "long" })} ${date.getFullYear()}`;

    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = 0;
    }

    monthlyTotals[monthKey] += Number(expense.amount);

  });
  const chartData = Object.keys(monthlyTotals)
  .sort((a, b) => new Date(a) - new Date(b))
  .map((key) => ({
    month: key,
    amount: monthlyTotals[key]
  }));

  return (
    <div className="flex bg-black text-white min-h-screen">

      <Sidebar />

      <div className="flex-1 p-10">

        <h1 className="text-4xl font-bold text-orange-500 mb-10">
          Reports
        </h1>
        {/* Yearly Spending Trend */}
<div className="bg-gray-900 rounded-xl p-6 mb-10">

  <h2 className="text-2xl text-orange-400 mb-6">
    Yearly Spending Trend
  </h2>

  <ResponsiveContainer width="100%" height={300}>

    <BarChart data={chartData}>

      <CartesianGrid strokeDasharray="3 3" />

      <XAxis dataKey="month" tick={{ fill: "#ccc" }} />

      <YAxis tick={{ fill: "#ccc" }} />

      <Tooltip />

      <Bar
        dataKey="amount"
        fill="#f97316"
        radius={[6,6,0,0]}
      />

        </BarChart>

         </ResponsiveContainer>

          </div>

        {Object.keys(monthlyTotals).length === 0 ? (

          <p className="text-gray-400">
            No reports yet.
          </p>

        ) : (

          Object.keys(monthlyTotals).map((month) => (

            <div
              key={month}
              onClick={() => navigate(`/reports/${month}`)}
              className="bg-gray-900 rounded-xl p-6 mb-6 cursor-pointer hover:bg-gray-800 transition"
            >

              <h2 className="text-2xl text-orange-400 mb-2">
                {month}
              </h2>

              <p className="text-lg">
                Total Spent: ₹{monthlyTotals[month]}
              </p>

            </div>

          ))

        )}

      </div>

    </div>
  );
}

export default Reports;
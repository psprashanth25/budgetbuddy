import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import DashboardCard from "../components/DashboardCard";

function Dashboard() {

  const [showModal, setShowModal] = useState(false);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [editId, setEditId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  // Categories
const [categories, setCategories] = useState(() => {

  const saved = localStorage.getItem("categories");

  return saved
    ? JSON.parse(saved)
    : ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Other"];

});
  // Budget states
const [budgets, setBudgets] = useState(() => {
  const savedBudgets = localStorage.getItem("budgets");
  return savedBudgets ? JSON.parse(savedBudgets) : [];
});


const [budgetCategory, setBudgetCategory] = useState("");
const [budgetLimit, setBudgetLimit] = useState("");
const [editingBudgetId, setEditingBudgetId] = useState(null);
const [errors, setErrors] = useState({});

  const [expenses, setExpenses] = useState(() => {
  const savedExpenses = localStorage.getItem("expenses");
  return savedExpenses ? JSON.parse(savedExpenses) : [];
});

const [income, setIncome] = useState(() => {
  const savedIncome = localStorage.getItem("income");
  return savedIncome ? Number(savedIncome) : 2000;
  });
  useEffect(() => {

const savedCategories = localStorage.getItem("categories");

if(savedCategories){
setCategories(JSON.parse(savedCategories));
}

},[]);
useEffect(() => {
  localStorage.setItem("expenses", JSON.stringify(expenses));
}, [expenses]);
useEffect(() => {
  localStorage.setItem("income", income);
}, [income]);
useEffect(() => {
  localStorage.setItem("budgets", JSON.stringify(budgets));
}, [budgets]);
useEffect(()=>{

  localStorage.setItem("categories", JSON.stringify(categories));

},[categories]);
  
  const today = new Date();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthExpenses = expenses.filter((expense) => {

  const expenseDate = new Date(expense.date);

  return (
    expenseDate.getMonth() === currentMonth &&
    expenseDate.getFullYear() === currentYear
  );

});
 const todayExpenses = expenses.filter((expense) => {
  const expenseDate = new Date(expense.date);
  return expenseDate.toDateString() === today.toDateString();
});

const startOfWeek = new Date(today);
startOfWeek.setDate(today.getDate() - today.getDay());
startOfWeek.setHours(0,0,0,0);

const endOfWeek = new Date(startOfWeek);
endOfWeek.setDate(startOfWeek.getDate() + 6);
endOfWeek.setHours(23,59,59,999);

const weekExpenses = expenses.filter((expense) => {

  const expenseDate = new Date(expense.date);

  return expenseDate >= startOfWeek && expenseDate <= endOfWeek;

});

const yearExpenses = expenses.filter((expense) => {
  const expenseDate = new Date(expense.date);
  return expenseDate.getFullYear() === today.getFullYear();
});

  const totalSpent = currentMonthExpenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );
  const todayTotal = todayExpenses.reduce(
  (sum, item) => sum + Number(item.amount),
  0
);

const weekTotal = weekExpenses.reduce(
  (sum, item) => sum + Number(item.amount),
  0
);

const monthTotal = currentMonthExpenses.reduce(
  (sum, item) => sum + Number(item.amount),
  0
);

const yearTotal = yearExpenses.reduce(
  (sum, item) => sum + Number(item.amount),
  0
);

  const remainingBalance = income - totalSpent;
  
  // Budget allocation calculations
const totalBudgetLimits = budgets.reduce(
  (sum, b) => sum + Number(b.limit),
  0
);

const availableBudget = income - totalBudgetLimits;
// ================= BUDGET WARNINGS =================

const budgetWarnings = budgets.map((b) => {

  const spent = expenses
    .filter((e) => e.category === b.category)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const percent = b.limit ? (spent / b.limit) * 100 : 0;

  if (percent >= 100) {
    return {
      type: "exceeded",
      category: b.category,
      extra: spent - b.limit
    };
  }

  if (percent >= 80) {
    return {
      type: "warning",
      category: b.category,
      percent: Math.round(percent)
    };
  }

  return null;

}).filter(Boolean);
  const monthName = new Date().toLocaleString("default", { month: "long" });
  const budgetUsed = (totalSpent / income) * 100;
  let progressColor = "bg-green-500";

if (budgetUsed > 50) {
  progressColor = "bg-orange-500";
}

if (budgetUsed > 80) {
  progressColor = "bg-red-500";
}

 const handleSave = () => {

const newErrors = {};

if (!date) {
  newErrors.date = "Please select a date";
}

if (!amount) {
  newErrors.amount = "Please enter amount";
}

if (!category) {
  newErrors.category = "Please select a category";
}

if (Object.keys(newErrors).length > 0) {
  setErrors(newErrors);
  return;
}

setErrors({});

  if (isEditing) {

    const updatedExpenses = expenses.map((expense) =>
      expense.id === editId
        ? { ...expense, amount, category, note }
        : expense
    );

    setExpenses(updatedExpenses);
    setIsEditing(false);
    setEditId(null);

  } else {

    const newExpense = {
      id: Date.now(),
      amount,
      category,
      note,
      date
    };

    setExpenses([...expenses, newExpense]);
  }

  setAmount("");
  setCategory("");
  setNote("");
  setDate("");
  setShowModal(false);
};

  const handleDelete = (id) => {
  const updatedExpenses = expenses.filter((expense) => expense.id !== id);
  setExpenses(updatedExpenses);
};
const handleEdit = (expense) => {
  setAmount(expense.amount);
  setCategory(expense.category);
  setNote(expense.note);
  setDate(expense.date);
  setEditId(expense.id);
  setIsEditing(true);
  setShowModal(true);
};
const addOrUpdateBudget = () => {

  if (!budgetCategory || !budgetLimit) return;

  const newLimit = Number(budgetLimit);

  if (!editingBudgetId && newLimit > availableBudget) {
    alert(`Only ₹${availableBudget} remaining to allocate`);
    return;
  }

  let updatedBudgets;

  if (editingBudgetId) {

    updatedBudgets = budgets.map((b) =>
      b.id === editingBudgetId
        ? { ...b, category: budgetCategory, limit: newLimit }
        : b
    );

  } else {

    const newBudget = {
      id: Date.now(),
      category: budgetCategory,
      limit: newLimit
    };

    updatedBudgets = [...budgets, newBudget];

  }

  setBudgets(updatedBudgets);

  setBudgetCategory("");
  setBudgetLimit("");
  setEditingBudgetId(null);
};

const deleteBudget = (id) => {

  const updated = budgets.filter((b) => b.id !== id);

  setBudgets(updated);

};

const editBudget = (budget) => {

  setBudgetCategory(budget.category);
  setBudgetLimit(budget.limit);
  setEditingBudgetId(budget.id);

};
// ================= SPENDING FORECAST =================

// current day of month
const todayDate = new Date().getDate();

// total days in current month
const totalDays = new Date(
  new Date().getFullYear(),
  new Date().getMonth() + 1,
  0
).getDate();

// average daily spending
const avgDailySpend = totalSpent / todayDate;

// predicted total spending for month
const predictedMonthlySpend = Math.round(avgDailySpend * totalDays);

// difference from income
const forecastDifference = predictedMonthlySpend - income;
  // Category totals for pie chart
  const categoryTotals = {};

  currentMonthExpenses.forEach((expense) => {
    const cat = expense.category;
    const amt = Number(expense.amount);

    if (categoryTotals[cat]) {
      categoryTotals[cat] += amt;
    } else {
      categoryTotals[cat] = amt;
    }
  });

  const chartData = Object.keys(categoryTotals).map((key) => ({
    name: key,
    value: categoryTotals[key]
  }));

  // Monthly graph data
const monthlyTotals = {};

currentMonthExpenses.forEach((expense) => {
  const cat = expense.category;
  const amt = Number(expense.amount);

  if (monthlyTotals[cat]) {
    monthlyTotals[cat] += amt;
  } else {
    monthlyTotals[cat] = amt;
  }
});

const monthlyData = Object.keys(monthlyTotals).map((key) => ({
  name: key,
  amount: monthlyTotals[key]
}));
const filteredExpenses = expenses.filter((expense) => {

  const matchesCategory =
    filter === "All" || expense.category === filter;

  const searchText = search.toLowerCase();

  const matchesSearch =
    expense.note.toLowerCase().includes(searchText) ||
    expense.category.toLowerCase().includes(searchText) ||
    expense.amount.toString().includes(searchText);

  return matchesCategory && matchesSearch;
});

  const COLORS = [
    "#f97316",
    "#22c55e",
    "#3b82f6",
    "#eab308",
    "#ef4444",
    "#a855f7"
  ];

  return (
    <div className="flex bg-black text-white min-h-screen">

      <Sidebar />

      <div className="flex-1 p-10">

        {/* Header */}
        <div className="flex justify-between items-center mb-10">

          <h1 className="text-4xl font-bold text-orange-500">
            {monthName} Budget Dashboard
          </h1>

          <button
            onClick={() => {
              setShowModal(true);
              setCategory("");
              setAmount("");
               setNote("");
               setDate("");
              }}
            className="bg-orange-500 hover:bg-orange-600 px-5 py-2 rounded-lg font-semibold"
          >
            + Add Expense
          </button>

        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          <div className="relative">

            <DashboardCard title="Monthly Income" amount={income} />

             <button
               onClick={() => {
               const newIncome = prompt("Enter new monthly income:");
               if (newIncome && !isNaN(newIncome)) {
               setIncome(Number(newIncome));
              }
             }}
              className="absolute top-2 right-2 text-sm text-blue-400 hover:text-blue-600"
           >
             Edit
            </button>

          </div>
          <DashboardCard title="Total Spent" amount={totalSpent} />
          <DashboardCard title="Remaining Balance" amount={remainingBalance} />

        </div>
        {/* Time Based Spending */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">

            <DashboardCard title="Today" amount={todayTotal} />

            <DashboardCard title="This Week" amount={weekTotal} />

            <DashboardCard title="This Month" amount={monthTotal} />

         <DashboardCard title="This Year" amount={yearTotal} />

       </div> 
        {/* Budget Progress */}

<div className="mb-10">

  <h2 className="text-2xl font-bold text-orange-500 mb-4">
    Budget Usage
  </h2>

  <div className="relative w-full bg-gray-800 rounded-full h-6">

    <div
      className={`${progressColor} h-6 rounded-full transition-all duration-500`}
      style={{ width: `${Math.min(budgetUsed, 100)}%` }}
    ></div>

    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-white">
      {Math.round(budgetUsed)}%
    </span>

  </div>

  <p className="mt-2 text-gray-300">
    ₹{totalSpent} of ₹{income} used
  </p>

</div>
{/* Budget Alerts */}

{budgetWarnings.length > 0 && (

<div className="mt-6 mb-8 space-y-3">

{budgetWarnings.map((alert, index) => {

if (alert.type === "warning") {

return (

<div
key={index}
className="bg-yellow-500/10 border border-yellow-500 text-yellow-400 p-3 rounded-lg"
>
⚠ {alert.category} budget is {alert.percent}% used
</div>

);

}

if (alert.type === "exceeded") {

return (

<div
key={index}
className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg"
>
🚨 {alert.category} budget exceeded by ₹{alert.extra}
</div>

);

}

return null;

})}

</div>

)}
{/* Spending Forecast */}

<div className="mt-8 mb-12 bg-gray-900 rounded-xl p-6 border border-gray-800">

<h2 className="text-2xl text-orange-400 mb-3">
📊 Spending Forecast
</h2>

<p className="text-gray-300 mb-2">
At your current spending rate,
you may spend
<span className="text-orange-400 font-semibold">
 {" "}₹{predictedMonthlySpend}
</span>
 this month.
</p>

{forecastDifference > 0 ? (

<p className="text-red-400">
⚠ This exceeds your income by ₹{forecastDifference}
</p>

) : (

<p className="text-green-400">
You are on track to save ₹{Math.abs(forecastDifference)}
</p>

)}

</div>
{/* Category Budget Planner */}

<div className="mt-12 mb-12">

<h2 className="text-2xl text-orange-500 mb-4">
Category Budget Planner
</h2>

<p className="text-gray-400 mb-4">
Available to allocate: ₹{availableBudget}
</p>

<div className="flex gap-4 mb-6">

<select
value={budgetCategory}
onChange={(e)=>setBudgetCategory(e.target.value)}
className="bg-gray-800 px-4 py-2 rounded"
>

<option value="">Select Category</option>

{categories.map((cat)=>(
<option key={cat} value={cat}>
{cat}
</option>
))}

</select>

<input
type="number"
placeholder="Limit"
value={budgetLimit}
onChange={(e)=>setBudgetLimit(e.target.value)}
className="bg-gray-800 px-4 py-2 rounded"
/>

<button
onClick={addOrUpdateBudget}
className="bg-orange-500 px-4 py-2 rounded"
>
{editingBudgetId ? "Update" : "Add"}
</button>

</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

{budgets.map((b)=>{

const spent = expenses
.filter(e=>e.category===b.category)
.reduce((sum,e)=>sum+Number(e.amount),0);

const percent = Math.min((spent/b.limit)*100,100);

let color="bg-green-500";

if(percent>80) color="bg-red-500";
else if(percent>50) color="bg-orange-500";

return(

<div key={b.id} className="bg-gray-900 p-6 rounded-xl">

<div className="flex justify-between mb-2">

<h3>{b.category}</h3>

<div className="flex gap-3">

<button
onClick={()=>editBudget(b)}
className="text-blue-400"
>
Edit
</button>

<button
onClick={()=>deleteBudget(b.id)}
className="text-red-400"
>
Delete
</button>

</div>

</div>

<p className="text-gray-400 mb-2">
₹{spent} / ₹{b.limit}
</p>

<div className="w-full bg-gray-700 h-3 rounded">

<div
className={`${color} h-3 rounded`}
style={{width:`${percent}%`}}
></div>

</div>

</div>

);

})}

</div>

</div>

        {/* Expense List */}
        <div>
            <div className="flex gap-3 mb-4 flex-wrap">

  {["All", ...categories].map((cat) => (

    <button
      key={cat}
      onClick={() => setFilter(cat)}
      className={`px-4 py-1 rounded-full text-sm 
        ${filter === cat ? "bg-orange-500 text-white" : "bg-gray-800 text-gray-300"}`}
    >
      {cat}
    </button>

        ))}

          </div>
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 w-full md:w-80 p-2 rounded bg-gray-800 text-white"
          />

          <h2 className="text-2xl font-bold mb-6 text-orange-500">
            Recent Expenses
          </h2>

          <div className="bg-gray-900 rounded-xl p-6">

            {expenses.length === 0 ? (
              <p className="text-gray-400">No expenses added yet.</p>
            ) : (

              <table className="w-full">

                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-3">Date</th>
                    <th className="text-left">Amount</th>
                    <th className="text-left">Category</th>
                    <th className="text-left">Note</th>
                    <th className="text-left">Action</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredExpenses.map((expense, index) => (

                    <tr key={expense.id} className="border-b border-gray-800">
                      <td>{expense.date}</td>

                      <td className="py-3 text-orange-400">
                        ₹{expense.amount}
                      </td>

                      <td>{expense.category}</td>

                      <td>{expense.note}</td>

                      <td>
                        <div className="flex gap-3">
                            <button
                               onClick={() => handleEdit(expense)}
                               className="text-blue-400 hover:text-blue-600"
                          >
                              Edit
                          </button>
 
                         <button
                              onClick={() => handleDelete(expense.id)}
                              className="text-red-400 hover:text-red-600"
                    >
                            Delete
                       </button>

                        </div>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            )}

          </div>

        </div>

        {/* Pie Chart */}
        <div className="mt-12">

          <h2 className="text-2xl font-bold mb-6 text-orange-500">
            Expense Breakdown
          </h2>

          <div className="bg-gray-900 rounded-xl p-6 flex justify-center">

            {chartData.length === 0 ? (
              <p className="text-gray-400">Add expenses to see chart</p>
            ) : (

              <PieChart width={400} height={300}>

                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >

                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}

                </Pie>

                <Tooltip />
                <Legend />

              </PieChart>

            )}

          </div>

        </div>

        {/* Monthly Bar Graph */}
        <div className="mt-12">

          <h2 className="text-2xl font-bold mb-6 text-orange-500">
            Monthly Spending Trend
          </h2>

          <div className="bg-gray-900 rounded-xl p-6 flex justify-center">

            {monthlyData.length === 0 ? (
              <p className="text-gray-400">Add expenses to see graph</p>
            ) : (

              <BarChart width={500} height={300} data={monthlyData}>

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="name" />

                <YAxis />

                <Tooltip />

                <Bar
                  dataKey="amount"
                  fill="#f97316"
                  radius={[4,4,0,0]}
                />

              </BarChart>

            )}

          </div>

        </div>

      </div>

      {/* Modal */}
      {showModal && (

        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">

          <div className="bg-gray-900 p-8 rounded-xl w-96">

            <h2 className="text-2xl font-bold text-orange-500 mb-6">
              Add Expense
            </h2>
           <input
  type="date"
  value={date}
  onChange={(e) => {
    setDate(e.target.value);
    setErrors({ ...errors, date: "" });
  }}
  className="w-full p-2 rounded bg-gray-800 text-white mb-2"
/>

{errors.date && (
  <p className="text-red-400 text-sm mb-3">{errors.date}</p>
)}

           <input
  type="number"
  placeholder="Amount"
  value={amount}
  onChange={(e) => {
    setAmount(e.target.value);
    setErrors({ ...errors, amount: "" });
  }}
  className="w-full p-2 rounded bg-gray-800 text-white mb-2"
/>

{errors.amount && (
  <p className="text-red-400 text-sm mb-3">{errors.amount}</p>
)}
           <select
  value={category}
  onChange={(e) => {
    setCategory(e.target.value);
    setErrors({ ...errors, category: "" });
  }}
  className="w-full p-2 rounded bg-gray-800 text-white mb-2"
>

<option value="">Select Category</option>

{categories.map((cat) => (
<option key={cat} value={cat}>
{cat}
</option>
))}

</select>

{errors.category && (
  <p className="text-red-400 text-sm mb-3">{errors.category}</p>
)}
            <input
              type="text"
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full mb-4 p-2 rounded bg-gray-800 text-white"
            />

            <div className="flex justify-between">

              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-700 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-4 py-2 bg-orange-500 rounded"
              >
                Save
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default Dashboard;
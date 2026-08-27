function DashboardCard({ title, amount }) {
  return (
    <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800">
      <h2 className="text-gray-400 text-sm">{title}</h2>

      <p className="text-2xl font-bold text-orange-500 mt-2">
        ₹{amount}
      </p>
    </div>
  );
}

export default DashboardCard;
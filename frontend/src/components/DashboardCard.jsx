function DashboardCard({ title, amount, subtitle, icon: Icon, accentColor = "text-orange-500", onAction, actionText }) {
  return (
    <div className="bg-gray-900 p-6 rounded-2xl shadow-xl border border-gray-800/80 hover:border-gray-700/80 transition flex flex-col justify-between relative group">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-gray-400 text-sm font-medium">{title}</h2>
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-gray-800/80 flex items-center justify-center text-gray-400 group-hover:text-orange-400 transition">
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <p className={`text-3xl font-extrabold ${accentColor} tracking-tight mt-1`}>
          ₹{typeof amount === "number" ? amount.toLocaleString("en-IN") : amount}
        </p>

        {subtitle && (
          <p className="text-xs text-gray-400 mt-2 font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {onAction && actionText && (
        <div className="mt-4 pt-3 border-t border-gray-800 flex justify-end">
          <button
            onClick={onAction}
            className="text-xs text-orange-400 hover:text-orange-300 font-semibold transition cursor-pointer"
          >
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
}

export default DashboardCard;
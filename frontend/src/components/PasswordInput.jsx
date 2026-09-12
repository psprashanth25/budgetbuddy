import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = "••••••••",
  required = false,
  className = "",
  autoComplete,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="relative w-full">
      <input
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={`w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition ${className}`}
      />
      <button
        id={id ? `${id}-toggle-btn` : undefined}
        type="button"
        onClick={toggleVisibility}
        aria-label={showPassword ? "Hide password" : "Show password"}
        title={showPassword ? "Hide password" : "Show password"}
        data-testid={id ? `${id}-toggle` : "password-toggle"}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-orange-400 hover:bg-gray-700/50 transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500"
      >
        {showPassword ? (
          <EyeOff className="w-4 h-4 text-orange-400" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

export default PasswordInput;

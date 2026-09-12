const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

// ==================== AUTH API ====================
export const authApi = {
  register: async (userData) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },

  verifyOtp: async ({ email, otp }) => {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    return handleResponse(res);
  },

  resendOtp: async ({ email }) => {
    const res = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  login: async (credentials) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        signal: controller.signal,
      });
      return await handleResponse(res);
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error("Login request timed out. Please check if the server is running and try again.");
      }
      if (err.message && err.message.toLowerCase().includes("failed to fetch")) {
        throw new Error("Unable to connect to the server. Please make sure the backend is running.");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  forgotPassword: async ({ email }) => {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  resetPassword: async ({ token, newPassword, confirmPassword }) => {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  setInitialBalance: async (initialBankBalance) => {
    const res = await fetch(`${API_BASE_URL}/auth/balance-setup`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ initialBankBalance }),
    });
    return handleResponse(res);
  },

  updateSalary: async (monthlySalary) => {
    const res = await fetch(`${API_BASE_URL}/auth/salary`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ monthlySalary }),
    });
    return handleResponse(res);
  },
};

// ==================== CATEGORIES API ====================
export const categoryApi = {
  getCategories: async () => {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  addCategory: async (categoryData) => {
    const res = await fetch(`${API_BASE_URL}/categories`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(categoryData),
    });
    return handleResponse(res);
  },

  deleteCategory: async (id) => {
    const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// ==================== EXPENSES API ====================
export const expenseApi = {
  getExpenses: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.year) query.append("year", params.year);
    if (params.month) query.append("month", params.month);
    if (params.category && params.category !== "All") query.append("category", params.category);
    if (params.search) query.append("search", params.search);
    if (params.sortBy) query.append("sortBy", params.sortBy);
    if (params.order) query.append("order", params.order);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/expenses${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  addExpense: async (expenseData) => {
    const res = await fetch(`${API_BASE_URL}/expenses`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(expenseData),
    });
    return handleResponse(res);
  },

  updateExpense: async (id, expenseData) => {
    const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(expenseData),
    });
    return handleResponse(res);
  },

  deleteExpense: async (id) => {
    const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// ==================== MONTHLY RECORD API ====================
export const monthlyRecordApi = {
  getMonthlyRecord: async (year, month) => {
    const res = await fetch(`${API_BASE_URL}/monthly-records/${year}/${month}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  setMonthlyRecord: async (year, month, data) => {
    const res = await fetch(`${API_BASE_URL}/monthly-records/${year}/${month}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getAllRecords: async () => {
    const res = await fetch(`${API_BASE_URL}/monthly-records`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// ==================== BUDGET API ====================
export const budgetApi = {
  getBudgets: async () => {
    const res = await fetch(`${API_BASE_URL}/budgets`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  addOrUpdateBudget: async (budgetData) => {
    const res = await fetch(`${API_BASE_URL}/budgets`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(budgetData),
    });
    return handleResponse(res);
  },

  deleteBudget: async (id) => {
    const res = await fetch(`${API_BASE_URL}/budgets/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// ==================== DASHBOARD API ====================
export const dashboardApi = {
  getSummary: async (year, month) => {
    const query = new URLSearchParams();
    if (year) query.append("year", year);
    if (month) query.append("month", month);
    const queryString = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/dashboard/summary${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// ==================== REPORT API ====================
export const reportApi = {
  getSummary: async () => {
    const res = await fetch(`${API_BASE_URL}/reports/summary`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getMonthDetail: async (year, month) => {
    const res = await fetch(`${API_BASE_URL}/reports/month-detail/${year}/${month}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

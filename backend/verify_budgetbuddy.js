const http = require("http");
const fs = require("fs");
const path = require("path");

const httpAgent = new http.Agent({ keepAlive: true });

const request = (reqPath, method = "GET", body = null, token = null, retries = 3) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "localhost",
      port: 5000,
      path: reqPath,
      method,
      agent: httpAgent,
      headers: {
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => (responseBody += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, text: responseBody });
        }
      });
    });

    req.on("error", async (err) => {
      if (retries > 0 && (err.code === "ECONNRESET" || err.code === "ECONNREFUSED")) {
        await new Promise((r) => setTimeout(r, 150));
        return resolve(request(reqPath, method, body, token, retries - 1));
      }
      reject(err);
    });

    if (data) req.write(data);
    req.end();
  });
};

const getOutbox = () => {
  const outboxPath = path.join(__dirname, "data/.email_outbox.json");
  if (fs.existsSync(outboxPath)) {
    try {
      return JSON.parse(fs.readFileSync(outboxPath, "utf-8"));
    } catch (e) {
      return [];
    }
  }
  return [];
};

const getLatestOtpForEmail = (email) => {
  const outbox = getOutbox();
  const item = outbox.find(
    (m) => m.type === "otp" && m.email.toLowerCase() === email.toLowerCase()
  );
  return item ? item.otp : null;
};

const getLatestResetTokenForEmail = (email) => {
  const outbox = getOutbox();
  const item = outbox.find(
    (m) => m.type === "reset" && m.email.toLowerCase() === email.toLowerCase()
  );
  if (!item || !item.resetUrl) return null;
  const match = item.resetUrl.match(/token=([a-f0-9]+)/i);
  return match ? match[1] : null;
};

const runVerification = async () => {
  console.log("======================================================================");
  console.log("       BudgetBuddy Comprehensive Automated Verification Suite         ");
  console.log("======================================================================");

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, detail = "") => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `-> Details: ${detail}` : ""}`);
      failed++;
    }
  };

  try {
    // -------------------------------------------------------------------------
    // 0. Genuine MongoDB Atlas Connection
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 0: DATABASE CONNECTIVITY ---");
    const health = await request("/", "GET");
    assert(
      health.status === 200 &&
        health.data.database &&
        health.data.database.isMongoConnected === true &&
        health.data.database.mode === "MongoDB",
      "0. Genuine MongoDB Atlas connection confirmed",
      `Host: ${health.data.database?.host}, Database: ${health.data.database?.database}`
    );

    // -------------------------------------------------------------------------
    // 1. Authentication & Security: Registration Without Salary + OTP Verification
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 1: REGISTRATION & EMAIL OTP VERIFICATION ---");
    const testEmail = `student_${Date.now()}@hostel.edu`;

    // 1a. Validate registration fields (confirm password mismatch)
    const badReg = await request("/api/auth/register", "POST", {
      name: "Aakash Gupta",
      email: testEmail,
      password: "password123",
      confirmPassword: "mismatchpassword",
    });
    assert(
      badReg.status === 400 && badReg.data.message.includes("match"),
      "1a. Registration rejects mismatched confirm password"
    );

    // 1b. Successful registration without any salary field
    const regRes = await request("/api/auth/register", "POST", {
      name: "Aakash Gupta",
      email: testEmail,
      password: "password123",
      confirmPassword: "password123",
    });
    assert(
      regRes.status === 201 &&
        regRes.data.requiresOtp === true &&
        !regRes.data.token,
      "1b. Registration succeeds without salary fields and requires email OTP activation"
    );

    // 1c. Attempt login before email verification -> Must be rejected
    const unverifiedLogin = await request("/api/auth/login", "POST", {
      email: testEmail,
      password: "password123",
    });
    assert(
      unverifiedLogin.status === 403 &&
        unverifiedLogin.data.requiresOtp === true,
      "1c. Unverified user cannot log in before verifying OTP"
    );

    // 1d. Retrieve OTP from dev outbox
    const otp = getLatestOtpForEmail(testEmail);
    assert(Boolean(otp && otp.length === 6), "1d. 6-digit OTP generated securely and stored");

    // 1e. Submit incorrect OTP -> rejected
    const badOtpRes = await request("/api/auth/verify-otp", "POST", {
      email: testEmail,
      otp: "999999",
    });
    assert(
      badOtpRes.status === 400 && badOtpRes.data.message.includes("Invalid"),
      "1e. Invalid OTP rejected with attempt counter"
    );

    // 1f. Resend OTP cooldown test (within 60s)
    const resendCooldownRes = await request("/api/auth/resend-otp", "POST", {
      email: testEmail,
    });
    assert(
      resendCooldownRes.status === 429 &&
        resendCooldownRes.data.message.includes("wait"),
      "1f. Resend OTP enforces 60-second cooldown period"
    );

    // 1g. Verify correct OTP -> activates account & receives JWT token
    const verifyRes = await request("/api/auth/verify-otp", "POST", {
      email: testEmail,
      otp,
    });
    assert(
      verifyRes.status === 200 && Boolean(verifyRes.data.token),
      "1g. Valid OTP activates account and issues JWT authentication token"
    );
    let token = verifyRes.data.token;

    // 1h. Verify subsequent login succeeds
    const loginRes = await request("/api/auth/login", "POST", {
      email: testEmail,
      password: "password123",
    });
    assert(
      loginRes.status === 200 && Boolean(loginRes.data.token),
      "1h. Activated user logs in successfully"
    );
    token = loginRes.data.token;

    // -------------------------------------------------------------------------
    // 2. Forgot Password & Password Reset Flow
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 2: FORGOT PASSWORD & RESET FLOW ---");

    // 2a. Request forgot password link
    const forgotRes = await request("/api/auth/forgot-password", "POST", {
      email: testEmail,
    });
    assert(
      forgotRes.status === 200 &&
        forgotRes.data.message.includes("If an account exists"),
      "2a. Forgot password returns safe anti-enumeration confirmation message"
    );

    const resetToken = getLatestResetTokenForEmail(testEmail);
    assert(Boolean(resetToken), "2b. Secure single-use password reset token generated");

    // 2c. Reset with invalid/mismatched password
    const badResetRes = await request("/api/auth/reset-password", "POST", {
      token: resetToken,
      newPassword: "newpassword456",
      confirmPassword: "wrongpassword",
    });
    assert(
      badResetRes.status === 400 && badResetRes.data.message.includes("match"),
      "2c. Password reset rejects mismatched passwords"
    );

    // 2d. Reset with valid password
    const validResetRes = await request("/api/auth/reset-password", "POST", {
      token: resetToken,
      newPassword: "newpassword456",
      confirmPassword: "newpassword456",
    });
    assert(
      validResetRes.status === 200 &&
        validResetRes.data.message.includes("successful"),
      "2d. Password successfully reset using single-use token"
    );

    // 2e. Reusing the reset token must fail (single-use prevention)
    const reuseResetRes = await request("/api/auth/reset-password", "POST", {
      token: resetToken,
      newPassword: "anotherpassword789",
      confirmPassword: "anotherpassword789",
    });
    assert(
      reuseResetRes.status === 400 &&
        reuseResetRes.data.message.includes("Invalid or expired"),
      "2e. Reusing the same reset token is strictly prevented"
    );

    // 2f. Log in with new password
    const newLoginRes = await request("/api/auth/login", "POST", {
      email: testEmail,
      password: "newpassword456",
    });
    assert(
      newLoginRes.status === 200 && Boolean(newLoginRes.data.token),
      "2f. User successfully logs in with updated password"
    );
    token = newLoginRes.data.token;

    // -------------------------------------------------------------------------
    // 3. New Financial Model: Initial Bank Balance Setup
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 3: CURRENT BANK BALANCE & ONBOARDING ---");

    // 3a. Verify onboarding status before setup
    const meBefore = await request("/api/auth/me", "GET", null, token);
    assert(
      meBefore.status === 200 &&
        meBefore.data.user.hasCompletedBalanceSetup === false,
      "3a. Initial state indicates financial balance setup pending"
    );

    // 3b. Reject negative initial balance
    const badBalRes = await request("/api/auth/balance-setup", "POST", {
      initialBankBalance: -100,
    }, token);
    assert(
      badBalRes.status === 400,
      "3b. Negative initial bank balance is rejected"
    );

    // 3c. Set initial bank balance = 5000 (includes current pocket money)
    const setBalRes = await request("/api/auth/balance-setup", "POST", {
      initialBankBalance: 5000,
    }, token);
    assert(
      setBalRes.status === 200 &&
        setBalRes.data.user.hasCompletedBalanceSetup === true &&
        setBalRes.data.user.currentBankBalance === 5000,
      "3c. First-time onboarding sets Current Bank Balance = ₹5,000"
    );

    // -------------------------------------------------------------------------
    // 4. Calendar & Date Restrictions (No Future Transactions)
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 4: CALENDAR & DATE RESTRICTIONS ---");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const todayStr = new Date().toISOString().split("T")[0];

    // 4a. Attempt creating an expense with tomorrow's date -> rejected
    const futureExpRes = await request("/api/expenses", "POST", {
      date: tomorrowStr,
      amount: 250,
      category: "Food",
      note: "Future snack",
    }, token);
    assert(
      futureExpRes.status === 400 &&
        futureExpRes.data.message.includes("Future dates are not allowed"),
      "4a. Backend strictly rejects future transaction dates (HTTP 400)"
    );

    // 4b. Creating an expense with today's date -> allowed
    const todayExpRes = await request("/api/expenses", "POST", {
      date: todayStr,
      amount: 200,
      category: "Food",
      note: "Lunch mess",
    }, token);
    assert(
      todayExpRes.status === 201 && todayExpRes.data.data.amount === 200,
      "4b. Today's date is valid and successfully recorded"
    );

    // -------------------------------------------------------------------------
    // 5. Hierarchical Category & Subcategory System
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 5: CATEGORY HIERARCHY & PROTECTION ---");

    // 5a. Verify system default categories are seeded and protected
    const catListRes = await request("/api/categories", "GET", null, token);
    const defaultCategories = catListRes.data.data.filter((c) => c.isDefault);
    assert(
      defaultCategories.length >= 6,
      "5a. Default system categories (Food, Travel, Shopping, Bills, Entertainment, Other) present"
    );

    // 5b. Attempting to delete a default system category is rejected
    const foodCat = defaultCategories.find((c) => c.name === "Food");
    const delSystemRes = await request(`/api/categories/${foodCat._id}`, "DELETE", null, token);
    assert(
      delSystemRes.status === 400 &&
        delSystemRes.data.message.includes("System default categories cannot be deleted"),
      "5b. System default categories cannot be deleted"
    );

    // 5c. Create top-level category "Trip"
    const tripCatRes = await request("/api/categories", "POST", {
      name: "Trip",
      color: "#10b981",
      icon: "MapPin",
    }, token);
    assert(
      tripCatRes.status === 201 && tripCatRes.data.data.name === "Trip",
      "5c. User can create top-level category 'Trip'"
    );
    const tripId = tripCatRes.data.data._id;

    // 5d. Create subcategory "Trip" -> "Transport"
    const transportCatRes = await request("/api/categories", "POST", {
      name: "Transport",
      parentId: tripId,
    }, token);
    assert(
      transportCatRes.status === 201 &&
        transportCatRes.data.data.path === "Trip / Transport",
      "5d. User can create subcategory 'Trip / Transport'"
    );
    const transportId = transportCatRes.data.data._id;

    // 5e. Create deep sub-subcategory "Trip" -> "Transport" -> "Flight" (Unlimited nesting)
    const flightCatRes = await request("/api/categories", "POST", {
      name: "Flight",
      parentId: transportId,
    }, token);
    assert(
      flightCatRes.status === 201 &&
        flightCatRes.data.data.path === "Trip / Transport / Flight",
      "5e. User can create deeply nested subcategory 'Trip / Transport / Flight'"
    );
    const flightId = flightCatRes.data.data._id;

    // 5f. Retrieve category tree
    const treeRes = await request("/api/categories/tree", "GET", null, token);
    const tripTree = treeRes.data.data.find((c) => c.name === "Trip");
    assert(
      Boolean(
        tripTree &&
          tripTree.children &&
          tripTree.children[0]?.name === "Transport" &&
          tripTree.children[0]?.children[0]?.name === "Flight"
      ),
      "5f. Category tree endpoint returns recursive hierarchy"
    );

    // 5g. Add expense using nested category "Flight"
    const flightExpRes = await request("/api/expenses", "POST", {
      date: todayStr,
      amount: 1500,
      category: "Trip / Transport / Flight",
      note: "Hostel vacation flight ticket",
    }, token);
    assert(
      flightExpRes.status === 201 && flightExpRes.data.data.amount === 1500,
      "5g. Expense created under nested category 'Flight'"
    );
    const flightExpId = flightExpRes.data.data._id;

    // 5h. Safe deletion check: attempting to delete parent category "Trip" or "Transport"
    // while descendant has expenses must be blocked!
    const delParentRes = await request(`/api/categories/${tripId}`, "DELETE", null, token);
    assert(
      delParentRes.status === 400 &&
        delParentRes.data.message.includes("cannot be deleted because"),
      "5h. Deletion of parent category blocked when descendants have active expenses"
    );

    // -------------------------------------------------------------------------
    // 6. Pocket Money Allocation, Exhaustion & Analytics Mode Switching
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 6: POCKET MONEY & DUAL ANALYTICS MODES ---");

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    // Initial Bank Balance was 5000.
    // Expenses so far: 200 (Lunch) + 1500 (Flight) = 1700.
    // Bank balance is currently: 5000 - 1700 = 3300.

    // 6a. Add new pocket money for current month: ₹500
    // Business rule: Adds to current bank balance (3300 + 500 = 3800)
    const setPmRes = await request(
      `/api/monthly-records/${curYear}/${curMonth}`,
      "POST",
      { pocketMoney: 500 },
      token
    );
    assert(
      setPmRes.status === 200 &&
        setPmRes.data.data.pocketMoney === 500 &&
        setPmRes.data.currentBankBalance === 3800,
      "6a. Monthly pocket money (₹500) increments Current Bank Balance to ₹3,800"
    );

    // 6b. Check Dashboard analytics basis
    // Current month expenses: 1700 total. Pocket money is 500. Total spent (1700) > 500,
    // so pocket money is already exhausted!
    const dashExhausted = await request("/api/dashboard/summary", "GET", null, token);
    assert(
      dashExhausted.data.data.analytics.activeMode === "bankBalance" &&
        dashExhausted.data.data.analytics.isPocketMoneyExhausted === true &&
        dashExhausted.data.data.analytics.pocketMoneyRemaining === 0,
      "6b. Dashboard detects pocket money exhaustion and shifts activeMode to 'bankBalance'"
    );
    assert(
      dashExhausted.data.data.analytics.exhaustionNotification.includes(
        "Your pocket money for this month is exhausted"
      ) &&
        dashExhausted.data.data.analytics.modeNotification.includes(
          "From now on, your analysis is shifting to be based on your total balance"
        ),
      "6c. Dashboard includes exact required exhaustion notification strings"
    );

    // 6d. Increase pocket money to ₹3,000 so pocket money exceeds current month expenses (1700)
    // Balance increases by difference: 3000 - 500 = +2500 -> 3800 + 2500 = 6300.
    const addMorePm = await request(
      `/api/monthly-records/${curYear}/${curMonth}`,
      "POST",
      { pocketMoney: 3000 },
      token
    );
    assert(
      addMorePm.status === 200 &&
        addMorePm.data.currentBankBalance === 6300,
      "6d. Updating pocket money to ₹3,000 adds difference to bank balance (₹6,300)"
    );

    // 6e. Dashboard should revert to 'pocketMoney' mode
    const dashActive = await request("/api/dashboard/summary", "GET", null, token);
    assert(
      dashActive.data.data.analytics.activeMode === "pocketMoney" &&
        dashActive.data.data.analytics.isPocketMoneyExhausted === false &&
        dashActive.data.data.analytics.pocketMoneyRemaining === 1300, // 3000 - 1700 = 1300
      "6e. Dashboard reverts analytics mode to 'pocketMoney' with ₹1,300 remaining"
    );
    assert(
      dashActive.data.data.analytics.reversionNotification ===
        "Analysis reverted to pocket money available basis",
      "6f. Exact reversion message 'Analysis reverted to pocket money available basis' present"
    );

    // -------------------------------------------------------------------------
    // 7. Overspending Beyond Total Bank Balance Prevention
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 7: OVERSPENDING PREVENTION ---");
    // Current bank balance is 6300. Attempt expense of 10000.
    const overspendRes = await request("/api/expenses", "POST", {
      date: todayStr,
      amount: 10000,
      category: "Shopping",
      note: "Expensive laptop",
    }, token);
    assert(
      overspendRes.status === 400 &&
        overspendRes.data.message.includes("Insufficient bank balance"),
      "7. Expense exceeding total available bank balance is rejected (prevents negative balance)"
    );

    // -------------------------------------------------------------------------
    // 8. Expense Editing, Deletion & Balance Recalculation
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 8: EXPENSE EDIT/DELETE BALANCE INTEGRITY ---");
    // Flight expense was 1500. Edit to 1200 (-300 spent -> +300 balance: 6300 -> 6600).
    const editFlightRes = await request(`/api/expenses/${flightExpId}`, "PUT", {
      date: todayStr,
      amount: 1200,
      category: "Trip / Transport / Flight",
      note: "Discounted flight ticket",
    }, token);
    assert(
      editFlightRes.status === 200 && editFlightRes.data.data.amount === 1200,
      "8a. Expense successfully edited to ₹1,200"
    );

    const dashAfterEdit = await request("/api/dashboard/summary", "GET", null, token);
    assert(
      dashAfterEdit.data.data.financials.currentBankBalance === 6600,
      "8b. Bank balance dynamically reflects reversed and updated expense (₹6,600)"
    );

    // Delete flight expense -> restores ₹1,200 -> balance becomes 6600 + 1200 = 7800.
    const delFlightRes = await request(`/api/expenses/${flightExpId}`, "DELETE", null, token);
    assert(delFlightRes.status === 200, "8c. Flight expense deleted");

    const dashAfterDel = await request("/api/dashboard/summary", "GET", null, token);
    assert(
      dashAfterDel.data.data.financials.currentBankBalance === 7800,
      "8d. Deleting expense restores funds to Current Bank Balance (₹7,800)"
    );

    // Now category "Trip" and descendants have no active expenses -> safe deletion works!
    const delTripRes = await request(`/api/categories/${tripId}`, "DELETE", null, token);
    assert(
      delTripRes.status === 200,
      "8e. Category and descendants safely deleted when no expenses remain"
    );

    // -------------------------------------------------------------------------
    // 9. Dashboard Widgets: Recent Expenses Limit (Max 10)
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 9: DASHBOARD WIDGETS & LIMITS ---");

    // Add 12 expenses to test the 10-limit cap
    for (let i = 1; i <= 12; i++) {
      await request("/api/expenses", "POST", {
        date: todayStr,
        amount: 10 + i,
        category: "Food",
        note: `Test item ${i}`,
      }, token);
    }

    const dashLimitRes = await request("/api/dashboard/summary", "GET", null, token);
    const recentExpenses = dashLimitRes.data.data.recentExpenses;
    assert(
      recentExpenses.length === 10,
      "9a. Dashboard Recent Expenses strictly capped at a maximum of 10 items"
    );

    const allExpensesRes = await request("/api/expenses", "GET", null, token);
    assert(
      allExpensesRes.data.data.length >= 13,
      "9b. Dedicated Expenses endpoint retains full expense history (13+ records)"
    );

    // -------------------------------------------------------------------------
    // 10. Summary & Completion
    // -------------------------------------------------------------------------
    console.log("\n======================================================================");
    console.log(`Verification Complete! Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
    if (failed === 0) {
      console.log("ALL TESTS PASSED WITH 100% SUCCESS!");
    } else {
      console.error(`ATTENTION: ${failed} test(s) failed. Review output above.`);
    }
    console.log("======================================================================\n");
  } catch (err) {
    console.error("Verification suite encountered unexpected error:", err);
  }
};

runVerification();

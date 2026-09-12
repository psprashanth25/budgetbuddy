import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generate and download an executive-grade printable A4 Financial Statement PDF.
 * Strictly adheres to the current Dashboard financial logic:
 * - Current Bank Balance (Total available across bank account & savings)
 * - This Month's Pocket Money (Allocated for selected month)
 * - Total Spent This Month (Sum of verified expenses)
 * - Remaining Pocket Money (Math.max(0, pocketMoney - totalSpent))
 * - Analysis Mode: "Pocket Money Available" vs "Total Bank Balance"
 *
 * @param {Object} data - The month report data object returned by the backend.
 */
export function downloadReportPDF(data) {
  if (!data) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const currencySymbol = "Rs."; // Printable ASCII safe representation for PDF engines
  const fmt = (num) => `${currencySymbol} ${(Number(num) || 0).toLocaleString("en-IN")}`;

  const financials = data.financials || data;
  const isPocketMoneyMode = financials.analyticsMode === "pocketMoney";
  const isExhausted = financials.isPocketMoneyExhausted && financials.pocketMoney > 0;

  // 1. Top Brand Stripe
  doc.setFillColor(249, 115, 22); // Orange #f97316
  doc.rect(0, 0, pageWidth, 4, "F");

  // 2. Header Section
  let cursorY = 14;

  // Brand Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(26, 32, 44);
  doc.text("BudgetBuddy", margin, cursorY);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(234, 88, 12); // Deep orange
  doc.text("MONTHLY FINANCIAL STATEMENT", margin, cursorY + 5);

  // Statement Period & Active Analysis Mode
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Statement Period: ${data.label || `${data.monthName} ${data.year}`}`, margin, cursorY + 9.5);

  // Active Mode Badge text
  doc.setFont("helvetica", "bold");
  if (isPocketMoneyMode) {
    doc.setTextColor(22, 101, 52); // Emerald
    doc.text("• Analysis basis: Pocket Money Available", margin, cursorY + 14);
  } else {
    doc.setTextColor(180, 83, 9); // Amber
    doc.text("• Analysis basis: Total Bank Balance", margin, cursorY + 14);
  }

  // Right Metadata Block
  const rightX = pageWidth - margin;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(data.userName || "Hostel Student", rightX, cursorY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  if (data.userEmail) {
    doc.text(data.userEmail, rightX, cursorY + 4.5, { align: "right" });
  }
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  doc.text(`Generated: ${generatedDate}`, rightX, cursorY + 9, { align: "right" });
  doc.text(`Ref: BB-${data.year}-${String(data.month).padStart(2, "0")}`, rightX, cursorY + 13.5, { align: "right" });

  // Divider Line
  cursorY += 18;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);

  cursorY += 6;

  // 3. Financial Ledger Summary Table (Mirrors Dashboard Cards exactly)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("1. FINANCIAL SUMMARY (DASHBOARD RECONCILIATION)", margin, cursorY);

  cursorY += 3;

  const remainingMoney = isPocketMoneyMode
    ? (financials.remainingPocketMoney || 0)
    : (financials.currentBankBalance || 0);

  const isPending = !!financials.isPocketMoneyPending;
  const summaryBody = [
    [
      "Current Bank Balance",
      financials.openingBalance !== undefined
        ? `Total available (Carried forward: ${fmt(financials.openingBalance)})`
        : "Total available across bank account & savings",
      fmt(financials.currentBankBalance),
    ],
    [
      "This Month's Pocket Money",
      isPending
        ? "Status: Pending user input for this month"
        : isExhausted
        ? `Allocated for month (${financials.entryStatus === "late" ? "Entered Late" : "Entered On-Time"}, Exhausted)`
        : `Allocated for month (${financials.entryStatus === "late" ? "Entered Late" : "Entered On-Time"})`,
      isPending ? `${fmt(0)} (Pending)` : fmt(financials.pocketMoney),
    ],
    [
      "Total Spent This Month",
      `${data.monthName || "Month"} total verified expenses (${data.expenses ? data.expenses.length : 0} transactions)`,
      fmt(financials.totalSpent),
    ],
    [
      isPocketMoneyMode ? "Remaining Pocket Money" : "Available Bank Balance",
      isPocketMoneyMode
        ? "Pocket money remaining for monthly expenditures"
        : isPending
        ? "Pocket money pending; spending deducted from bank savings"
        : "Pocket money exhausted; spendings deducted from bank savings",
      fmt(remainingMoney),
    ],
    [
      "Monthly Balance Reconciliation",
      `Opening (${fmt(financials.openingBalance || 0)}) + Pocket Money (${isPending ? fmt(0) : fmt(financials.pocketMoney || 0)}) - Spent (${fmt(financials.totalSpent || 0)})`,
      fmt(
        financials.closingBalance !== undefined
          ? financials.closingBalance
          : Math.max(0, (financials.openingBalance || 0) + (isPending ? 0 : financials.pocketMoney || 0) - (financials.totalSpent || 0))
      ),
    ],
  ];

  if (financials.salary || financials.monthlySalary) {
    summaryBody.push([
      "Monthly Salary (Reference)",
      "Base regular income profile parameter (informational)",
      fmt(financials.salary || financials.monthlySalary),
    ]);
  }

  autoTable(doc, {
    startY: cursorY,
    head: [["Financial Metric", "System Description / Accounting Basis", "Amount"]],
    body: summaryBody,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 54 },
      1: { textColor: [100, 116, 139] },
      2: { fontStyle: "bold", halign: "right", cellWidth: 42 },
    },
    didParseCell: function (cellData) {
      // Highlight Remaining Money row (Row 3)
      if (cellData.row.index === 3) {
        if (remainingMoney > 0) {
          cellData.cell.styles.fillColor = [220, 252, 231]; // Soft emerald
          cellData.cell.styles.textColor = [22, 101, 52];
        } else {
          cellData.cell.styles.fillColor = [254, 226, 226]; // Soft red
          cellData.cell.styles.textColor = [153, 27, 27];
        }
      }
    },
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  // 4. Category-wise Spending Breakdown Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("2. CATEGORY SPENDING BREAKDOWN", margin, cursorY);

  cursorY += 3;

  const chartData = data.chartData || [];
  let categoryBody = [];

  if (chartData.length > 0) {
    categoryBody = chartData.map((cat) => [
      cat.name,
      fmt(cat.value),
      `${cat.percentage || Math.round(((cat.value || 0) / (financials.totalSpent || 1)) * 100)}%`,
    ]);
    categoryBody.push([
      "Total Categorized Spending",
      fmt(financials.totalSpent),
      "100%",
    ]);
  } else {
    categoryBody = [["No expenses recorded for this month", fmt(0), "0%"]];
  }

  autoTable(doc, {
    startY: cursorY,
    head: [["Category", "Total Spent", "Share of Spending"]],
    body: categoryBody,
    theme: "striped",
    headStyles: {
      fillColor: [249, 115, 22],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 2.2,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { fontStyle: "normal" },
      1: { fontStyle: "bold", halign: "right", cellWidth: 45 },
      2: { halign: "right", cellWidth: 35 },
    },
    didParseCell: function (cellData) {
      if (chartData.length > 0 && cellData.row.index === categoryBody.length - 1) {
        cellData.cell.styles.fontStyle = "bold";
        cellData.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  // 5. Itemized Expense Transactions Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("3. ITEMIZED EXPENSE TRANSACTIONS", margin, cursorY);

  cursorY += 3;

  const expenses = data.expenses || [];
  let transactionBody = [];

  if (expenses.length > 0) {
    transactionBody = expenses.map((exp, idx) => {
      const d = new Date(exp.date);
      const dateStr = !isNaN(d.getTime())
        ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "-";
      return [
        String(idx + 1),
        dateStr,
        exp.category || "Uncategorized",
        exp.note || "-",
        fmt(exp.amount),
      ];
    });
  } else {
    transactionBody = [["-", "-", "No expenses recorded", "No expenses incurred in this billing period", fmt(0)]];
  }

  autoTable(doc, {
    startY: cursorY,
    head: [["#", "Date", "Category", "Description / Note", "Amount"]],
    body: transactionBody,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 2.2,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center", textColor: [100, 116, 139] },
      1: { cellWidth: 26 },
      2: { cellWidth: 34, fontStyle: "bold" },
      3: {},
      4: { cellWidth: 34, halign: "right", fontStyle: "bold" },
    },
    foot:
      expenses.length > 0
        ? [["", "", "", "Total Verified Expenditure:", fmt(financials.totalSpent)]]
        : undefined,
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 8.5,
      cellPadding: 2.5,
      halign: "right",
    },
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  // 6. Statement Insights & Explanations Box
  if (cursorY > pageHeight - 38) {
    doc.addPage();
    cursorY = 16;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, contentWidth, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Accounting Insights & Observations:", margin + 4, cursorY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const modeNote = isPocketMoneyMode
    ? `• Analysis Mode: Pocket Money Available (${fmt(financials.remainingPocketMoney)} remaining of ${fmt(financials.pocketMoney)} allocated).`
    : isExhausted
    ? `• Status: Pocket money exhausted (${fmt(financials.totalSpent)} spent vs ${fmt(financials.pocketMoney)} allocated). Spendings deducted from bank savings.`
    : `• Analysis Mode: Total Bank Balance basis (no pocket money allocated for this period).`;

  const highestNote = data.highestCategory
    ? `• Highest spending category: ${data.highestCategory} (${fmt(data.highestAmount)}, ${Math.round(((data.highestAmount || 0) / (financials.totalSpent || 1)) * 100)}% of total).`
    : "• No expense expenditures recorded for this month.";

  let compNote = "• Prior month comparison: No previous month spending history recorded.";
  if (data.comparison && data.comparison.hasPreviousData) {
    const diffText = data.comparison.isHigher
      ? `Spent ${fmt(data.comparison.difference)} (+${data.comparison.percentChange}%) more than ${data.comparison.prevMonthLabel}`
      : `Spent ${fmt(Math.abs(data.comparison.difference))} (${data.comparison.percentChange}%) less than ${data.comparison.prevMonthLabel}`;
    compNote = `• Month-over-month: ${diffText}.`;
  }

  doc.text(modeNote, margin + 4, cursorY + 10);
  doc.text(highestNote, margin + 4, cursorY + 15);
  doc.text(compNote, margin + 4, cursorY + 20);

  // 7. Dynamic Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Confidential • Generated by BudgetBuddy Personal Finance Tracker", margin, pageHeight - 6);

    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 6, {
      align: "right",
    });
  }

  const cleanMonth = (data.monthName || "Month").replace(/\s+/g, "");
  doc.save(`BudgetBuddy-${cleanMonth}-${data.year}-Statement.pdf`);
}

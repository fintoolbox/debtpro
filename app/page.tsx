"use client";

import { useState, useMemo, useEffect, useCallback, type ChangeEvent } from "react";
import EmailLink from "./components/EmailLink";
import {
  runDebtProSimulation,
  type BaseInputs,
  type TipInputs,
  type YearState,
} from "../lib/debtProEngine";

// Charts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Title
);

/* Utility functions */
function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}%`;
}

/* Tip data */
type Strategy = {
  id: number;
  title: string;
  summary: string; // The main explanation/concept
  actions?: string[]; // Optional: For strategies that involve a list of actionable steps
  impact: string; // The benefit, key takeaway, or warning/disclaimer
};


const TIPS: Strategy[] = [
  {
    id: 1,
    title: "Find savings in your budget and apply to your home loan",
    summary:
      "The most direct way to attack your mortgage principal is by committing to regular extra repayments. Start by reviewing your budget to find a consistent surplus to direct to your home loan.",
    actions: [
      "Trim non-essential spending (e.g., Uber eats, regular takeaway or impulsive purchases).",
      "Cancel unused subscriptions and recurring monthly services (e.g., streaming services).",
      "Do a regular audit of your bills using a comparison site (e.g., switching energy providers or finding cheaper insurance).",
    ],
    impact:
      "The Impact: Consistently adding just $100–$200 per month can shave years off your loan and save you thousands in interest. For example, making an additional $200 per month payment on a $600,000 home loan with a 5.34% pa interest rate, will save $89,838 and 3 years and 10 months off your home loan.",
  },
  {
    id: 2,
    title: "Utilise an offset account & pay bills on a credit card",
    summary:
      "This strategy reduces your home loan interest by keeping your cash in an offset account for the maximum amount of time. For example, keeping $10,000 in an offset account against a $600,000 home loan with a 5.34% interest rate will save $38,000 interest over the term of the loan.",
    actions: [
      "Have your salary and all other income paid directly into your offset account.",
      "Pay day-to-day expenses using an interest-free credit card, with no annual fee.",
      "Clear the credit card balance in full, directly from the offset account, just before the due date each month.",
    ],
    impact:
      "The Benefit: Funds kept in an offset account work to reduce your monthly home loan interest. Ensure you do not over spend on your credit card or the interest savings will be lost with additional spending.",
  },
  {
    id: 3,
    title: "Switch to fortnightly repayments",
    summary:
      "Instead of paying monthly, switch to paying half your normal monthly repayment every fortnight.",
    impact:
      "The Benefit: There are 26 fortnights in a year, which means you effectively make 13 monthly repayments per year instead of 12. Using the example of a $600,000 home loan with a 5.34% interest rate, switching to fortnightly payments of half the monthly amount will save $116,335 interest, and 4 years and 11 months off your home loan.",
  },
  {
    id: 4,
    title: "Increase repayments with your annual salary increase",
    summary:
      "When you get your annual salary increase (if you don't get one, change jobs!), commit to increasing your home loan repayments by the same rate, instead of increasing your lifestyle spending.",
    actions: [
      "On a $600,000 home loan with a 5.34% interest rate, your minimum repayment is $3,347 per month.",
      "Increasing your repayment by 5% each year means you will be paying $4,271 per month in year 5, and $5,192 per month in year 10.",],
      impact:
      "The Benefit: Because you never get used to the extra cash in your pocket, you’re unlikely to miss it. Over 10 years, you will make an additional $103,538 repayments without much effort.",
  },
  {
    id: 5,
    title: "Buy an Investment Property",
    summary:
      "A well-chosen investment property can generate rental income, potential capital growth, and tax deductions.",
      actions: [
      "Start this strategy when you have sufficient equity in your home to fund a 20% deposit + costs on an investment property.",
      "Select a property with a purchase price about 20% higher than your home loan balance.",
      "If your home loan balance is $600,000, locate a property for around $720,000.",
      "Look for a property with strong growth potential over the next 10 years, with a decent rental yield.",
      "Let property growth do the work and sell the property when you have enough equity to repay your investment loan and home loan.",
    ],
    impact:
      "The Benefit: If property doubles every 10 years, you'll be in a position to repay your home loan within 7 years.",
  },
  {
    id: 6,
    title: "Use Debt Recycling to convert your home loan to an investment loan",
    summary:
      "Debt recycling converts non-deductible home loan debt into tax-deductible investment debt by redrawing equity to buy invstments.",
    actions: [
      "Use this strategy after the purchase of an investment property to further accelerate debt repayment.",
      "Split your home loan and redraw equity to buy investments such as ETF's and shares.",
      "Direct dividends and distributions into your home loan.",
      "Redraw your extra repayments each year and buy more investments.",
    ],
      impact:
      "The Benefit: You invest borrowed funds into a portfolio, then use the investment income and tax benefits to accelerate your non-deductible home loan repayments.",
  },
];

/* Reusable row for results */
function ResultRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 text-xs sm:text-sm">{label}</span>
      <span
        className={
          highlight
            ? "text-emerald-600 font-semibold text-sm"
            : "text-slate-800 font-medium text-sm"
        }
      >
        {value}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────
   CHART COMPONENTS
   ───────────────────────────────────── */

function DebtReductionChart({
  years,
  debtFreeLabel,
}: {
  years: YearState[];
  debtFreeLabel: string;
}) {
  const labels = years.map((y) => `Year ${y.yearIndex + 1}`);
  const homeLoanBalances = years.map((y) => y.homeLoanBalance);
  const totalLiabilities = years.map((y) => y.totalLiabilities);
  const totalAvailableIfSoldData = years.map((y) => y.totalAvailableIfSold);

  const data = {
    labels,
    datasets: [
      {
        label: "Home loan balance",
        data: homeLoanBalances,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.4)",
        tension: 0.3,
      },
      {
        label: "Total liabilities",
        data: totalLiabilities,
        borderColor: "rgb(244, 63, 94)",
        backgroundColor: "rgba(244, 63, 94, 0.4)",
        tension: 0.3,
        borderDash: [5, 5],
      },
      {
        label: "Total available if sold (excl. home)",
        data: totalAvailableIfSoldData,
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.4)",
        tension: 0.3,
        borderDash: [2, 2],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false as const,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "rgb(71, 85, 105)" },
      },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) =>
            `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "rgb(71, 85, 105)" },
        grid: { color: "rgb(226, 232, 240)" },
      },
      y: {
        ticks: {
          color: "rgb(71, 85, 105)",
          callback: (value: any) => formatCurrency(value),
        },
        grid: { color: "rgb(226, 232, 240)" },
      },
    },
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-3 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm sm:text-base font-semibold text-slate-900">
          Debt reduction & debt-clearing potential
        </h3>
        <p className="text-[11px] text-slate-600">
          Home loan can be cleared in:{" "}
          <span className="font-medium text-emerald-600">{debtFreeLabel}</span>
        </p>
      </div>
      <div className="mt-1 h-72 sm:h-80">
        <Line options={options} data={data} />
      </div>
    </div>
  );
}

function NetWorthChart({ years }: { years: YearState[] }) {
  const labels = years.map((y) => `Year ${y.yearIndex + 1}`);
  const netWorths = years.map((y) => y.netWorth);
  const totalAssets = years.map((y) => y.totalAssets);

  const data = {
    labels,
    datasets: [
      {
        label: "Net worth",
        data: netWorths,
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.4)",
        tension: 0.3,
        fill: true,
      },
      {
        label: "Total assets",
        data: totalAssets,
        borderColor: "rgb(251, 191, 36)",
        backgroundColor: "rgba(251, 191, 36, 0.35)",
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false as const,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "rgb(71, 85, 105)" },
      },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) =>
            `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "rgb(71, 85, 105)" },
        grid: { color: "rgb(226, 232, 240)" },
      },
      y: {
        ticks: {
          color: "rgb(71, 85, 105)",
          callback: (value: any) => formatCurrency(value),
        },
        grid: { color: "rgb(226, 232, 240)" },
      },
    },
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-3 shadow-sm">
      <h3 className="text-sm sm:text-base font-semibold text-slate-900">
        Total assets & net worth projection
      </h3>
      <div className="mt-1 h-72 sm:h-80">
        <Line options={options} data={data} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   TABLE COMPONENTS + TABS
   ───────────────────────────────────── */

function CashflowTable({ years }: { years: YearState[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 mb-2">
        Annual cashflow overview
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-[11px] md:text-xs text-left">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-700">
                Category
              </th>
              {years.map((y) => (
                <th
                  key={y.yearIndex}
                  className="px-3 py-2 text-right text-[11px] font-medium text-slate-700 whitespace-nowrap border-l border-slate-200"
                >
                  Year {y.yearIndex + 1}
                  {y.couldClearHomeLoan && (
                    <span className="ml-1 text-[10px] text-emerald-600">
                      • can clear
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {/* Income header */}
            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                Income
              </td>
              {years.map((y) => (
                <td key={`income-header-${y.yearIndex}`} className="px-3 py-2" />
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 text-slate-800">
                Net income (after tax)
              </td>
              {years.map((y) => (
                <td
                  key={`netIncome-${y.yearIndex}`}
                  className="px-3 py-2 text-right"
                >
                  {formatCurrency(y.netIncome)}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 text-slate-800">
                Investment property rent
              </td>
              {years.map((y) => (
                <td
                  key={`ipRent-${y.yearIndex}`}
                  className="px-3 py-2 text-right"
                >
                  {formatCurrency(y.ipRent)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 text-slate-800">
                Investment income (portfolio)
              </td>
              {years.map((y) => (
                <td
                  key={`investIncome-${y.yearIndex}`}
                  className="px-3 py-2 text-right"
                >
                  {formatCurrency(y.investIncome)}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 text-slate-800">
                Tax benefit / (extra tax)
              </td>
              {years.map((y) => (
                <td
                  key={`taxEffect-${y.yearIndex}`}
                  className={`px-3 py-2 text-right ${
                    y.taxEffectNet > 0
                      ? "text-emerald-600"
                      : y.taxEffectNet < 0
                      ? "text-rose-500"
                      : ""
                  }`}
                >
                  {formatCurrency(y.taxEffectNet)}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-100">
              <td className="sticky left-0 bg-slate-100 px-3 py-2 font-medium text-slate-800">
                Total income
              </td>
              {years.map((y) => (
                <td
                  key={`totalIncome-${y.yearIndex}`}
                  className="px-3 py-2 text-right font-medium"
                >
                  {formatCurrency(y.totalIncome)}
                </td>
              ))}
            </tr>

            {/* Expenses header */}
            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                Expenses
              </td>
              {years.map((y) => (
                <td
                  key={`expense-header-${y.yearIndex}`}
                  className="px-3 py-2"
                />
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 text-slate-800">
                Living expenses (excl. mortgage)
              </td>
              {years.map((y) => (
                <td
                  key={`living-${y.yearIndex}`}
                  className="px-3 py-2 text-right"
                >
                  {formatCurrency(y.livingExpenses)}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 text-slate-800">
                Home loan repayments (total)
              </td>
              {years.map((y) => (
                <td
                  key={`homeRepay-${y.yearIndex}`}
                  className="px-3 py-2 text-right"
                >
                  {formatCurrency(y.homeLoanRepayments)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 text-slate-800">
                Investment property expenses
              </td>
              {years.map((y) => (
                <td
                  key={`ipExp-${y.yearIndex}`}
                  className="px-3 py-2 text-right"
                >
                  {formatCurrency(y.ipExpenses)}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 text-slate-800">
                Investment property interest
              </td>
              {years.map((y) => (
                <td
                  key={`ipInt-${y.yearIndex}`}
                  className="px-3 py-2 text-right"
                >
                  {formatCurrency(y.ipInterest)}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-100">
              <td className="sticky left-0 bg-slate-100 px-3 py-2 font-medium text-slate-800">
                Total expenses
              </td>
              {years.map((y) => (
                <td
                  key={`totalExp-${y.yearIndex}`}
                  className="px-3 py-2 text-right font-medium"
                >
                  {formatCurrency(y.totalExpenses)}
                </td>
              ))}
            </tr>

            {/* Surplus */}
            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 font-semibold text-slate-800">
                Surplus / (shortfall)
              </td>
              {years.map((y) => (
                <td
                  key={`surplus-${y.yearIndex}`}
                  className={`px-3 py-2 text-right font-semibold ${
                    y.surplusCashflow >= 0
                      ? "text-emerald-600"
                      : "text-rose-500"
                  }`}
                >
                  {formatCurrency(y.surplusCashflow)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HomeLoanDetailTable({
  years,
  baseInputs,
}: {
  years: YearState[];
  baseInputs: BaseInputs;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 mb-2">
        Home loan details
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-[11px] md:text-xs text-left">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-700">
                Category
              </th>
              {years.map((y) => (
                <th
                  key={y.yearIndex}
                  className="px-3 py-2 text-right text-[11px] font-medium text-slate-700 whitespace-nowrap border-l border-slate-200"
                >
                  Year {y.yearIndex + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 text-slate-800 font-medium">
                Opening balance
              </td>
              {years.map((y, idx) => {
                const opening =
                  idx === 0
                    ? baseInputs.homeLoanBalance
                    : years[idx - 1].homeLoanBalance;
                return (
                  <td
                    key={`opening-${idx}`}
                    className="px-3 py-2 text-right text-slate-800"
                  >
                    {formatCurrency(opening)}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 text-slate-800 font-medium">
                Minimum repayments (13× monthly)
              </td>
              {years.map((y, idx) => (
                <td key={`minRepay-${idx}`} className="px-3 py-2 text-right">
                  {formatCurrency(y.minRepaymentMonthly * 13)}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 text-slate-800 font-medium">
                Additional repayments
              </td>
              {years.map((y, idx) => {
                const minAnnual = y.minRepaymentMonthly * 13;
                const additional = Math.max(
                  0,
                  y.homeLoanRepayments - minAnnual
                );
                return (
                  <td
                    key={`additional-${idx}`}
                    className="px-3 py-2 text-right text-slate-800"
                  >
                    {formatCurrency(additional)}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 text-slate-800 font-medium">
                Debt recycling contribution
              </td>
              {years.map((y, idx) => (
                <td key={`recycle-${idx}`} className="px-3 py-2 text-right">
                  {formatCurrency(y.investContributions)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 text-slate-800 font-medium">
                Offset balance
              </td>
              {years.map((y, idx) => (
                <td key={`offset-${idx}`} className="px-3 py-2 text-right">
                  {formatCurrency(y.offsetBalance)}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 text-slate-800 font-medium">
                Interest charged
              </td>
              {years.map((y, idx) => (
                <td key={`interest-${idx}`} className="px-3 py-2 text-right">
                  {formatCurrency(y.homeLoanInterest)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 text-slate-800 font-medium">
                Closing balance
              </td>
              {years.map((y, idx) => (
                <td
                  key={`closing-${idx}`}
                  className={`px-3 py-2 text-right ${
                    y.homeLoanBalance === 0
                      ? "text-emerald-600 font-semibold"
                      : "text-slate-800"
                  }`}
                >
                  {formatCurrency(y.homeLoanBalance)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssetsLiabilitiesTable({ years }: { years: YearState[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 mb-2">
        Assets & liabilities projection
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-[11px] md:text-xs text-left">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-700">
                Category
              </th>
              {years.map((y) => (
                <th
                  key={y.yearIndex}
                  className="px-3 py-2 text-right text-[11px] font-medium text-slate-700 whitespace-nowrap border-l border-slate-200"
                >
                  Year {y.yearIndex + 1}
                  {y.couldClearHomeLoan && (
                    <span className="ml-1 text-[10px] text-emerald-600">
                      • can clear
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-800">
                Home value
              </td>
              {years.map((y) => (
                <td
                  key={`home-${y.yearIndex}`}
                  className="px-3 py-2 text-right"
                >
                  {formatCurrency(y.homeValue)}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 font-medium text-slate-800">
                Investment property value
              </td>
              {years.map((y) => (
                <td key={`ip-${y.yearIndex}`} className="px-3 py-2 text-right">
                  {formatCurrency(y.ipValue)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-800">
                Investment portfolio value
              </td>
              {years.map((y) => (
                <td
                  key={`portfolio-${y.yearIndex}`}
                  className="px-3 py-2 text-right"
                >
                  {formatCurrency(y.investPortfolioValue)}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 font-medium text-slate-800">
                Offset account balance
              </td>
              {years.map((y) => (
                <td
                  key={`offset-${y.yearIndex}`}
                  className="px-3 py-2 text-right"
                >
                  {formatCurrency(y.offsetBalance)}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-100">
              <td className="sticky left-0 bg-slate-100 px-3 py-2 font-semibold text-slate-800">
                Total assets
              </td>
              {years.map((y) => (
                <td
                  key={`totalAssets-${y.yearIndex}`}
                  className="px-3 py-2 text-right font-semibold text-emerald-600"
                >
                  {formatCurrency(y.totalAssets)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-800">
                Home loan balance
              </td>
              {years.map((y) => (
                <td
                  key={`loanHome-${y.yearIndex}`}
                  className="px-3 py-2 text-right"
                >
                  {formatCurrency(y.homeLoanBalance)}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 font-medium text-slate-800">
                Investment property loan
              </td>
              {years.map((y) => (
                <td key={`loanIP-${y.yearIndex}`} className="px-3 py-2 text-right">
                  {formatCurrency(y.ipLoanBalance)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-800">
                Recycled investment loan
              </td>
              {years.map((y) => (
                <td
                  key={`loanInvest-${y.yearIndex}`}
                  className="px-3 py-2 text-right"
                >
                  {formatCurrency(y.investmentLoanBalance)}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-100">
              <td className="sticky left-0 bg-slate-100 px-3 py-2 font-semibold text-slate-800">
                Total liabilities
              </td>
              {years.map((y) => (
                <td
                  key={`totalLiabilities-${y.yearIndex}`}
                  className="px-3 py-2 text-right font-semibold text-rose-500"
                >
                  {formatCurrency(y.totalLiabilities)}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-50">
              <td className="sticky left-0 bg-slate-50 px-3 py-2 font-semibold text-sm text-slate-900">
                Net worth
              </td>
              {years.map((y) => (
                <td
                  key={`netWorth-${y.yearIndex}`}
                  className="px-3 py-2 text-right font-extrabold text-sm text-blue-700"
                >
                  {formatCurrency(y.netWorth)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultsTabs({
  years,
  baseInputs,
}: {
  years: YearState[];
  baseInputs: BaseInputs;
}) {
  const [activeTab, setActiveTab] = useState<"cashflow" | "homeloan" | "assets">(
    "cashflow"
  );

  const tabs = [
    {
      id: "cashflow",
      label: "Annual cashflow",
      component: <CashflowTable years={years} />,
    },
    {
      id: "homeloan",
      label: "Home loan detail",
      component: <HomeLoanDetailTable years={years} baseInputs={baseInputs} />,
    },
    {
      id: "assets",
      label: "Assets & net worth",
      component: <AssetsLiabilitiesTable years={years} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full bg-white p-1 border border-slate-200 shadow-sm overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-full font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-1">
        {tabs.find((t) => t.id === activeTab)?.component}
      </div>
    </div>
  );
}

/* Chart tabs wrapper */
function ChartTabs({
  years,
  debtFreeLabel,
}: {
  years: YearState[];
  debtFreeLabel: string;
}) {
  const [activeChart, setActiveChart] = useState<"debt" | "networth">("debt");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Projection charts
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Flip between debt reduction and overall wealth to see how the
            strategy plays out over time.
          </p>
        </div>

        <div className="inline-flex rounded-full bg-white p-1 border border-slate-200 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveChart("debt")}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-full font-medium whitespace-nowrap transition-colors ${
              activeChart === "debt"
                ? "bg-blue-500 text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Debt & liabilities
          </button>
          <button
            type="button"
            onClick={() => setActiveChart("networth")}
            className={`ml-1 px-3 py-1.5 text-xs sm:text-sm rounded-full font-medium whitespace-nowrap transition-colors ${
              activeChart === "networth"
                ? "bg-blue-500 text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Net worth & assets
          </button>
        </div>
      </div>

      <div className="pt-1">
        {activeChart === "debt" ? (
          <DebtReductionChart years={years} debtFreeLabel={debtFreeLabel} />
        ) : (
          <NetWorthChart years={years} />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────── */

export default function HomePage() {
  const [openTipId, setOpenTipId] = useState<number | null>(1);

  // 1. Base + tip inputs
  const [baseInputs, setBaseInputs] = useState<BaseInputs>({
    propertyValueHome: 900_000,
    homeLoanBalance: 600_000,
    homeLoanRate: 0.055, // 5.5% p.a.
    minRepaymentMonthly: 3_500,
    marginalTaxRate: 0.39, // 39% including Medicare
    netIncomeAnnual: 120_000,
    livingExpensesAnnualExMortgage: 50_000,
    offsetBalance: 40_000,
    emergencyFundTarget: 20_000,
  });

  const [tipInputs, setTipInputs] = useState<TipInputs>({
    tip1_extraSavingsPerMonth: 300,
    tip4_salaryGrowthRate: 0.03,
    tip5_purchaseYear: 5, // still required by type
    tip5_purchasePrice: 700_000,
    tip5_purchaseCostsRate: 0.05,
    tip5_rentAnnual: 35_000,
    tip5_expensesAnnual: 10_000,
    tip5_ipLoanRate: 0.06,
    tip6_recyclePerYear: 10_000,
    tip6_investReturn: 0.07,
    tip6_dividendYield: 0.04,
  });

  const updateBase = (field: keyof BaseInputs) => (val: number) => {
    setBaseInputs((prev) => ({ ...prev, [field]: Number(val) || 0 }));
  };

  const updateTip = (field: keyof TipInputs) => (val: number) => {
    setTipInputs((prev) => ({ ...prev, [field]: Number(val) || 0 }));
  };

  // 2. Run simulation
  const result = useMemo(
    () => runDebtProSimulation(baseInputs, tipInputs),
    [baseInputs, tipInputs]
  );

  const years = result.years;
  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  const debtFreeYearIndex = result.debtFreeYearIndex;
  const debtFreeLabel =
    debtFreeYearIndex !== undefined
      ? `Year ${debtFreeYearIndex + 1}`
      : "Not within projection period";

  const scrollToSection = (id: string) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Sticky top mini-menu */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">
            Debt Pro
          </span>
          <nav className="flex items-center gap-2 text-xs sm:text-sm">
            <button
              onClick={() => scrollToSection("tips")}
              className="px-3 py-1 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              Strategies
            </button>
            <button
              onClick={() => scrollToSection("calculator")}
              className="px-3 py-1 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              Tools
            </button>
          </nav>
        </div>
      </header>

      <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-12">
          {/* Hero */}
          <section className="mb-12 rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-sky-50 px-6 py-10 shadow-lg">
            <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2">
              For Australian homeowners
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Payoff your home loan in 7-10 years
            </h1>
            <p className="mt-4 text-sm md:text-base text-slate-700 max-w-2xl">
              Debt Pro brings together six practical strategies and
              tools to guide you on how to payoff your home loan in 7-10 years.
              Don't pay for the expensive courses, we've laid it out for you in six simple 
              yet powerful strategies.
            </p>
          </section>

          {/* Tips Section */}
          <section id="tips" className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              Six proven strategies to payoff your mortgage faster
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Each strategy builds on the others to create a snowball of extra income. 
              This snowball effect allows you to payoff your home loan faster, save hundreds of thousands 
              in interest, and shave years off your debt repayments.
            </p>

           <div className="space-y-3">
  {TIPS.map((tip) => {
    const isOpen = openTipId === tip.id;
    return (
      <div
        key={tip.id}
        className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setOpenTipId(isOpen ? null : tip.id)}
          className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-slate-50"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-[11px] font-semibold bg-blue-100 text-sky-800 px-3 py-1 rounded-full">
              Strategy {tip.id}
            </span>
            <span className="text-sm md:text-base font-medium text-slate-900">
              {tip.title}
            </span>
          </div>
          <span
            className={`ml-3 text-slate-500 text-xs sm:text-sm transition-transform ${
              isOpen ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
        </button>

        {/* 🟢 THE FIX IS HERE: Render the content of the current 'tip' */}
        {isOpen && (
          <div className="px-4 pb-4 text-sm text-slate-600">
            
            {/* 1. Summary/Introduction */}
            <p className="mb-3 text-slate-700">
              {tip.summary}
            </p>

            {/* 2. Actions List (only if 'actions' array exists) */}
            {tip.actions && tip.actions.length > 0 && (
              <ul className="list-disc list-inside space-y-1 mb-3 ml-4">
                {tip.actions.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            )}

            {/* 3. Impact/Key Takeaway */}
            <p className="mt-3">
              {/* Using dangerouslySetInnerHTML to render the bold tags (<strong>) in the 'impact' string */}
              <strong dangerouslySetInnerHTML={{ __html: tip.impact }} />
            </p>
          </div>
        )}
      </div>
    );
  })}
</div>
</section>

          {/* Calculator Section */}
          <section
            id="calculator"
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
          >
            <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mb-2">
              Model your position to see how you can repay your home loan in 7-10 years
            </h2>
            <p className="text-sm text-slate-600 mb-5">
              Start with your current position, then add in each of the 6 strategies. This
              calculator shows annual cashflow and how your assets grow and
             your home loan reduces over time.
            </p>

            <div className="space-y-6">
              {/* Inputs */}
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Your current position
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <InputField
                      label="Your property value"
                      value={baseInputs.propertyValueHome}
                      onChange={updateBase("propertyValueHome")}
                      prefix="$"
                    />
                    <InputField
                      label="Home loan balance"
                      value={baseInputs.homeLoanBalance}
                      onChange={updateBase("homeLoanBalance")}
                      prefix="$"
                    />
                    <InputField
                      label="Home loan rate (p.a.)"
                      value={baseInputs.homeLoanRate * 100}
                      onChange={(val) =>
                        setBaseInputs((prev) => ({
                          ...prev,
                          homeLoanRate: (val || 0) / 100,
                        }))
                      }
                      suffix="%"
                      decimals={2}
                    />
                    <InputField
                      label="Minimum repayment (per month)"
                      value={baseInputs.minRepaymentMonthly}
                      onChange={updateBase("minRepaymentMonthly")}
                      prefix="$"
                    />
                    <InputField
                      label="Marginal tax rate incl. Medicare"
                      value={baseInputs.marginalTaxRate * 100}
                      onChange={(val) =>
                        setBaseInputs((prev) => ({
                          ...prev,
                          marginalTaxRate: (val || 0) / 100,
                        }))
                      }
                      suffix="%"
                      decimals={2}
                    />
                    <InputField
                      label="Annual take home pay (after tax)"
                      value={baseInputs.netIncomeAnnual}
                      onChange={updateBase("netIncomeAnnual")}
                      prefix="$"
                    />
                    <InputField
                      label="Annual living expenses (excluding mortgage)"
                      value={baseInputs.livingExpensesAnnualExMortgage}
                      onChange={updateBase("livingExpensesAnnualExMortgage")}
                      prefix="$"
                    />
                    <InputField
                      label="Offset account balance"
                      value={baseInputs.offsetBalance}
                      onChange={updateBase("offsetBalance")}
                      prefix="$"
                    />
                    <InputField
                      label="Emergency fund (kept in offset)"
                      value={baseInputs.emergencyFundTarget}
                      onChange={updateBase("emergencyFundTarget")}
                      prefix="$"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                    Strategy Inputs
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <InputField
                      label="Extra savings (per month)"
                      value={tipInputs.tip1_extraSavingsPerMonth}
                      onChange={updateTip("tip1_extraSavingsPerMonth")}
                      prefix="$"
                    />
                    <InputField
                      label="Annual salary increase (p.a.)"
                      value={tipInputs.tip4_salaryGrowthRate * 100}
                      onChange={(val) =>
                        setTipInputs((prev) => ({
                          ...prev,
                          tip4_salaryGrowthRate: (val || 0) / 100,
                        }))
                      }
                      suffix="%"
                      decimals={2}
                      helper="Increases your mortgage payments by this amount each year"
                    />
                    <InputField
                      label="Investment property purchase price"
                      value={tipInputs.tip5_purchasePrice}
                      onChange={updateTip("tip5_purchasePrice")}
                      prefix="$"
                      helper="Purchase price should be 20% higher than your current home loan"
                    />
                    <InputField
                      label="Purchase costs (as % of price)"
                      value={tipInputs.tip5_purchaseCostsRate * 100}
                      onChange={(val) =>
                        setTipInputs((prev) => ({
                          ...prev,
                          tip5_purchaseCostsRate: (val || 0) / 100,
                        }))
                      }
                      suffix="%"
                      decimals={2}
                      helper="Stamp duty, legal fees, etc."
                    />
                    <InputField
                      label="Investment property gross annual rent"
                      value={tipInputs.tip5_rentAnnual}
                      onChange={updateTip("tip5_rentAnnual")}
                      prefix="$"
                    />
                    <InputField
                      label="Investment property annual expenses"
                      value={tipInputs.tip5_expensesAnnual}
                      onChange={updateTip("tip5_expensesAnnual")}
                      prefix="$"
                    />
                    <InputField
                      label="IP loan rate (p.a.)"
                      value={tipInputs.tip5_ipLoanRate * 100}
                      onChange={(val) =>
                        setTipInputs((prev) => ({
                          ...prev,
                          tip5_ipLoanRate: (val || 0) / 100,
                        }))
                      }
                      suffix="%"
                      decimals={2}
                    />
                    <InputField
                      label="Starting debt recycling amount (after IP purchase)"
                      value={tipInputs.tip6_recyclePerYear}
                      onChange={updateTip("tip6_recyclePerYear")}
                      prefix="$"
                      helper="One-time kick-off; future years recycle your repayments above the minimum."
                    />
                    <InputField
                      label="Portfolio total return (p.a.)"
                      value={tipInputs.tip6_investReturn * 100}
                      onChange={(val) =>
                        setTipInputs((prev) => ({
                          ...prev,
                          tip6_investReturn: (val || 0) / 100,
                        }))
                      }
                      suffix="%"
                      decimals={2}
                    />
                    <InputField
                      label="Portfolio yield (p.a.)"
                      value={tipInputs.tip6_dividendYield * 100}
                      onChange={(val) =>
                        setTipInputs((prev) => ({
                          ...prev,
                          tip6_dividendYield: (val || 0) / 100,
                        }))
                      }
                      suffix="%"
                      decimals={2}
                      helper="The yield component of the total return, with the remainder being portfolio growth."
                    />
                  </div>
                </div>
              </div>

              {/* Results summary */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 text-sm space-y-3">
                {!firstYear || !lastYear ? (
                  <p className="text-slate-600">
                    Enter your details above to see when you might be able to
                    clear your home loan.
                  </p>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-slate-900 mb-1">
                      When could you clear your home loan?
                    </h3>
                    <ResultRow
                      label="Home loan debt-free year"
                      value={debtFreeLabel}
                      highlight={debtFreeYearIndex !== undefined}
                    />
                                       
                  </>
                )}
              </div>

              {/* Charts + Tables (only when we have data) */}
              {years.length > 0 && (
                <div className="space-y-8">
                  {/* Charts in tabs */}
                  <section id="charts">
                    <ChartTabs years={years} debtFreeLabel={debtFreeLabel} />
                  </section>

                  {/* Tables in tabs */}
                  <section id="tables">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
                      <h3 className="text-base font-semibold text-slate-900">
                        Detailed year-by-year view
                      </h3>
                      <p className="text-xs text-slate-600">
                        Switch between cashflow, loan details and your overall
                        balance sheet to see how each year stacks up.
                      </p>
                      <ResultsTabs years={years} baseInputs={baseInputs} />
                    </div>
                  </section>

                  {/* FAQ */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-semibold text-slate-900">How the calculator works</h3>
                    <div className="space-y-3 text-sm text-slate-700">
                      <div>
                        <p className="font-semibold text-slate-900">Home loan repayments & interest</p>
                        <p>Monthly minimum + extra savings + fortnightly payments (Strategy 1 + 2) are paid as 13 “months” per year.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Salary growth (Strategy 4)</p>
                        <p>Each year, net income grows by your Strategy 4 rate. The minimum stays fixed, but an extra repayment is added equal to the compounded growth on that minimum (e.g., 5% of the minimum after 1 year, compounding thereafter).</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Investment property (Strategy 5)</p>
                        <p>IP is purchased when usable equity ≥ 30% of purchase price. Loan funds price + costs. Rent and expenses grow with CPI (3% p.a.) and loan is interest-only.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Debt recycling (Strategy 6)</p>
                        <p>Starts after IP purchase. Year 1 draws your “Starting debt recycling amount”; later years recycle the repayments above the minimum. Recycled amounts are invested; portfolio earns yield + growth; recycled loan accrues interest at your home loan rate.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">CPI / growth</p>
                        <p>Living expenses, IP rent, and IP expenses inflate at 3% p.a. Home and IP values grow at their specified rates.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Debt-free check</p>
                        <p>“Can clear” badge appears when selling IP + portfolio (after simple CGT) could pay off the home loan. Net worth = total assets minus all loans.</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer Links Section */}
      <section className="mt-16 mb-10 text-center">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Explore more tools at FinToolbox
        </h3>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <a
            href="https://fintoolbox.com.au/calculators/tax-calculator"
            className="text-sky-700 hover:text-sky-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            Income Tax Calculator
          </a>
          <a
            href="https://fintoolbox.com.au/calculators/mortgage"
            className="text-sky-700 hover:text-sky-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mortgage Calculator
          </a>
          <a
            href="https://fintoolbox.com.au/calculators/debt-recycling"
            className="text-sky-700 hover:text-sky-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            Debt Recycling Calculator
          </a>
          <a
            href="https://fintoolbox.com.au"
            className="text-sky-700 hover:text-sky-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit FinToolbox.com.au
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-slate-200 text-center text-slate-600 text-sm">
        <p className="mb-2">
          Have feedback or questions? Email me at <EmailLink />
        </p>
        <p className="text-xs text-slate-600 mt-3">
          © {new Date().getFullYear()} DebtPro — A FinToolbox Project.
          Information is general only and does not consider your personal
          situation.
        </p>
      </footer>
    </>
  );
}

/* Reusable input field */
function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  helper,
  decimals = 0, // default: whole dollars; pass 2 for % fields
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  prefix?: string;
  suffix?: string;
  helper?: string;
  decimals?: number;
}) {
  const [displayValue, setDisplayValue] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  // Helper: format an unformatted numeric string with thousand separators
  const formatWithSeparators = useCallback((raw: string): string => {
    if (!raw) return "";

    const hasTrailingDot = raw.endsWith(".");
    const [intPartRaw, decPartRaw = ""] = raw.split(".");

    // Allow leading zeros / empty intPart to behave nicely
    const intPartNumeric = parseInt(intPartRaw || "0", 10);
    if (Number.isNaN(intPartNumeric)) return "";

    const intFormatted = intPartNumeric.toLocaleString("en-AU");

    if (decimals === undefined || decimals < 0) {
      // No explicit decimal limit
      return decPartRaw ? `${intFormatted}.${decPartRaw}` : intFormatted;
    }

    const trimmedDec = decPartRaw.slice(0, decimals);
    if (trimmedDec) return `${intFormatted}.${trimmedDec}`;
    if (hasTrailingDot && (decimals === undefined || decimals > 0)) {
      return `${intFormatted}.`;
    }
    return intFormatted;
  }, [decimals]);

  // Keep display value in sync when the underlying numeric `value` changes
  useEffect(() => {
    if (isEditing) return; // don't override while the user is typing

    if (value !== null && value !== undefined && !Number.isNaN(value)) {
      let raw: string;

      if (decimals !== undefined && decimals >= 0) {
        raw = value.toFixed(decimals);
      } else {
        raw = value.toString();
      }

      const formatted = formatWithSeparators(raw);
      if (formatted !== displayValue) {
        setDisplayValue(formatted);
      }
    } else if (displayValue !== "") {
      setDisplayValue("");
    }
  }, [value, decimals, isEditing, formatWithSeparators, displayValue]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value || "";

    // Remove grouping separators before processing
    rawValue = rawValue.replace(/,/g, "");

    // Strip everything except digits and decimal point
    rawValue = rawValue.replace(/[^0-9.]/g, "");

    if (rawValue === "") {
      setDisplayValue("");
      onChange(0);
      return;
    }

    // Split into integer + decimal parts
    const parts = rawValue.split(".");
    let intPart = parts[0];
    let decPart = parts[1] ?? "";
    const hasDot = parts.length > 1;

    // If multiple dots, merge everything after the first into decimals
    if (parts.length > 2) {
      decPart = parts.slice(1).join("");
    }

    // Optional decimal precision cap
    if (decimals !== undefined && decimals >= 0) {
      decPart = decPart.slice(0, decimals);
    }

    // Rebuild the sanitised raw number string
    const shouldKeepDot = hasDot && (decimals === undefined || decimals > 0);
    const sanitised =
      decPart || shouldKeepDot ? `${intPart}.${decPart}` : intPart;

    // Format for display with thousand separators
    const formattedForDisplay = formatWithSeparators(sanitised);
    setDisplayValue(formattedForDisplay);

    // Send a plain number (no commas) back up
    const numericValue = parseFloat(sanitised);
    onChange(Number.isNaN(numericValue) ? 0 : numericValue);
  };

  return (
    <label className="block text-xs">
      <span className="mb-1.5 block text-[11px] font-medium text-slate-600">
        {label}
      </span>
      <div className="flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500">
        {prefix && (
          <span className="mr-1 text-slate-400 select-none">{prefix}</span>
        )}
        <input
          type="text"
          inputMode="decimal"
          className="w-full bg-transparent text-slate-900 placeholder-slate-400 outline-none"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
        />
        {suffix && (
          <span className="ml-1 text-slate-400 select-none">{suffix}</span>
        )}
      </div>
      {helper && (
        <p className="mt-1 text-[11px] text-slate-500">
          {helper}
        </p>
      )}
    </label>
  );
}

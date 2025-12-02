"use client";

import { useState, useMemo, useEffect, type ChangeEvent } from "react";
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
type Tip = {
  id: number;
  title: string;
  body: string;
};

const TIPS: Tip[] = [
  {
    id: 1,
    title: "Budget effectively to find surplus income for extra repayments",
    body:
      "The fastest way to reduce your mortgage is to find a surplus in your budget and consistently add it to your home loan repayments. This may come from trimming non-essential spending, cancelling unused subscriptions, or redirecting savings from everyday expenses. Even $100–$200 per month can take years off your loan and save thousands in interest.",
  },
  {
    id: 2,
    title:
      "Direct all income into your offset account & spend via credit card",
    body:
      "Have your salary and other income paid straight into your offset account. Pay day-to-day expenses using an interest-free credit card, and clear it monthly. This keeps your cash in the offset account for longer, reducing your daily interest charge on the home loan.",
  },
  {
    id: 3,
    title: "Switch to fortnightly repayments (half your monthly amount)",
    body:
      "There are 26 fortnights in a year, which is equivalent to 13 monthly repayments. By paying half your normal monthly repayment every fortnight, you effectively make one extra repayment each year, directly reducing your principal faster.",
  },
  {
    id: 4,
    title: "Increase repayments each year when your salary increases",
    body:
      "When your income goes up, commit to increasing your home loan repayments instead of your lifestyle spending. Because you never get used to the extra cash in your pocket, you’re unlikely to miss it—but your mortgage balance will reduce more quickly.",
  },
  {
    id: 5,
    title: "Buy an investment property to accelerate long-term wealth",
    body:
      "A well-chosen investment property can generate rental income, potential capital growth and tax deductions. Some investors then use surplus cash flow and tax refunds to make additional home loan repayments. This can speed up debt reduction, but it does carry risk and requires careful planning.",
  },
  {
    id: 6,
    title: "Use debt recycling into an investment portfolio",
    body:
      "Debt recycling gradually converts non-deductible home loan debt into investment debt. You invest borrowed funds into a portfolio, then use the investment income, franking credits and tax benefits to accelerate your home loan repayments. Done well, this may grow wealth while reducing debt, but it involves investment risk and should be implemented with advice.",
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
      <span className="text-slate-400 text-xs sm:text-sm">{label}</span>
      <span
        className={
          highlight
            ? "text-emerald-400 font-semibold text-sm"
            : "text-slate-200 font-medium text-sm"
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
        labels: { color: "rgb(148, 163, 184)" },
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
        ticks: { color: "rgb(148, 163, 184)" },
        grid: { color: "rgb(30, 41, 59)" },
      },
      y: {
        ticks: {
          color: "rgb(148, 163, 184)",
          callback: (value: any) => formatCurrency(value),
        },
        grid: { color: "rgb(30, 41, 59)" },
      },
    },
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm sm:text-base font-semibold text-slate-50">
          Debt reduction & debt-clearing potential
        </h3>
        <p className="text-[11px] text-slate-400">
          Target:{" "}
          <span className="font-medium text-emerald-400">{debtFreeLabel}</span>
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
        labels: { color: "rgb(148, 163, 184)" },
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
        ticks: { color: "rgb(148, 163, 184)" },
        grid: { color: "rgb(30, 41, 59)" },
      },
      y: {
        ticks: {
          color: "rgb(148, 163, 184)",
          callback: (value: any) => formatCurrency(value),
        },
        grid: { color: "rgb(30, 41, 59)" },
      },
    },
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 space-y-3">
      <h3 className="text-sm sm:text-base font-semibold text-slate-50">
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
      <h3 className="text-sm font-semibold text-slate-100 mb-2">
        Annual cashflow overview
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
        <table className="min-w-full text-[11px] md:text-xs text-left">
          <thead className="bg-slate-900/90 border-b border-slate-800">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-900/95 px-3 py-2 text-[11px] font-semibold text-slate-200">
                Category
              </th>
              {years.map((y) => (
                <th
                  key={y.yearIndex}
                  className="px-3 py-2 text-right text-[11px] font-medium text-slate-300 whitespace-nowrap border-l border-slate-800/60"
                >
                  Year {y.yearIndex + 1}
                  {y.couldClearHomeLoan && (
                    <span className="ml-1 text-[10px] text-emerald-400">
                      • can clear
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {/* Income header */}
            <tr className="bg-slate-900/40">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 font-semibold text-slate-200">
                Income
              </td>
              {years.map((y) => (
                <td key={`income-header-${y.yearIndex}`} className="px-3 py-2" />
              ))}
            </tr>
            <tr>
              <td className="sticky left-0 bg-slate-900 px-3 py-2 text-slate-200">
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
            <tr className="bg-slate-900/40">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 text-slate-200">
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
              <td className="sticky left-0 bg-slate-900 px-3 py-2 text-slate-200">
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
            <tr className="bg-slate-900/40">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 text-slate-200">
                Tax benefit / (extra tax)
              </td>
              {years.map((y) => (
                <td
                  key={`taxEffect-${y.yearIndex}`}
                  className={`px-3 py-2 text-right ${
                    y.taxEffectNet > 0
                      ? "text-emerald-400"
                      : y.taxEffectNet < 0
                      ? "text-rose-400"
                      : ""
                  }`}
                >
                  {formatCurrency(y.taxEffectNet)}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-900/80">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 font-medium text-slate-200">
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
            <tr className="bg-slate-900/40">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 font-semibold text-slate-200">
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
              <td className="sticky left-0 bg-slate-900 px-3 py-2 text-slate-200">
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
            <tr className="bg-slate-900/40">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 text-slate-200">
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
              <td className="sticky left-0 bg-slate-900 px-3 py-2 text-slate-200">
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
            <tr className="bg-slate-900/40">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 text-slate-200">
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
            <tr className="bg-slate-900/80">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 font-medium text-slate-200">
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
              <td className="sticky left-0 bg-slate-900 px-3 py-2 font-semibold text-slate-200">
                Surplus / (shortfall)
              </td>
              {years.map((y) => (
                <td
                  key={`surplus-${y.yearIndex}`}
                  className={`px-3 py-2 text-right font-semibold ${
                    y.surplusCashflow >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
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
      <h3 className="text-sm font-semibold text-slate-100 mb-2">
        Home loan details
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
        <table className="min-w-full text-[11px] md:text-xs text-left">
          <thead className="bg-slate-900/90 border-b border-slate-800">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-900/95 px-3 py-2 text-[11px] font-semibold text-slate-200">
                Category
              </th>
              {years.map((y) => (
                <th
                  key={y.yearIndex}
                  className="px-3 py-2 text-right text-[11px] font-medium text-slate-300 whitespace-nowrap border-l border-slate-800/60"
                >
                  Year {y.yearIndex + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            <tr className="bg-slate-900/40">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 text-slate-200 font-medium">
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
                    className="px-3 py-2 text-right text-slate-100"
                  >
                    {formatCurrency(opening)}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="sticky left-0 bg-slate-900 px-3 py-2 text-slate-200 font-medium">
                Minimum repayments (12× monthly)
              </td>
              {years.map((y, idx) => (
                <td key={`minRepay-${idx}`} className="px-3 py-2 text-right">
                  {formatCurrency(baseInputs.minRepaymentMonthly * 12)}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-900/40">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 text-slate-200 font-medium">
                Additional repayments
              </td>
              {years.map((y, idx) => {
                const minAnnual = baseInputs.minRepaymentMonthly * 12;
                const additional = Math.max(
                  0,
                  y.homeLoanRepayments - minAnnual
                );
                return (
                  <td
                    key={`additional-${idx}`}
                    className="px-3 py-2 text-right text-slate-100"
                  >
                    {formatCurrency(additional)}
                  </td>
                );
              })}
            </tr>

            <tr>
              <td className="sticky left-0 bg-slate-900 px-3 py-2 text-slate-200 font-medium">
                Offset balance
              </td>
              {years.map((y, idx) => (
                <td key={`offset-${idx}`} className="px-3 py-2 text-right">
                  {formatCurrency(y.offsetBalance)}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-900/40">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 text-slate-200 font-medium">
                Interest charged
              </td>
              {years.map((y, idx) => (
                <td key={`interest-${idx}`} className="px-3 py-2 text-right">
                  {formatCurrency(y.homeLoanInterest)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="sticky left-0 bg-slate-900 px-3 py-2 text-slate-200 font-medium">
                Closing balance
              </td>
              {years.map((y, idx) => (
                <td
                  key={`closing-${idx}`}
                  className={`px-3 py-2 text-right ${
                    y.homeLoanBalance === 0
                      ? "text-emerald-400 font-semibold"
                      : "text-slate-100"
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
      <h3 className="text-sm font-semibold text-slate-100 mb-2">
        Assets & liabilities projection
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
        <table className="min-w-full text-[11px] md:text-xs text-left">
          <thead className="bg-slate-900/90 border-b border-slate-800">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-900/95 px-3 py-2 text-[11px] font-semibold text-slate-200">
                Category
              </th>
              {years.map((y) => (
                <th
                  key={y.yearIndex}
                  className="px-3 py-2 text-right text-[11px] font-medium text-slate-300 whitespace-nowrap border-l border-slate-800/60"
                >
                  Year {y.yearIndex + 1}
                  {y.couldClearHomeLoan && (
                    <span className="ml-1 text-[10px] text-emerald-400">
                      • can clear
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            <tr>
              <td className="sticky left-0 bg-slate-900 px-3 py-2 font-medium text-slate-200">
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

            <tr className="bg-slate-900/40">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 font-medium text-slate-200">
                Investment property value
              </td>
              {years.map((y) => (
                <td key={`ip-${y.yearIndex}`} className="px-3 py-2 text-right">
                  {formatCurrency(y.ipValue)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="sticky left-0 bg-slate-900 px-3 py-2 font-medium text-slate-200">
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

            <tr className="bg-slate-900/40">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 font-medium text-slate-200">
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

            <tr className="bg-slate-900/80">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 font-semibold text-slate-200">
                Total assets
              </td>
              {years.map((y) => (
                <td
                  key={`totalAssets-${y.yearIndex}`}
                  className="px-3 py-2 text-right font-semibold text-emerald-400"
                >
                  {formatCurrency(y.totalAssets)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="sticky left-0 bg-slate-900 px-3 py-2 font-medium text-slate-200">
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

            <tr className="bg-slate-900/40">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 font-medium text-slate-200">
                Investment property loan
              </td>
              {years.map((y) => (
                <td key={`loanIP-${y.yearIndex}`} className="px-3 py-2 text-right">
                  {formatCurrency(y.ipLoanBalance)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="sticky left-0 bg-slate-900 px-3 py-2 font-medium text-slate-200">
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

            <tr className="bg-slate-900/80">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 font-semibold text-slate-200">
                Total liabilities
              </td>
              {years.map((y) => (
                <td
                  key={`totalLiabilities-${y.yearIndex}`}
                  className="px-3 py-2 text-right font-semibold text-rose-400"
                >
                  {formatCurrency(y.totalLiabilities)}
                </td>
              ))}
            </tr>

            <tr className="bg-slate-900">
              <td className="sticky left-0 bg-slate-900/95 px-3 py-2 font-semibold text-sm text-slate-50">
                Net worth
              </td>
              {years.map((y) => (
                <td
                  key={`netWorth-${y.yearIndex}`}
                  className="px-3 py-2 text-right font-extrabold text-sm text-blue-400"
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
      <div className="inline-flex rounded-full bg-slate-900/70 p-1 border border-slate-800 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-full font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/70"
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-50">
            Projection charts
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Flip between debt reduction and overall wealth to see how the
            strategy plays out over time.
          </p>
        </div>

        <div className="inline-flex rounded-full bg-slate-900/80 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveChart("debt")}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-full font-medium whitespace-nowrap transition-colors ${
              activeChart === "debt"
                ? "bg-blue-500 text-white shadow-sm"
                : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/70"
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
                : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/70"
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
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-100">
            DebtPro
          </span>
          <nav className="flex items-center gap-2 text-xs sm:text-sm">
            <button
              onClick={() => scrollToSection("tips")}
              className="px-3 py-1 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              Tips
            </button>
            <button
              onClick={() => scrollToSection("calculator")}
              className="px-3 py-1 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              Calculator
            </button>
          </nav>
        </div>
      </header>

      <main className="min-h-screen bg-slate-900 text-slate-300">
        <div className="max-w-4xl mx-auto px-4 py-10 md:py-12">
          {/* Hero */}
          <section className="mb-12 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 px-6 py-10 shadow-lg">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">
              For Australian homeowners
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 tracking-tight">
              Pay your home loan off sooner with a simple, disciplined plan
            </h1>
            <p className="mt-4 text-sm md:text-base text-slate-300 max-w-2xl">
              DebtPro brings together six practical strategies and a focused
              simulator so you can see how your income, extra repayments,
              investment property and debt recycling might work together over
              time. It&apos;s a projection, not advice.
            </p>
          </section>

          {/* Tips Section */}
          <section id="tips" className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-100 mb-4">
              Six proven strategies to reduce your mortgage faster
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Work through each strategy and decide which ones fit your
              situation. You don’t have to do all six for the plan to be
              effective—consistent, realistic changes win.
            </p>

            <div className="space-y-3">
              {TIPS.map((tip) => {
                const isOpen = openTipId === tip.id;
                return (
                  <div
                    key={tip.id}
                    className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenTipId(isOpen ? null : tip.id)}
                      className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-slate-800/70"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-[11px] font-semibold bg-blue-600 text-slate-50 px-3 py-1 rounded-full">
                          Tip {tip.id}
                        </span>
                        <span className="text-sm md:text-base font-medium text-slate-100">
                          {tip.title}
                        </span>
                      </div>
                      <span
                        className={`ml-3 text-slate-400 text-xs sm:text-sm transition-transform ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      >
                        ▶
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 text-sm text-slate-400">
                        {tip.body}
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
            className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-sm"
          >
            <h2 className="text-xl md:text-2xl font-semibold text-slate-100 mb-2">
              Model your full DebtPro plan
            </h2>
            <p className="text-sm text-slate-400 mb-5">
              Start with your current position, then layer in the tips. This
              simulator shows annual cashflow and how your assets and
              liabilities might change over time. It&apos;s a simplified model,
              not personal advice.
            </p>

            <div className="space-y-6">
              {/* Inputs */}
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                    Step 1 · Your current position
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <InputField
                      label="Home value (approx.)"
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
                    />
                    <InputField
                      label="Net income (per year, after tax)"
                      value={baseInputs.netIncomeAnnual}
                      onChange={updateBase("netIncomeAnnual")}
                      prefix="$"
                    />
                    <InputField
                      label="Living expenses (per year, excl. mortgage)"
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
                  <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                    Step 2 · Tip inputs
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <InputField
                      label="Tip 1 · Extra savings to add (per month)"
                      value={tipInputs.tip1_extraSavingsPerMonth}
                      onChange={updateTip("tip1_extraSavingsPerMonth")}
                      prefix="$"
                      helper="Surplus from budgeting, side income, etc."
                    />
                    <InputField
                      label="Tip 4 · Expected salary growth (p.a.)"
                      value={tipInputs.tip4_salaryGrowthRate * 100}
                      onChange={(val) =>
                        setTipInputs((prev) => ({
                          ...prev,
                          tip4_salaryGrowthRate: (val || 0) / 100,
                        }))
                      }
                      suffix="%"
                      helper="Half of each pay rise is directed to your mortgage."
                    />
                    <InputField
                      label="Tip 5 · Investment property purchase price"
                      value={tipInputs.tip5_purchasePrice}
                      onChange={updateTip("tip5_purchasePrice")}
                      prefix="$"
                    />
                    <InputField
                      label="Tip 5 · Purchase costs (% of price)"
                      value={tipInputs.tip5_purchaseCostsRate * 100}
                      onChange={(val) =>
                        setTipInputs((prev) => ({
                          ...prev,
                          tip5_purchaseCostsRate: (val || 0) / 100,
                        }))
                      }
                      suffix="%"
                      helper="Stamp duty, legal fees, etc. as a % of price."
                    />
                    <InputField
                      label="Tip 5 · Annual rent"
                      value={tipInputs.tip5_rentAnnual}
                      onChange={updateTip("tip5_rentAnnual")}
                      prefix="$"
                    />
                    <InputField
                      label="Tip 5 · Annual expenses (rates, insurance, etc.)"
                      value={tipInputs.tip5_expensesAnnual}
                      onChange={updateTip("tip5_expensesAnnual")}
                      prefix="$"
                    />
                    <InputField
                      label="Tip 5 · IP loan rate (p.a.)"
                      value={tipInputs.tip5_ipLoanRate * 100}
                      onChange={(val) =>
                        setTipInputs((prev) => ({
                          ...prev,
                          tip5_ipLoanRate: (val || 0) / 100,
                        }))
                      }
                      suffix="%"
                    />
                    <InputField
                      label="Tip 6 · Amount recycled each year"
                      value={tipInputs.tip6_recyclePerYear}
                      onChange={updateTip("tip6_recyclePerYear")}
                      prefix="$"
                    />
                    <InputField
                      label="Tip 6 · Investment return (p.a.)"
                      value={tipInputs.tip6_investReturn * 100}
                      onChange={(val) =>
                        setTipInputs((prev) => ({
                          ...prev,
                          tip6_investReturn: (val || 0) / 100,
                        }))
                      }
                      suffix="%"
                    />
                    <InputField
                      label="Tip 6 · Dividend / income yield (p.a.)"
                      value={tipInputs.tip6_dividendYield * 100}
                      onChange={(val) =>
                        setTipInputs((prev) => ({
                          ...prev,
                          tip6_dividendYield: (val || 0) / 100,
                        }))
                      }
                      suffix="%"
                    />
                  </div>
                </div>
              </div>

              {/* Results summary */}
              <div className="bg-slate-900 rounded-lg border border-slate-700 p-5 text-sm space-y-3">
                {!firstYear || !lastYear ? (
                  <p className="text-slate-500">
                    Enter your details above to see when you might be able to
                    clear your home loan.
                  </p>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-slate-100 mb-1">
                      When could you clear your home loan?
                    </h3>
                    <ResultRow
                      label="Home loan target debt-free year"
                      value={debtFreeLabel}
                      highlight={debtFreeYearIndex !== undefined}
                    />
                    <ResultRow
                      label="Net worth at end of projection"
                      value={formatCurrency(lastYear.netWorth)}
                      highlight={true}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      This is a simplified projection only. It assumes you
                      follow the plan consistently and that returns, tax and
                      borrowing rates behave as modelled.
                    </p>
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
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                      <h3 className="text-base font-semibold text-slate-50">
                        Detailed year-by-year view
                      </h3>
                      <p className="text-xs text-slate-400">
                        Switch between cashflow, loan details and your overall
                        balance sheet to see how each year stacks up.
                      </p>
                      <ResultsTabs years={years} baseInputs={baseInputs} />
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
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Explore more tools at FinToolbox
        </h3>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <a
            href="https://fintoolbox.com.au/calculators/tax-calculator"
            className="text-blue-400 hover:text-blue-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            Income Tax Calculator
          </a>
          <a
            href="https://fintoolbox.com.au/calculators/mortgage"
            className="text-blue-400 hover:text-blue-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mortgage Calculator
          </a>
          <a
            href="https://fintoolbox.com.au/calculators/debt-recycling"
            className="text-blue-400 hover:text-blue-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            Debt Recycling Calculator
          </a>
          <a
            href="https://fintoolbox.com.au"
            className="text-blue-400 hover:text-blue-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit FinToolbox.com.au
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-slate-800 text-center text-slate-500 text-sm">
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
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  prefix?: string;
  suffix?: string;
  helper?: string;
}) {
  const [displayValue, setDisplayValue] = useState<string>("");

  useEffect(() => {
    if (value !== null && value !== undefined && !Number.isNaN(value)) {
      const numericFromDisplay = parseFloat(displayValue);
      if (Number.isNaN(numericFromDisplay) || numericFromDisplay !== value) {
        setDisplayValue(value.toString());
      }
    } else if (displayValue !== "") {
      setDisplayValue("");
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;

    rawValue = rawValue.replace(/[^0-9.]/g, "");
    const parts = rawValue.split(".");
    if (parts.length > 2) {
      rawValue = parts[0] + "." + parts[1];
    }
    if (parts[1] && parts[1].length > 2) {
      rawValue = parts[0] + "." + parts[1].slice(0, 2);
    }

    setDisplayValue(rawValue);

    const numericValue = parseFloat(rawValue);
    onChange(Number.isNaN(numericValue) ? 0 : numericValue);
  };

  return (
    <div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-2 text-slate-500 text-sm">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          className={`w-full bg-slate-900 border border-slate-700 rounded-lg 
            ${prefix ? "pl-7 pr-3" : "px-3"} 
            py-2 text-sm text-slate-100 
            focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
          value={displayValue}
          onChange={handleInputChange}
        />
        {suffix && (
          <span className="absolute right-3 top-2 text-slate-500 text-sm">
            {suffix}
          </span>
        )}
      </div>
      {helper && (
        <p className="text-[11px] text-slate-500 mt-1">{helper}</p>
      )}
    </div>
  );
}

"use client";

import { useState, type ChangeEvent } from "react";
import EmailLink from "./components/EmailLink";

/* Utility functions */
function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function formatYearsMonths(totalMonths: number): string {
  if (!Number.isFinite(totalMonths) || totalMonths <= 0) return "-";
  const months = Math.round(totalMonths);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} months`;
  if (remainingMonths === 0) return `${years} years`;
  return `${years} years ${remainingMonths} months`;
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
    title:
      "Budget effectively to find surplus income for extra repayments",
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
    title:
      "Switch to fortnightly repayments (half your monthly amount)",
    body:
      "There are 26 fortnights in a year, which is equivalent to 13 monthly repayments. By paying half your normal monthly repayment every fortnight, you effectively make one extra repayment each year, directly reducing your principal faster.",
  },
  {
    id: 4,
    title:
      "Increase repayments each year when your salary increases",
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
    title:
      "Use debt recycling into an investment portfolio",
    body:
      "Debt recycling gradually converts non-deductible home loan debt into investment debt. You invest borrowed funds into a portfolio, then use the investment income, franking credits and tax benefits to accelerate your home loan repayments. Done well, this may grow wealth while reducing debt, but it involves investment risk and should be implemented with advice.",
  },
];

interface ExtraRepaymentResult {
  minRepayment: number;
  baselineInterest: number;
  baselineMonths: number;
  payoffMonthsWithExtra: number;
  interestWithExtra: number;
  interestSaved: number;
  monthsSaved: number;
}

/* Calculator logic */
function calculateExtraRepaymentScenario(
  loanAmount: number,
  interestRate: number,
  termYears: number,
  extraPerMonth: number
): ExtraRepaymentResult | null {
  const P = loanAmount;
  const rAnnual = interestRate / 100;
  const totalMonths = termYears * 12;
  const extra = extraPerMonth;

  if (!P || !rAnnual || !termYears) return null;

  const monthlyRate = rAnnual / 12;

  const minRepayment =
    (P * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalMonths));

  const baselineInterest = minRepayment * totalMonths - P;

  let balance = P;
  let month = 0;
  let totalInterestWithExtra = 0;
  const repaymentWithExtra = minRepayment + extra;

  while (balance > 0 && month < totalMonths) {
    const interest = balance * monthlyRate;
    totalInterestWithExtra += interest;
    const principal = repaymentWithExtra - interest;
    balance -= principal;
    month++;
  }

  const interestSaved = baselineInterest - totalInterestWithExtra;

  return {
    minRepayment,
    baselineInterest,
    baselineMonths: totalMonths,
    payoffMonthsWithExtra: month,
    interestWithExtra: totalInterestWithExtra,
    interestSaved,
    monthsSaved: totalMonths - month,
  };
}

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

export default function HomePage() {
  const [loanAmount, setLoanAmount] = useState<number>(600_000);
  const [interestRate, setInterestRate] = useState<number>(5.5);
  const [termYears, setTermYears] = useState<number>(30);
  const [extraPerMonth, setExtraPerMonth] = useState<number>(300);
  const [openTipId, setOpenTipId] = useState<number | null>(1);

  const result = calculateExtraRepaymentScenario(
    loanAmount,
    interestRate,
    termYears,
    extraPerMonth
  );

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
          {/* Hero with subtle gradient */}
          <section className="mb-12 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 px-6 py-10 shadow-lg">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide mb-2">
              For Australian homeowners
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-50 tracking-tight">
              Pay your home loan off sooner with a simple, disciplined plan
            </h1>
            <p className="mt-4 text-sm md:text-base text-slate-300 max-w-2xl">
              DebtPro brings together six practical strategies and a focused
              calculator so you can see how much time and interest you can save
              by committing to regular extra repayments.
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
                      onClick={() =>
                        setOpenTipId(isOpen ? null : tip.id)
                      }
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
              See how fast you could be debt-free
            </h2>
            <p className="text-sm text-slate-400 mb-5">
              Enter your current loan details and an extra repayment amount.
              This will estimate how much time and interest you might save by
              sticking with the plan. It&apos;s a simple projection, not advice.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Inputs */}
              <div className="space-y-4">
                <InputField
                  label="Loan balance (approx.)"
                  value={loanAmount}
                  onChange={setLoanAmount}
                  prefix="$"
                />
                <InputField
                  label="Interest rate (p.a.)"
                  value={interestRate}
                  onChange={setInterestRate}
                  suffix="%"
                />
                <InputField
                  label="Remaining loan term (years)"
                  value={termYears}
                  onChange={setTermYears}
                />
                <InputField
                  label="Extra repayment (per month)"
                  value={extraPerMonth}
                  onChange={setExtraPerMonth}
                  prefix="$"
                  helper="This could be your pay rise, side hustle income, or a tighter budget."
                />
              </div>

              {/* Results */}
              <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 text-sm space-y-3">
                {!result ? (
                  <p className="text-slate-500">
                    Enter your details on the left to see a projection.
                  </p>
                ) : (
                  <>
                    <ResultRow
                      label="Minimum monthly repayment"
                      value={formatCurrency(result.minRepayment)}
                    />
                    <ResultRow
                      label="Time to repay (minimums only)"
                      value={formatYearsMonths(result.baselineMonths)}
                    />
                    <ResultRow
                      label="Time to repay (with extra)"
                      value={formatYearsMonths(
                        result.payoffMonthsWithExtra
                      )}
                    />
                    <ResultRow
                      label="Time saved from your loan"
                      value={formatYearsMonths(result.monthsSaved)}
                      highlight
                    />
                    <ResultRow
                      label="Total interest (no extra)"
                      value={formatCurrency(result.baselineInterest)}
                    />
                    <ResultRow
                      label="Total interest (with extra)"
                      value={formatCurrency(result.interestWithExtra)}
                    />
                    <ResultRow
                      label="Interest saved"
                      value={formatCurrency(result.interestSaved)}
                      highlight
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      This is general information only. Interest rates, loan
                      features and your behaviour over time will affect actual
                      outcomes.
                    </p>
                  </>
                )}
              </div>
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
    Have feedback or questions? Email me at{" "}
    <EmailLink />
  </p>
  <p className="text-xs text-slate-600 mt-3">
    © {new Date().getFullYear()} DebtPro — A FinToolbox Project.
    Information is general only and does not consider your personal situation.
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
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Remove commas and non-digit characters
    const rawValue = e.target.value.replace(/[^\d.-]/g, "");
    const numericValue = Number(rawValue);
    onChange(numericValue);
  };

  // Format displayed value with thousands separators
  const formattedValue =
    value !== null && value !== undefined && !isNaN(value)
      ? value.toLocaleString("en-AU")
      : "";

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
          inputMode="numeric"
          className={`w-full bg-slate-900 border border-slate-700 rounded-lg 
            ${prefix ? "pl-7 pr-3" : "px-3"} 
            py-2 text-sm text-slate-100 
            focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
          value={formattedValue}
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


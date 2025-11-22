// lib/debtProEngine.ts

// ─────────────────────────────────────────────
// 1. Types
// ─────────────────────────────────────────────

export type BaseInputs = {
  propertyValueHome: number;
  homeLoanBalance: number;
  homeLoanRate: number; // e.g. 0.06 for 6% p.a.
  minRepaymentMonthly: number;

  marginalTaxRate: number; // incl. Medicare, e.g. 0.39

  netIncomeAnnual: number;                // after-tax income now
  livingExpensesAnnualExMortgage: number; // non-mortgage expenses

  offsetBalance: number;
  emergencyFundTarget: number;
};

export type TipInputs = {
  // Tip 1 – extra savings to boost repayments
  tip1_extraSavingsPerMonth: number;

  // Tip 4 – salary growth, 50% of net increase to mortgage
  tip4_salaryGrowthRate: number; // e.g. 0.03 for 3% p.a.

  // Tip 5 – investment property
  tip5_purchaseYear: number;      // now effectively unused, but you can keep or remove
  tip5_purchasePrice: number;
  tip5_purchaseCostsRate: number; // NEW: decimal, e.g. 0.05 for 5% purchase costs
  tip5_rentAnnual: number;
  tip5_expensesAnnual: number;
  tip5_ipLoanRate: number;        // e.g. 0.06

  // Tip 6 – debt recycling
  tip6_recyclePerYear: number;
  tip6_investReturn: number;
  tip6_dividendYield: number;
};


export type Assumptions = {
  projectionYears: number;   // max years to simulate
  homeGrowthRate: number;    // e.g. 0.03 p.a.
  ipGrowthRate: number;      // e.g. 0.03 p.a.
  effectiveCgtRate: number;  // simple effective CGT on portfolio gains, e.g. 0.1
};

// Snapshot of a single year in the simulation
export type YearState = {
  yearIndex: number; // 0 = start year

  // Income & expenses
  netIncome: number;
  livingExpenses: number;

  homeLoanInterest: number;
  homeLoanRepayments: number; // total paid this year towards home loan

  ipRent: number;
  ipExpenses: number;
  ipInterest: number;

  investIncome: number;
  taxEffectNet: number; // net tax benefit / (extra tax) from IP + investments

  totalIncome: number;
  totalExpenses: number;
  surplusCashflow: number;

  // Assets
  homeValue: number;
  ipValue: number;
  investPortfolioValue: number;
  offsetBalance: number;

  // Liabilities
  homeLoanBalance: number;
  ipLoanBalance: number;
  investmentLoanBalance: number;

  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;

  // “Could clear the home loan if we sold everything?” test
  couldClearHomeLoan: boolean;
  totalAvailableIfSold: number; // after simple CGT
};

export type SimulationResult = {
  years: YearState[];
  debtFreeYearIndex?: number;  // first yearIndex where couldClearHomeLoan = true
};

// ─────────────────────────────────────────────
// 2. Default assumptions
// ─────────────────────────────────────────────

const DEFAULT_ASSUMPTIONS: Assumptions = {
  projectionYears: 30,
  homeGrowthRate: 0.03,
  ipGrowthRate: 0.03,
  effectiveCgtRate: 0.10,
};

// ─────────────────────────────────────────────
// 3. Main entry point
// ─────────────────────────────────────────────

export function runDebtProSimulation(
  base: BaseInputs,
  tips: TipInputs,
  customAssumptions?: Partial<Assumptions>
): SimulationResult {
  const assumptions: Assumptions = {
    ...DEFAULT_ASSUMPTIONS,
    ...customAssumptions,
  };

  const years: YearState[] = [];

  // Running state across years
  let netIncome = base.netIncomeAnnual;
  let livingExpenses = base.livingExpensesAnnualExMortgage;

  let homeValue = base.propertyValueHome;
  let homeLoanBalance = base.homeLoanBalance;

  let offsetBalance = base.offsetBalance;

  // Tip 5 / 6 state (we’ll flesh out later)
  let ipValue = 0;
  let ipLoanBalance = 0;
  let hasPurchasedIP = false;

  let investPortfolioValue = 0;
  let investmentLoanBalance = 0; // recycled, deductible debt

  let debtFreeYearIndex: number | undefined;

  for (let yearIndex = 0; yearIndex < assumptions.projectionYears; yearIndex++) {
    // ─────────────────────────────────────────
    // 3.1 Update home value
    // ─────────────────────────────────────────
    if (yearIndex > 0) {
      homeValue *= 1 + assumptions.homeGrowthRate;
    }

    // ─────────────────────────────────────────
    // 3.2 Tip 4 – salary growth
    // ─────────────────────────────────────────
    let extraIncomeToMortgage = 0;
    if (yearIndex > 0 && tips.tip4_salaryGrowthRate > 0) {
      const previousIncome = netIncome;
      netIncome = netIncome * (1 + tips.tip4_salaryGrowthRate);
      const extraIncome = netIncome - previousIncome;
      extraIncomeToMortgage = 0.5 * extraIncome; // 50% of net increase
    }

    // ─────────────────────────────────────────
    // 3.3 Tips 1 + 3 + 4 – annual home loan repayments
    // ─────────────────────────────────────────
    const baseMonthlyRepayment =
      base.minRepaymentMonthly + tips.tip1_extraSavingsPerMonth;

    // Tip 3: pay fortnightly = 13 "months" of repayments per year
    const annualRepaymentFromBaseAndTip1And3 = baseMonthlyRepayment * 13;

    // Add Tip 4 extra (from salary growth) as extra annual repayment
    const annualHomeLoanRepayments =
      annualRepaymentFromBaseAndTip1And3 + extraIncomeToMortgage;

    // ─────────────────────────────────────────
    // 3.4 Home loan interest & principal
    // (simple annual interest approximation)
    // Optionally adjust for offset by reducing effective balance
    // ─────────────────────────────────────────
    const effectiveHomeDebt = Math.max(
      0,
      homeLoanBalance - Math.max(0, offsetBalance - base.emergencyFundTarget)
    );

    const homeLoanInterest = effectiveHomeDebt * base.homeLoanRate;
    let principalPaid = annualHomeLoanRepayments - homeLoanInterest;

    if (principalPaid < 0) {
      // Underpaying interest – in reality the loan would grow.
      // For now, cap principalPaid at 0 and let interest capitalise.
      principalPaid = 0;
      homeLoanBalance = homeLoanBalance + homeLoanInterest;
    } else {
      homeLoanBalance = Math.max(
        0,
        homeLoanBalance - principalPaid
      );
    }

    // In this first layer we’ll keep offsetBalance constant.
    // Later we can decide to push surplus cash into offset.

    // ─────────────────────────────────────────
    // ─────────────────────────────────────────
// 3.5 Investment property (Tip 5)
// ─────────────────────────────────────────
let ipRent = 0;
let ipExpenses = 0;
let ipInterest = 0;

// Buy the IP when 80% of home value minus home loan
// (usable equity) is at least 30% of the IP purchase price.
if (!hasPurchasedIP && tips.tip5_purchasePrice > 0) {
  const usableEquity = Math.max(0, homeValue * 0.8 - homeLoanBalance);
  const requiredEquity = 0.3 * tips.tip5_purchasePrice;

  if (usableEquity >= requiredEquity) {
    hasPurchasedIP = true;
    ipValue = tips.tip5_purchasePrice;

    const purchaseCostRate = tips.tip5_purchaseCostsRate ?? 0;
    const purchaseCosts = tips.tip5_purchasePrice * purchaseCostRate;

    // 100% debt funded: price + costs
    ipLoanBalance = tips.tip5_purchasePrice + purchaseCosts;
  }
}

if (hasPurchasedIP) {
  // simple growth after purchase
  ipValue *= 1 + assumptions.ipGrowthRate;

  ipRent = tips.tip5_rentAnnual;
  ipExpenses = tips.tip5_expensesAnnual;
  ipInterest = ipLoanBalance * tips.tip5_ipLoanRate;

  // v1: assume interest-only IP loan
  // repayments = interest only (captured in ipInterest)
}


    // ─────────────────────────────────────────
    // ─────────────────────────────────────────
// 3.6 Debt recycling & portfolio (Tip 6)
// ─────────────────────────────────────────
let investIncome = 0;
let debtRecyclingInterest = 0;
let investContributions = 0;

// Only start recycling AFTER the IP has been purchased
if (tips.tip6_recyclePerYear > 0 && homeLoanBalance > 0 && hasPurchasedIP) {
  investContributions = Math.min(
    tips.tip6_recyclePerYear,
    homeLoanBalance
  );

  investmentLoanBalance += investContributions;
  // The recycled amount is invested
  investPortfolioValue += investContributions;
}

// Investment returns
if (investPortfolioValue > 0) {
  const dividend = investPortfolioValue * tips.tip6_dividendYield;
  const capitalGrowth =
    investPortfolioValue * (tips.tip6_investReturn - tips.tip6_dividendYield);

  investIncome = dividend;
  investPortfolioValue += dividend + capitalGrowth;
}

if (investmentLoanBalance > 0 && tips.tip6_investReturn > 0) {
  // For now, assume same loan rate as home loan for recycled debt
  debtRecyclingInterest = investmentLoanBalance * base.homeLoanRate;
}


    // ─────────────────────────────────────────
    // 3.7 Tax effects (very simplified v1)
    // ─────────────────────────────────────────
    // Negative gearing on IP:
    const ipNetBeforeTax = ipRent - ipExpenses - ipInterest;
    let taxEffectIP = 0;
    if (ipNetBeforeTax < 0) {
      taxEffectIP = -ipNetBeforeTax * base.marginalTaxRate; // tax benefit
    } else if (ipNetBeforeTax > 0) {
      taxEffectIP = -ipNetBeforeTax * base.marginalTaxRate; // extra tax
    }

    // Investment income + interest on recycled debt
    const investNetBeforeTax = investIncome - debtRecyclingInterest;
    let taxEffectInvest = 0;
    if (investNetBeforeTax < 0) {
      taxEffectInvest = -investNetBeforeTax * base.marginalTaxRate;
    } else if (investNetBeforeTax > 0) {
      taxEffectInvest = -investNetBeforeTax * base.marginalTaxRate;
    }

    const taxEffectNet = taxEffectIP + taxEffectInvest;

    // ─────────────────────────────────────────
    // 3.8 Cashflow summary
    // ─────────────────────────────────────────
    const totalIncome = netIncome + ipRent + investIncome + Math.max(0, taxEffectNet);
    const totalExpenses =
      livingExpenses +
      annualHomeLoanRepayments +
      ipExpenses +
      ipInterest +
      Math.max(0, -taxEffectNet); // extra tax if taxEffectNet is negative

    const surplusCashflow = totalIncome - totalExpenses;

    // ─────────────────────────────────────────
    // 3.9 Assets & liabilities snapshot
    // ─────────────────────────────────────────
    const totalAssets =
      homeValue +
      ipValue +
      investPortfolioValue +
      offsetBalance;

    const totalLiabilities =
      homeLoanBalance +
      ipLoanBalance +
      investmentLoanBalance;

    const netWorth = totalAssets - totalLiabilities;

    // ─────────────────────────────────────────
    // 3.10 "If we sold everything, could we clear the home loan?"
    // (simple CGT on the portfolio only)
// ─────────────────────────────────────────
    // ─────────────────────────────────────────
// 3.10 "If we sold the IP + portfolio, could we clear the home loan?"
// ─────────────────────────────────────────

// 1) Portfolio proceeds after CGT (very simple effective rate)
const portfolioAfterCGT =
  investPortfolioValue > 0
    ? investPortfolioValue * (1 - assumptions.effectiveCgtRate)
    : 0;

// 2) Investment property net sale proceeds
//    (sale price minus selling costs, then repay IP loan)
const ipSellingCostRate = 0.03; // you can lift this into Assumptions later

const ipNetSaleProceeds =
  ipValue > 0
    ? Math.max(0, ipValue * (1 - ipSellingCostRate) - ipLoanBalance)
    : 0;

// 3) Total cash available from selling IP + portfolio
const totalAvailableIfSold = ipNetSaleProceeds + portfolioAfterCGT;

// 4) Can we wipe the home loan using just IP + portfolio?
const couldClearHomeLoan =
  homeLoanBalance > 0 && totalAvailableIfSold >= homeLoanBalance;


    if (couldClearHomeLoan && debtFreeYearIndex === undefined) {
      debtFreeYearIndex = yearIndex;
    }

    // ─────────────────────────────────────────
    // 3.11 Push year snapshot
    // ─────────────────────────────────────────
    years.push({
      yearIndex,

      netIncome,
      livingExpenses,

      homeLoanInterest,
      homeLoanRepayments: annualHomeLoanRepayments,

      ipRent,
      ipExpenses,
      ipInterest,

      investIncome,
      taxEffectNet,

      totalIncome,
      totalExpenses,
      surplusCashflow,

      homeValue,
      ipValue,
      investPortfolioValue,
      offsetBalance,

      homeLoanBalance,
      ipLoanBalance,
      investmentLoanBalance,

      totalAssets,
      totalLiabilities,
      netWorth,

      couldClearHomeLoan,
      totalAvailableIfSold,
    });

    // Optional early stop: once home loan is actually zero, we can break
    if (homeLoanBalance <= 0.01) {
      break;
    }
  }

  return {
    years,
    debtFreeYearIndex,
  };
}

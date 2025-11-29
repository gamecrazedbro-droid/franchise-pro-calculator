import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, DollarSign, TrendingUp, AlertCircle, 
  MapPin, Search, ChevronRight, BarChart3,
  Briefcase, Coins, User, Building2, Target, CheckCircle, AlertTriangle, XCircle, Zap, ExternalLink, ChevronDown, Globe, Moon, Sun,
  FileText, Download, Printer, Calendar, Table as TableIcon, LocateFixed, Lock, CheckSquare
} from 'lucide-react';
import { analyzeLocation, getBankerAnalysis, identifyLocationFromCoordinates } from './services/geminiService';
import { CURRENCIES, DEFAULT_CURRENCY } from './constants';
import { CurrencyCode, LocationAnalysisResult, FinancialMetrics, BankerAudit, CurrencyConfig } from './types';
import AnalysisChart from './components/AnalysisChart';

const Card = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
    {children}
  </div>
);

interface InputGroupProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  prefix?: string;
  type?: string;
  hint?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, value, onChange, prefix, type = "number", hint = "" }) => (
  <div className="mb-5">
    <div className="flex justify-between items-center mb-1.5">
      <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">{label}</label>
      {hint && <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{hint}</span>}
    </div>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-500 dark:text-gray-400 sm:text-sm font-bold">{prefix}</span>
      </div>
      <input
        type={type}
        className="block w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-gray-900 dark:text-white font-semibold transition-colors outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm"
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder="0"
      />
    </div>
  </div>
);

const ResultRow = ({ label, value, subtext = "", isPositive = true, highlight = false }: any) => (
  <div className={`flex justify-between items-center py-3.5 border-b border-gray-100 dark:border-gray-700 last:border-0 ${highlight ? 'bg-blue-50 dark:bg-blue-900/20 px-4 -mx-4 rounded-lg mt-2 border-b-0' : ''}`}>
    <div>
      <p className={`text-sm ${highlight ? 'font-bold text-blue-900 dark:text-blue-300' : 'font-medium text-gray-700 dark:text-gray-300'}`}>{label}</p>
      {subtext && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtext}</p>}
    </div>
    <div className="text-right">
      <p className={`font-bold ${highlight ? 'text-xl text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'} ${!isPositive ? 'text-red-600 dark:text-red-400' : ''}`}>
        {value}
      </p>
    </div>
  </div>
);

// --- Report Generator Component ---

interface ReportGeneratorProps {
  metrics: FinancialMetrics;
  currency: CurrencyConfig;
  industry: string;
  location: string;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ metrics, currency, industry, location }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationYears, setDurationYears] = useState(1);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [growthRate, setGrowthRate] = useState(5); // 5% annual growth default

  const generateData = () => {
    const data = [];
    const start = new Date(startDate);
    let currentCash = -metrics.totalInvestment; // Starting with initial investment deficit
    
    const monthlyRevenueBase = metrics.annualRevenue / 12;
    const monthlyExpenseBase = metrics.annualExpenses / 12;

    const totalMonths = durationYears * 12;
    const isYearlyView = interval === 'yearly';
    
    let yearlyRevenueAccum = 0;
    let yearlyExpenseAccum = 0;

    for (let i = 0; i < totalMonths; i++) {
      const currentDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const currentYearIndex = Math.floor(i / 12);
      
      // Apply growth rate annually
      const growthFactor = Math.pow(1 + (growthRate / 100), currentYearIndex);
      
      const revenue = monthlyRevenueBase * growthFactor;
      const expense = monthlyExpenseBase * (1 + ((growthRate * 0.5) / 100) * currentYearIndex); // Expenses grow slower (simple assumption)
      const profit = revenue - expense;
      
      currentCash += profit;
      
      if (isYearlyView) {
        yearlyRevenueAccum += revenue;
        yearlyExpenseAccum += expense;
        
        // End of year or end of duration
        if ((i + 1) % 12 === 0 || i === totalMonths - 1) {
          data.push({
            period: `Year ${currentYearIndex + 1}`,
            date: currentDate.getFullYear().toString(),
            revenue: yearlyRevenueAccum,
            expenses: yearlyExpenseAccum,
            profit: yearlyRevenueAccum - yearlyExpenseAccum,
            cashBalance: currentCash
          });
          yearlyRevenueAccum = 0;
          yearlyExpenseAccum = 0;
        }
      } else {
        data.push({
          period: `Month ${i + 1}`,
          date: currentDate.toLocaleDateString(currency.locale, { month: 'short', year: '2-digit' }),
          revenue: revenue,
          expenses: expense,
          profit: profit,
          cashBalance: currentCash
        });
      }
    }
    return data;
  };

  const reportData = generateData();

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleDownloadCSV = () => {
    const headers = ['Period', 'Date', 'Revenue', 'Expenses', 'Net Profit', 'Cash Balance'];
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => 
        [
          row.period, 
          row.date, 
          row.revenue.toFixed(2), 
          row.expenses.toFixed(2), 
          row.profit.toFixed(2), 
          row.cashBalance.toFixed(2)
        ].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FranchisePro_Report_${industry.replace(/\s+/g, '_')}_${startDate}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="p-5 mt-6 print:shadow-none print:border-none print:m-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className="text-blue-600 dark:text-blue-400"/> 
            Custom Financial Reports
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate projections and export data</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <button onClick={handleDownloadCSV} className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-200">
            <Download size={14} /> CSV
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Configuration Controls - Hidden when printing */}
      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-600 mb-6 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-1">
              <Calendar size={12} /> Start Date
            </label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5">Duration</label>
            <select 
              value={durationYears} 
              onChange={(e) => setDurationYears(Number(e.target.value))}
              className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            >
              <option value={1}>1 Year</option>
              <option value={3}>3 Years</option>
              <option value={5}>5 Years</option>
              <option value={10}>10 Years</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5">Interval</label>
            <div className="flex bg-white dark:bg-gray-700 rounded-md p-1 border border-gray-300 dark:border-gray-600">
              <button 
                onClick={() => setInterval('monthly')}
                className={`flex-1 text-xs py-1 rounded ${interval === 'monthly' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold' : 'text-gray-600 dark:text-gray-400'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setInterval('yearly')}
                className={`flex-1 text-xs py-1 rounded ${interval === 'yearly' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold' : 'text-gray-600 dark:text-gray-400'}`}
              >
                Yearly
              </button>
            </div>
          </div>
          <div>
             <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1.5">Est. Annual Growth</label>
             <div className="relative">
                <input 
                  type="number" 
                  value={growthRate} 
                  onChange={(e) => setGrowthRate(Number(e.target.value))}
                  className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white pl-2 pr-6"
                />
                <span className="absolute right-3 top-1.5 text-xs text-gray-500">%</span>
             </div>
          </div>
        </div>
      </div>

      {/* Print Header - Visible only on Print */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold text-black mb-2">Financial Projection Report</h1>
        <div className="flex justify-between text-sm text-gray-600 border-b pb-4 border-gray-300">
          <div>
            <p><span className="font-bold">Project:</span> {industry || 'Franchise'}</p>
            <p><span className="font-bold">Location:</span> {location || 'Not specified'}</p>
          </div>
          <div className="text-right">
            <p><span className="font-bold">Generated:</span> {new Date().toLocaleDateString()}</p>
            <p><span className="font-bold">Currency:</span> {currency.code}</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 print:border-none print:overflow-visible">
        <table className="w-full text-sm text-left print:text-xs">
          <thead className="bg-gray-100 dark:bg-gray-750 text-gray-700 dark:text-gray-200 font-bold print:bg-gray-100 print:text-black">
            <tr>
              <th className="px-4 py-3 border-b dark:border-gray-600 whitespace-nowrap">Period</th>
              <th className="px-4 py-3 border-b dark:border-gray-600 whitespace-nowrap text-right">Revenue</th>
              <th className="px-4 py-3 border-b dark:border-gray-600 whitespace-nowrap text-right">Expenses</th>
              <th className="px-4 py-3 border-b dark:border-gray-600 whitespace-nowrap text-right">Net Profit</th>
              <th className="px-4 py-3 border-b dark:border-gray-600 whitespace-nowrap text-right">Cash Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 print:divide-gray-300">
            {reportData.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 print:hover:bg-transparent">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white print:text-black">
                  {row.period} <span className="text-gray-400 dark:text-gray-500 font-normal ml-1 text-xs print:text-gray-600">({row.date})</span>
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 print:text-black">{formatMoney(row.revenue)}</td>
                <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 print:text-black">{formatMoney(row.expenses)}</td>
                <td className={`px-4 py-3 text-right font-bold ${row.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} print:text-black`}>
                  {formatMoney(row.profit)}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${row.cashBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} print:text-black`}>
                  {formatMoney(row.cashBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-xs text-center text-gray-400 dark:text-gray-500 italic print:text-gray-500 print:mt-8">
        * Projections based on {growthRate}% annual growth rate and current input metrics.
      </div>
    </Card>
  );
};


const LOADING_PHRASES = [
  "Cooking the books...",
  "Hiding the losses...",
  "Inflating the EBITDA...",
  "Calling Wall Street...",
  "Liquidating assets...",
  "Bribing the auditor...",
  "Consulting the oracle...",
  "Shorting the competition...",
  "Laundering the data...",
  "Calculating the getaway...",
  "Analyzing the hustle...",
  "Maximizing leverage...",
  "Checking offshore accounts...",
  "Printing money...",
  "Simulating a crash...",
  "Finding the alpha...",
  "Ignoring the risk...",
  "Scaling to the moon..."
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const currency = CURRENCIES[currencyCode];

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply Dark Mode Class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Location & Industry State
  const [locationQuery, setLocationQuery] = useState('');
  const [country, setCountry] = useState('');
  const [industry, setIndustry] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [locationData, setLocationData] = useState<LocationAnalysisResult | null>(null);
  
  // Geolocation State
  const [isLocating, setIsLocating] = useState(false);

  // Loading State
  const [isAppLoading, setIsAppLoading] = useState(true); // Initial App Load
  const [isCalculating, setIsCalculating] = useState(false); // Analysis Load
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);

  // Banker Data
  const [bankerData, setBankerData] = useState<BankerAudit | null>(null);

  // Financial State: Initial Investment
  const [franchiseFee, setFranchiseFee] = useState(500000);
  const [buildOut, setBuildOut] = useState(300000);
  const [equipment, setEquipment] = useState(75000);
  const [workingCapital, setWorkingCapital] = useState(50000);
  const [contractTerm, setContractTerm] = useState(10); // Years
  
  // Financial State: Operations
  const [avgTicket, setAvgTicket] = useState(100);
  const [dailyCust, setDailyCust] = useState(50);
  const [daysOpen, setDaysOpen] = useState(320);
  
  // Financial State: Costs
  const [cogsPercent, setCogsPercent] = useState(30);
  const [laborPercent, setLaborPercent] = useState(25);
  const [royaltyPercent, setRoyaltyPercent] = useState(6);
  const [marketingPercent, setMarketingPercent] = useState(2);
  const [rentMonthly, setRentMonthly] = useState(50000);
  const [salariesMonthly, setSalariesMonthly] = useState(30000);
  const [miscMonthly, setMiscMonthly] = useState(20000);

  // Results
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalInvestment: 0,
    annualRevenue: 0,
    annualExpenses: 0,
    netProfit: 0,
    monthlyNet: 0,
    roiYears: 0,
    breakEvenMonths: 0,
    margin: 0,
    contractTerm: 0,
    requiredDailyCustomers: 0,
    requiredDailyCustomersForMargin: 0
  });

  // Initial App Load Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 2500); // 2.5 seconds duration
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 1. Total Initial Investment
    const totalInv = Number(franchiseFee) + Number(buildOut) + Number(equipment) + Number(workingCapital);

    // 2. Revenue Calculation
    const annualRev = Number(avgTicket) * Number(dailyCust) * Number(daysOpen);

    // 3. Variable Costs (Annual)
    const cogs = annualRev * (Number(cogsPercent) / 100);
    const labor = annualRev * (Number(laborPercent) / 100);
    const royalties = annualRev * (Number(royaltyPercent) / 100);
    const marketing = annualRev * (Number(marketingPercent) / 100);

    // 4. Fixed Costs (Annual)
    const rent = Number(rentMonthly) * 12;
    const salaries = Number(salariesMonthly) * 12;
    const misc = Number(miscMonthly) * 12;

    // 5. Totals
    const totalAnnualExpenses = cogs + labor + royalties + marketing + rent + salaries + misc;
    const annualNetProfit = annualRev - totalAnnualExpenses;
    const monthlyNetProfit = annualNetProfit / 12;

    // 6. ROI & Break Even
    let paybackYears = 0;
    let breakEvenM = 0;
    
    if (annualNetProfit > 0) {
      paybackYears = totalInv / annualNetProfit;
      breakEvenM = totalInv / monthlyNetProfit;
    }

    // 7. 10% Monthly ROI Calculation (Target 120% Annual ROI - "Wealth Building")
    // Formula: Needed Monthly Net Profit = Total Investment * 0.10
    const targetMonthlyNetROI = totalInv * 0.10; // 10% monthly
    const monthlyFixedCosts = Number(rentMonthly) + Number(salariesMonthly) + Number(miscMonthly);
    const requiredMonthlyContributionROI = targetMonthlyNetROI + monthlyFixedCosts;
    
    const variableCostPercent = Number(cogsPercent) + Number(laborPercent) + Number(royaltyPercent) + Number(marketingPercent);
    const marginPerCustomer = Number(avgTicket) * (1 - (variableCostPercent / 100));
    
    let reqDailyCustomers = 0;
    if (marginPerCustomer > 0 && daysOpen > 0) {
        const requiredMonthlyCustomers = requiredMonthlyContributionROI / marginPerCustomer;
        reqDailyCustomers = requiredMonthlyCustomers / (Number(daysOpen) / 12);
    }

    // 8. 10% Net Profit Margin Calculation (Operational Safety)
    // Formula: Revenue * (1 - Variable% - 0.10) = Fixed Costs
    // Required Revenue = Fixed Costs / (1 - Variable% - 0.10)
    
    const targetNetMargin = 0.10;
    const variableRatio = variableCostPercent / 100;
    const denominator = 1 - variableRatio - targetNetMargin;
    
    let reqDailyCustomersForMargin = 0;
    
    if (denominator > 0) {
      const annualFixedCosts = monthlyFixedCosts * 12;
      const requiredAnnualRevenueForMargin = annualFixedCosts / denominator;
      reqDailyCustomersForMargin = requiredAnnualRevenueForMargin / Number(daysOpen) / Number(avgTicket);
    }

    setMetrics({
      totalInvestment: totalInv,
      annualRevenue: annualRev,
      annualExpenses: totalAnnualExpenses,
      netProfit: annualNetProfit,
      monthlyNet: monthlyNetProfit,
      roiYears: paybackYears,
      breakEvenMonths: breakEvenM,
      margin: annualRev > 0 ? (annualNetProfit / annualRev) * 100 : 0,
      contractTerm: Number(contractTerm),
      requiredDailyCustomers: reqDailyCustomers,
      requiredDailyCustomersForMargin: reqDailyCustomersForMargin
    });

  }, [franchiseFee, buildOut, equipment, workingCapital, contractTerm, avgTicket, dailyCust, daysOpen, cogsPercent, laborPercent, royaltyPercent, marketingPercent, rentMonthly, salariesMonthly, miscMonthly]);

  // Loading phrase cycler (runs during App Load OR Analysis Load)
  useEffect(() => {
    let interval: any;
    if (isCalculating || isAppLoading) {
      interval = setInterval(() => {
        setLoadingPhrase(LOADING_PHRASES[Math.floor(Math.random() * LOADING_PHRASES.length)]);
      }, 600); // 0.6 seconds - rapid banter
    }
    return () => clearInterval(interval);
  }, [isCalculating, isAppLoading]);

  const handleLocationSearch = async () => {
    if (!locationQuery.trim() || !country.trim()) {
      alert("Both City/Region and Country are mandatory for location analysis.");
      return;
    }
    setIsAnalyzing(true);
    setLocationData(null);
    try {
      // Pass industry state to get smarter results
      const fullLocation = `${locationQuery}, ${country}`;
      const result = await analyzeLocation(fullLocation, industry);
      setLocationData(result);
    } catch (e) {
      console.error(e);
      alert("Could not analyze location. Please check your internet or API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const result = await identifyLocationFromCoordinates(latitude, longitude);
        if (result.city) setLocationQuery(result.city);
        if (result.country) setCountry(result.country);
      } catch (err) {
        console.error(err);
        alert("Could not retrieve location details from coordinates.");
      } finally {
        setIsLocating(false);
      }
    }, (error) => {
      console.error(error);
      setIsLocating(false);
      alert("Unable to retrieve your location. Please check browser permissions.");
    }, { timeout: 10000 });
  };
  
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(currency.locale, { 
      style: 'currency', 
      currency: currency.code, 
      maximumFractionDigits: 0 
    }).format(val);
  };

  const handleCalculateProfitability = async () => {
    if (!locationQuery.trim() || !country.trim()) {
      alert("Please enter both City and Country in the Location Intelligence section. This information is mandatory for an accurate audit.");
      setActiveTab('input');
      return;
    }

    setIsCalculating(true);
    
    // Minimum wait time reduced to 2500ms to allow ~4-5 phrases to be seen
    const minWait = new Promise(resolve => setTimeout(resolve, 2500));
    
    // Fetch Banker Analysis with Detailed Inputs
    const targetIndustry = industry || "Retail Business";
    const targetLocation = `${locationQuery}, ${country}`;
    
    // Gather detailed inputs for the AI to audit
    const detailedInputs = {
      cogs: `${cogsPercent}%`,
      labor: `${laborPercent}%`,
      rent: formatCurrency(rentMonthly),
      marketing: `${marketingPercent}%`,
      franchiseFee: formatCurrency(franchiseFee)
    };

    const analysisPromise = getBankerAnalysis(metrics, targetIndustry, targetLocation, detailedInputs);

    try {
      // Wait for both timer and API
      const [_, analysisResult] = await Promise.all([minWait, analysisPromise]);
      setBankerData(analysisResult);
      setActiveTab('results');
    } catch (error) {
      console.error("Calculation Error", error);
    } finally {
      setIsCalculating(false);
    }
  };


  // Helper for Traffic Light
  const VerdictBadge = ({ verdict }: { verdict: string }) => {
    let colorClass = "bg-gray-100 text-gray-800";
    let Icon = AlertTriangle;
    
    if (verdict === "Green Light") {
      colorClass = "bg-[#dcfce7] text-[#166534] border-[#86efac]";
      Icon = CheckCircle;
    } else if (verdict === "Yellow Light") {
      colorClass = "bg-[#fef9c3] text-[#854d0e] border-[#fde047]";
      Icon = AlertTriangle;
    } else if (verdict === "Red Light") {
      colorClass = "bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]";
      Icon = XCircle;
    }

    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${colorClass} font-bold shadow-sm`}>
        <Icon size={20} />
        {verdict}
      </div>
    );
  };

  // Shared Loading Screen Component
  if (isCalculating || isAppLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        {/* Dynamic Financial Chart Animation */}
        <div className="relative mb-12 h-32 w-48 flex items-end justify-center gap-3">
           <div className="chart-bar w-8 bg-emerald-600 rounded-t-md shadow-[0_0_15px_rgba(5,150,105,0.5)]" style={{height: '30%', animationDelay: '0s'}}></div>
           <div className="chart-bar w-8 bg-emerald-500 rounded-t-md shadow-[0_0_15px_rgba(16,185,129,0.5)]" style={{height: '50%', animationDelay: '0.2s'}}></div>
           <div className="chart-bar w-8 bg-emerald-400 rounded-t-md shadow-[0_0_15px_rgba(52,211,153,0.5)]" style={{height: '75%', animationDelay: '0.4s'}}></div>
           <div className="chart-bar w-8 bg-emerald-300 rounded-t-md shadow-[0_0_15px_rgba(110,231,183,0.5)]" style={{height: '100%', animationDelay: '0.6s'}}></div>
           
           {/* Grid Lines for effect */}
           <div className="absolute inset-0 border-b border-l border-white/20 pointer-events-none"></div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4 text-center tracking-wide uppercase">
          {isAppLoading ? "Initializing System" : "Auditing Financials"}
        </h2>
        <div className="h-16 flex items-center justify-center">
            <p className="text-emerald-400 text-xl font-bold font-mono animate-pulse text-center max-w-lg leading-tight px-4">
            > {loadingPhrase}_
            </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-900 pb-32 font-sans text-gray-900 dark:text-white transition-colors duration-300">
      
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #root, #root * {
            visibility: visible;
          }
          #root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* Hide non-printable areas */
          nav, button, .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
             display: block !important;
          }
          /* Reset dark mode colors for print */
          .dark {
            color-scheme: light;
          }
          .dark * {
            color: black !important;
            background-color: white !important;
            border-color: #ddd !important;
          }
          .card-container {
             box-shadow: none !important;
             border: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 pt-10 pb-20 px-4 shadow-xl print:hidden">
        <div className="max-w-xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-6 sm:gap-0">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-start">
              {/* Symbolic Logo */}
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-white/20 overflow-hidden flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <circle cx="50" cy="50" r="48" fill="black" />
                  <circle cx="50" cy="50" r="32" fill="white" />
                  <circle cx="50" cy="50" r="14" fill="black" />
                </svg>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
                <h1 className="text-xl font-bold text-white tracking-tight leading-tight">
                  FranchisePro
                </h1>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">Franchise Investment Calculator</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600 text-yellow-400 hover:text-yellow-300 border border-gray-600 backdrop-blur-sm transition-all"
                aria-label="Toggle Dark Mode"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Currency Selector */}
              <div className="relative flex-grow sm:flex-grow-0">
                <select
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value as CurrencyCode)}
                  className="w-full sm:w-auto appearance-none bg-gray-700/50 hover:bg-gray-600 border border-gray-600 text-white text-xs font-bold py-2.5 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer backdrop-blur-sm"
                >
                  {Object.values(CURRENCIES).map((curr) => (
                    <option key={curr.code} value={curr.code} className="bg-gray-800 text-white">
                      {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
              </div>
            </div>
          </div>
          
          {/* Quick Summary Card - Floating */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-2xl">
            <div className="flex justify-between items-end text-blue-100">
              <div>
                <p className="text-xs uppercase font-bold tracking-wider mb-1 text-blue-200">Estimated Annual Profit</p>
                <p className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${metrics.netProfit > 0 ? 'text-white' : 'text-red-300'}`}>
                  {formatCurrency(metrics.netProfit)}
                </p>
              </div>
              <div className="text-right">
                 <p className="text-xs uppercase font-bold mb-1 text-blue-200">Margin</p>
                 <div className="inline-flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded text-green-300 font-bold border border-green-500/30">
                   <TrendingUp size={14} />
                   {metrics.margin.toFixed(1)}%
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-xl mx-auto px-4 -mt-12 relative z-10 print:mt-0 print:max-w-full">
        
        {/* Navigation Tabs */}
        <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1.5 shadow-sm border border-gray-200 dark:border-gray-700 mb-6 print:hidden">
          <button 
            onClick={() => setActiveTab('input')}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${activeTab === 'input' ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <DollarSign size={16} /> Inputs & Analysis
          </button>
          <button 
            onClick={() => setActiveTab('results')}
            disabled={!bankerData} // Require calculation first
            className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${activeTab === 'results' ? 'bg-gray-900 dark:bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'}`}
          >
            <BarChart3 size={16} /> Detailed Report
          </button>
        </div>

        {activeTab === 'input' && (
          <div className="space-y-6">
            {/* Location Intelligence Section */}
            <Card className="border-blue-100 dark:border-blue-900 shadow-blue-50/50 dark:shadow-none">
              <div className="p-5 border-b border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/20">
                <h2 className="text-lg font-bold text-gray-900 dark:text-blue-100 flex items-center gap-2">
                  <MapPin size={20} className="text-blue-700 dark:text-blue-400"/> 
                  Location Intelligence
                </h2>
                <p className="text-sm text-gray-600 dark:text-blue-200 mt-1 font-medium">Context for the Investment Audit</p>
              </div>
              
              <div className="p-5">
                {/* Industry Input */}
                <div className="mb-5">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">Industry / Business Type</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="text-gray-400" size={18} />
                    </div>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Coffee Shop, Gym, Pizza Franchise"
                      className="block w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 font-medium"
                    />
                  </div>
                </div>

                {/* Location Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">
                      Target Location 
                      <span className="text-red-500 dark:text-red-400 ml-1" title="Mandatory">*</span>
                    </label>
                    
                    <button 
                      onClick={handleUseMyLocation}
                      disabled={isLocating}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md"
                    >
                      {isLocating ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <LocateFixed size={12} />
                      )}
                      Detect Location (GPS)
                    </button>
                  </div>
                  
                  {/* Unified Location Bar */}
                  <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-600 overflow-hidden mb-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="text-gray-400" size={18} />
                      </div>
                      <input
                        type="text"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        placeholder="City / Region"
                        className="block w-full pl-10 pr-3 py-3 bg-transparent text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 font-medium"
                      />
                    </div>
                    
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="text-gray-400" size={18} />
                      </div>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="Country"
                        className="block w-full pl-10 pr-3 py-3 bg-transparent text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 font-medium"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleLocationSearch}
                    disabled={isAnalyzing || !locationQuery || !country}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-3 rounded-lg font-bold transition-colors flex items-center justify-center shadow-sm gap-2"
                  >
                    {isAnalyzing ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
                    Analyze Location Potential
                  </button>
                </div>

                {locationData && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-3 font-medium">
                      {locationData.text}
                    </p>
                    {locationData.mapSources.length > 0 && (
                       <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                         {locationData.mapSources.map((source, idx) => (
                           <a 
                             key={idx} 
                             href={source.uri} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="inline-flex items-center gap-1 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 px-2 py-1 rounded text-blue-700 dark:text-blue-300 hover:text-blue-900 hover:border-blue-400 transition-colors font-medium"
                           >
                             <MapPin size={10} /> {source.title.length > 25 ? source.title.substring(0, 25) + '...' : source.title}
                           </a>
                         ))}
                       </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-600 dark:text-emerald-400"/> Initial Investment
              </h2>
              <InputGroup label="Franchise Fee/ Initiation Fee" value={franchiseFee} onChange={setFranchiseFee} prefix={currency.symbol} />
              <InputGroup label="Build-Out / Renovation" value={buildOut} onChange={setBuildOut} prefix={currency.symbol} />
              <InputGroup label="Equipment & Inventory" value={equipment} onChange={setEquipment} prefix={currency.symbol} />
              <InputGroup label="Working Capital" value={workingCapital} onChange={setWorkingCapital} prefix={currency.symbol} hint="First 6mo cash" />
              <InputGroup label="Contract Term" value={contractTerm} onChange={setContractTerm} prefix="#" hint="Years" />

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="font-bold text-gray-700 dark:text-gray-300">Total Upfront</span>
                <span className="font-bold text-xl text-gray-900 dark:text-white">{formatCurrency(metrics.totalInvestment)}</span>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-violet-600 dark:text-violet-400"/> Revenue Drivers
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputGroup label="Avg Ticket" value={avgTicket} onChange={setAvgTicket} prefix={currency.symbol} />
                <InputGroup label="Daily Cust." value={dailyCust} onChange={setDailyCust} prefix="#" />
              </div>
              <InputGroup label="Days Open / Year" value={daysOpen} onChange={setDaysOpen} prefix="#" />
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center bg-gray-50 dark:bg-gray-700/30 py-3 rounded border border-gray-200 dark:border-gray-600">
                Est. Monthly Sales: <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(metrics.annualRevenue / 12)}</span>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-orange-600 dark:text-orange-400"/> Monthly Expenses
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputGroup label="COGS %" value={cogsPercent} onChange={setCogsPercent} prefix="%" />
                <InputGroup label="Labor %" value={laborPercent} onChange={setLaborPercent} prefix="%" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputGroup label="Royalty %" value={royaltyPercent} onChange={setRoyaltyPercent} prefix="%" />
                <InputGroup label="Marketing %" value={marketingPercent} onChange={setMarketingPercent} prefix="%" />
              </div>
              <InputGroup label="Rent & Utilities" value={rentMonthly} onChange={setRentMonthly} prefix={currency.symbol} />
              <InputGroup label="Salaries & Wages" value={salariesMonthly} onChange={setSalariesMonthly} prefix={currency.symbol} hint="Fixed monthly (Manager/Admin)" />
              <InputGroup label="Misc / Insurance" value={miscMonthly} onChange={setMiscMonthly} prefix={currency.symbol} />
            </Card>
            
            <button 
              onClick={handleCalculateProfitability}
              disabled={!locationQuery.trim() || !country.trim()}
              className="w-full py-4 bg-gray-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-gray-400 dark:shadow-gray-900/50 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
            >
              Calculate Profitability <ChevronRight size={20} />
            </button>
            {(!locationQuery.trim() || !country.trim()) && (
               <p className="text-center text-red-500 dark:text-red-400 text-sm font-bold -mt-2">
                 * Please complete Location and Country fields to proceed
               </p>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-4">
            
            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
              <Card className="p-4 bg-white dark:bg-gray-800 border-l-4 border-l-orange-400 shadow-md">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Break Even</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white my-1">{metrics.breakEvenMonths.toFixed(1)}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Months</p>
              </Card>
              <Card className="p-4 bg-white dark:bg-gray-800 border-l-4 border-l-green-500 shadow-md">
                 <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Annual ROI</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400 my-1">
                  {metrics.roiYears > 0 ? (100 / metrics.roiYears).toFixed(1) + '%' : '0%'}
                </p>
                 <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Return Rate</p>
              </Card>
            </div>

            {/* Operational Profitability Target (10% Net Margin) */}
            <Card className="p-5 border-l-4 border-l-purple-600 shadow-md print:hidden">
              <div className="flex items-center gap-2 mb-3">
                <Target size={22} className="text-purple-700 dark:text-purple-400" />
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Operational Safety Target</h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 font-medium">
                To achieve a <span className="font-bold text-purple-800 dark:text-purple-300">pure net profit of 10% on revenue</span> (after all expenses), you need:
              </p>
              
              <div className="flex items-end gap-3 mb-2">
                 <p className="text-3xl font-bold text-gray-900 dark:text-white">{Math.ceil(metrics.requiredDailyCustomersForMargin)}</p>
                 <p className="text-sm text-gray-600 dark:text-gray-400 pb-1 font-semibold">Customers / Day</p>
              </div>

              {metrics.requiredDailyCustomersForMargin > 0 ? (
                <div className="mt-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-600 dark:text-gray-300 font-medium">Current Projection:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{dailyCust} / day</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-gray-600 dark:text-gray-300 font-medium">Gap:</span>
                     <span className={`font-bold ${dailyCust >= metrics.requiredDailyCustomersForMargin ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                       {dailyCust >= metrics.requiredDailyCustomersForMargin ? '+' : ''}
                       {Math.round(dailyCust - metrics.requiredDailyCustomersForMargin)} / day
                     </span>
                  </div>
                </div>
              ) : (
                <p className="text-red-600 dark:text-red-400 text-sm italic mt-2 font-medium">
                  Impossible with current margins. Variable costs > 90%.
                </p>
              )}
            </Card>

            <Card className="p-5 shadow-md print:hidden">
              <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-lg">Year 1 Visualization</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 font-medium">Revenue vs Expenses vs Profit</p>
              <AnalysisChart metrics={metrics} currency={currency} isDarkMode={isDarkMode} />
            </Card>

            <Card className="p-5 shadow-md print:hidden">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-lg">P&L Projections (Year 1)</h3>
              <ResultRow label="Gross Revenue" value={formatCurrency(metrics.annualRevenue)} />
              <ResultRow label="COGS & Labor" value={`-${formatCurrency(metrics.annualRevenue * ((Number(cogsPercent)+Number(laborPercent))/100))}`} isPositive={false} />
              <ResultRow label="Royalties & Mktg" value={`-${formatCurrency(metrics.annualRevenue * ((Number(royaltyPercent)+Number(marketingPercent))/100))}`} isPositive={false} />
              <ResultRow label="Fixed Costs (Rent/Salaries/Misc)" value={`-${formatCurrency((Number(rentMonthly) + Number(salariesMonthly) + Number(miscMonthly)) * 12)}`} isPositive={false} />
              <ResultRow label="Net Operating Income" value={formatCurrency(metrics.netProfit)} highlight={true} isPositive={metrics.netProfit > 0} />
            </Card>

            <Card className="p-5 shadow-md print:hidden">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">Investment Recovery</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">Time to recover <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(metrics.totalInvestment)}</span>.</p>
              
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-bold inline-block py-1 px-2 uppercase rounded-full text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-200">
                      Timeline
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold inline-block text-blue-700 dark:text-blue-400">
                      {metrics.roiYears.toFixed(1)} Years
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2.5 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                  <div 
                    style={{ width: metrics.roiYears > 0 ? `${Math.min(100, (1/metrics.roiYears)*100)}%` : '0%' }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-1000"
                  ></div>
                </div>
              </div>
            </Card>

             {/* PitStop Studios Audit Section */}
             {bankerData && (
              <Card className="bg-white dark:bg-gray-800 text-black-700 border-2 border-black dark:border-gray-600 overflow-hidden relative shadow-2xl mt-8 mb-8 print:hidden">
                {/* Header */}
                <div className="bg-slate-900 p-5 border-b border-black dark:border-gray-600 flex justify-between items-center relative z-10">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold font-serif text-lg">P</div>
                     <div>
                       <h3 className="font-bold text-xl tracking-wide text-white">PitStop Studios</h3>
                       <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">Investment Audit</p>
                     </div>
                   </div>
                   <VerdictBadge verdict={bankerData.verdict} />
                </div>

                <div className="p-6 relative z-10">
                  
                  {/* The Reality Check */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                       <AlertCircle size={18} className="text-red-500" />
                       <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">The Reality Check</h4>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-1.5 bg-red-500 rounded-full flex-shrink-0 min-h-[50px]"></div>
                        <p className="text-base sm:text-lg text-gray-800 dark:text-gray-200 font-medium leading-relaxed italic">
                        "{bankerData.realityCheck}"
                        </p>
                    </div>
                  </div>

                  {/* The Stress Test */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                       <Zap size={18} className="text-amber-600 dark:text-amber-400" />
                       <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">The Stress Test</h4>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl text-amber-900 dark:text-amber-100 text-sm font-medium leading-relaxed">
                        {bankerData.stressTest}
                    </div>
                  </div>

                  {/* Insider Intel (New) */}
                  <div className="mb-8">
                     <div className="flex items-center gap-2 mb-3">
                       <Lock size={18} className="text-slate-600 dark:text-slate-400" />
                       <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Insider Intel</h4>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-xl text-slate-700 dark:text-slate-200 text-sm font-medium leading-relaxed border border-slate-200 dark:border-slate-600 relative">
                        {/* Stamp Effect */}
                        <div className="absolute top-2 right-2 opacity-10 pointer-events-none select-none">
                            <div className="border-2 border-black dark:border-white p-1 rounded transform rotate-12">
                                <span className="text-[10px] font-black uppercase">Confidential</span>
                            </div>
                        </div>
                        {bankerData.insiderIntel}
                    </div>
                  </div>

                   {/* Quantitative Audit Gap Analysis */}
                  {dailyCust < metrics.requiredDailyCustomers && (
                     <div className="mb-8 bg-slate-500 text-white p-4 rounded-xl flex items-start gap-3 shadow-sm">
                       <div className="mt-0.5 text-red-200"><TrendingUp size={18} className="rotate-180" /></div>
                       <p className="text-sm font-medium leading-relaxed">
                         <span className="font-bold text-red-100">Gap Analysis:</span> You are underperforming by <span className="font-bold text-white text-lg mx-1">{Math.ceil(metrics.requiredDailyCustomers - dailyCust)}</span> daily customers against the Aggressive Wealth Building target.
                       </p>
                     </div>
                  )}

                  {/* Strategic Fixes (New) */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                       <CheckSquare size={18} className="text-emerald-600 dark:text-emerald-400" />
                       <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Strategic Fixes</h4>
                    </div>
                    <ul className="space-y-2">
                        {bankerData.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                <div className="mt-1 w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                                    {index + 1}
                                </div>
                                <span>{rec}</span>
                            </li>
                        ))}
                    </ul>
                  </div>

                  {/* The Corleone Pitch */}
                  <div className="bg-[#94a3b8] dark:bg-slate-700 rounded-xl p-6 shadow-md text-white border border-slate-300 dark:border-slate-600 mb-6">
                    <div className="flex justify-between items-center mb-4 border-b border-white/30 pb-3">
                       <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Briefcase size={16} /> The Pitch
                      </p>
                      <button className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded transition-colors font-bold uppercase tracking-wide">
                        Copy for Deck
                      </button>
                    </div>
                    <p className="text-base text-white font-serif italic leading-relaxed">
                      "{bankerData.pitch}"
                    </p>
                  </div>

                   {/* The Closer / Upsell */}
                  <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
                    <p className="text-gray-700 dark:text-gray-300 text-sm italic mb-4 leading-relaxed px-4">
                      "{bankerData.closer.replace("Corporate VPs ('Jay' Persona)", "your investors")}"
                    </p>
                    <a href="#" className="inline-flex items-center gap-2 bg-black dark:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 dark:hover:bg-blue-700 transition-transform active:scale-95 shadow-lg">
                      <ExternalLink size={18} />
                      Download Franchise Scale Deck
                    </a>
                  </div>

                </div>
              </Card>
            )}

            {/* Custom Report Generation Section */}
            <ReportGenerator 
              metrics={metrics} 
              currency={currency} 
              industry={industry} 
              location={`${locationQuery}, ${country}`}
            />

          </div>
        )}
      </div>
    </div>
  );
}
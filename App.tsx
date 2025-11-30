import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Plus, TrendingUp, DollarSign, PieChart as PieChartIcon, AlertCircle, Bot } from 'lucide-react';
import { Period, DailyRecord, FinancialSummary, GoalSettings } from './types';
import * as StorageService from './services/storage';
import * as GeminiService from './services/geminiService';
import RecordModal from './components/RecordModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';

// --- Helper Functions ---

const getStartOfPeriod = (date: Date, period: Period): Date => {
  const d = new Date(date);
  if (period === 'week') {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
  } else if (period === 'month') {
    d.setDate(1);
  } else if (period === 'year') {
    d.setMonth(0, 1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
};

const filterRecordsByPeriod = (records: DailyRecord[], period: Period): DailyRecord[] => {
  const now = new Date();
  const start = getStartOfPeriod(now, period);
  return records.filter(r => new Date(r.date) >= start && new Date(r.date) <= now);
};

const calculateSummary = (records: DailyRecord[]): FinancialSummary => {
  let totalGmv = 0;
  let totalRefunds = 0;
  let totalCogs = 0;
  let totalAds = 0;
  let totalShipping = 0;
  let totalFees = 0;
  let totalOthers = 0;

  records.forEach(r => {
    totalGmv += r.gmv;
    totalRefunds += (r.refundsOnly + r.returns);
    totalCogs += r.cogs;
    totalAds += r.ads;
    totalShipping += r.shipping;
    totalFees += r.platformFees;
    totalOthers += r.otherCosts;
  });

  const netSales = totalGmv - totalRefunds;
  const totalCost = totalCogs + totalAds + totalShipping + totalFees + totalOthers;
  const netProfit = netSales - totalCost;
  
  // Gross Profit for Margin calc: Usually Net Sales - COGS
  const grossProfit = netSales - totalCogs; 
  const grossMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  return {
    totalGmv,
    netSales,
    totalCost,
    netProfit,
    grossMarginPercent,
    roi,
    costBreakdown: {
      cogs: totalCogs,
      ads: totalAds,
      shipping: totalShipping,
      fees: totalFees,
      others: totalOthers
    }
  };
};

// --- Components (Internal for simplicity in this structure) ---

const StatCard: React.FC<{ 
  title: string; 
  value: string; 
  subValue?: string; 
  subLabel?: string;
  icon: React.ReactNode; 
  trend?: string;
  colorClass: string;
}> = ({ title, value, subValue, subLabel, icon, trend, colorClass }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
        {React.cloneElement(icon as React.ReactElement, { className: `w-5 h-5 ${colorClass.replace('bg-', 'text-')}` })}
      </div>
      {trend && (
         <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 flex items-center">
            <TrendingUp size={12} className="mr-1" /> {trend}
         </span>
      )}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
      {subValue && (
        <p className="text-xs text-gray-400 mt-2 flex items-center justify-between">
           <span>{subLabel}</span>
           <span className="font-mono text-gray-600">{subValue}</span>
        </p>
      )}
    </div>
  </div>
);

const ProgressBar: React.FC<{ label: string; value: number; total: number; color: string }> = ({ label, value, total, color }) => {
  const percent = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div className="mb-4 group">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-600 font-medium group-hover:text-gray-900 transition-colors">{label}</span>
        <span className="font-mono text-gray-700">¥{value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-2.5 rounded-full ${color} transition-all duration-700 ease-out`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};

export default function App() {
  const [period, setPeriod] = useState<Period>('week');
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [goals, setGoals] = useState<GoalSettings>({ weekly: 10000, monthly: 50000, yearly: 600000 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  useEffect(() => {
    // Load initial data
    setRecords(StorageService.getRecords());
    setGoals(StorageService.getGoals());
  }, []);

  const handleSaveRecord = (record: DailyRecord) => {
    StorageService.saveRecord(record);
    setRecords(StorageService.getRecords());
  };

  const filteredRecords = useMemo(() => filterRecordsByPeriod(records, period), [records, period]);
  const summary = useMemo(() => calculateSummary(filteredRecords), [filteredRecords]);

  // Goal logic
  const currentGoal = period === 'week' ? goals.weekly : period === 'month' ? goals.monthly : goals.yearly;
  const goalProgress = Math.min((summary.netProfit / currentGoal) * 100, 100);

  // Chart Data Preparation (Reverse for display left-to-right)
  const chartData = useMemo(() => {
    return [...filteredRecords].reverse().map(r => ({
       name: r.date.slice(5), // MM-DD
       Revenue: (r.gmv - r.refundsOnly - r.returns),
       Profit: (r.gmv - r.refundsOnly - r.returns) - (r.cogs + r.ads + r.shipping + r.platformFees + r.otherCosts)
    }));
  }, [filteredRecords]);

  const runAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    setAiAnalysis(null);
    const trendDesc = `Over the last ${filteredRecords.length} entries, revenue has fluctuated. Total profit is ${summary.netProfit}.`;
    const result = await GeminiService.analyzeBusiness(summary, period, trendDesc);
    setAiAnalysis(result);
    setIsAiAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 pb-12">
      {/* --- Top Navigation --- */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">
               <TrendingUp size={18} />
             </div>
             <div>
               <h1 className="text-lg font-bold text-gray-900 leading-tight">电商记账本</h1>
               <p className="text-xs text-gray-400">Profit Master</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <button className="text-gray-400 hover:text-gray-600">
               <Settings size={20} />
             </button>
             <button 
               onClick={() => setIsModalOpen(true)}
               className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm shadow-emerald-200 transition-all"
             >
               <Plus size={16} />
               记一笔
             </button>
          </div>
        </div>
      </nav>

      {/* --- Main Content --- */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Period Selector */}
        <div className="flex justify-center">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 inline-flex">
            {(['week', 'month', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  period === p 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {p === 'week' ? '本周' : p === 'month' ? '本月' : '本年'}
              </button>
            ))}
          </div>
        </div>

        {/* Goal Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <TrendingUp size={120} />
          </div>
          <div className="flex justify-between items-end mb-4 relative z-10">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">{period === 'week' ? '本周' : period === 'month' ? '本月' : '本年'}目标达成率</p>
              <h2 className="text-5xl font-bold text-gray-900 tracking-tight">{goalProgress.toFixed(1)}%</h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">目标: ¥{currentGoal.toLocaleString()}</p>
              {goalProgress >= 100 ? (
                 <span className="text-emerald-500 font-bold flex items-center gap-1">已达成 🚀</span>
              ) : (
                 <span className="text-orange-500 font-bold">进行中...</span>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden relative z-10">
            <div 
              className="h-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all duration-1000 ease-out" 
              style={{ width: `${goalProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatCard 
             title="总销售额 (GMV)" 
             value={`¥${summary.totalGmv.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`} 
             icon={<DollarSign />} 
             colorClass="bg-blue-500" 
             trend="+0.0%" 
           />
           <StatCard 
             title="净利润 (Net Profit)" 
             value={`¥${summary.netProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`} 
             icon={<TrendingUp />} 
             colorClass="bg-emerald-500" 
             trend="+0.0%" 
           />
           <StatCard 
             title="毛利率 (Gross Margin)" 
             value={`${summary.grossMarginPercent.toFixed(1)}%`} 
             subLabel="毛利额"
             subValue={`¥${(summary.netSales - summary.costBreakdown.cogs).toLocaleString()}`}
             icon={<PieChartIcon />} 
             colorClass="bg-purple-500" 
           />
           <StatCard 
             title="净利率 (ROI)" 
             value={`${summary.roi.toFixed(1)}%`} 
             subLabel="目标"
             subValue="20%"
             icon={<AlertCircle />} 
             colorClass="bg-orange-500" 
             trend="Safe"
           />
        </div>

        {/* Chart Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[300px]">
          <h3 className="text-lg font-bold text-gray-800 mb-6">收支趋势图 (Trends)</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: '#94a3b8', fontSize: 12}} 
                   dy={10}
                />
                <YAxis 
                   hide={false} 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: '#94a3b8', fontSize: 12}}
                   tickFormatter={(val) => `¥${val/1000}k`}
                />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Revenue" name="销售额" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Profit" name="净利润" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Split: Costs & AI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* Cost Structure */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="text-lg font-bold text-gray-800 mb-6">成本构成 (Cost Breakdown)</h3>
             <ProgressBar label="采购成本 (COGS)" value={summary.costBreakdown.cogs} total={summary.totalCost} color="bg-red-500" />
             <ProgressBar label="广告推广 (Ads)" value={summary.costBreakdown.ads} total={summary.totalCost} color="bg-orange-500" />
             <ProgressBar label="物流配送 (Shipping)" value={summary.costBreakdown.shipping} total={summary.totalCost} color="bg-blue-400" />
             <ProgressBar label="平台扣点 (Fees)" value={summary.costBreakdown.fees} total={summary.totalCost} color="bg-purple-400" />
             <ProgressBar label="其他支出 (Others)" value={summary.costBreakdown.others} total={summary.totalCost} color="bg-gray-400" />
           </div>

           {/* AI Analyst */}
           <div className="bg-[#1E1E2E] rounded-2xl p-1 shadow-lg flex flex-col relative overflow-hidden text-white">
             {/* Background glow effects */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

             <div className="p-6 flex-1 flex flex-col h-full bg-[#1E1E2E]/90 backdrop-blur-sm rounded-xl">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-indigo-500/20 rounded-lg">
                   <Bot className="text-indigo-400" />
                 </div>
                 <div>
                   <h3 className="text-lg font-bold text-white">AI 经营分析师</h3>
                   <p className="text-xs text-gray-400">基于 Gemini 的智能诊断 (Powered by Gemini)</p>
                 </div>
               </div>

               <div className="bg-white/5 rounded-xl p-4 flex-1 mb-4 overflow-y-auto min-h-[160px] text-sm leading-relaxed border border-white/10 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  {isAiAnalyzing ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                       <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                       <span className="animate-pulse">正在分析数据... (Analyzing...)</span>
                    </div>
                  ) : aiAnalysis ? (
                    <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                      {aiAnalysis}
                    </ReactMarkdown>
                  ) : (
                    <div className="text-center h-full flex flex-col items-center justify-center text-gray-500">
                      <p>点击下方按钮，让 AI 为您分析当前周期的盈利状况和优化建议。</p>
                    </div>
                  )}
               </div>

               <button 
                 onClick={runAiAnalysis}
                 disabled={isAiAnalyzing}
                 className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium py-3 rounded-lg shadow-lg shadow-indigo-500/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
               >
                 {isAiAnalyzing ? '分析中...' : '生成诊断报告 (Generate Report)'}
               </button>
             </div>
           </div>
        </div>

      </main>

      <RecordModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveRecord} 
      />
    </div>
  );
}

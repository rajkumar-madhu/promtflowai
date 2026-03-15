import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  Activity, 
  Code, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap
} from 'lucide-react';
import { motion } from 'motion/react';

interface AnalyticsData {
  stats: {
    modality: string;
    count: number;
    total_units: number;
    total_cost: number;
  }[];
  dailyUsage: {
    date: string;
    modality: string;
    cost: number;
  }[];
}

const COLORS = {
  text: '#60A5FA',
  code: '#A78BFA',
  image: '#F472B6',
  video: '#FB923C'
};

const MODALITY_LABELS: Record<string, string> = {
  text: 'IT & General',
  code: 'Code Generation',
  image: 'Image Synthesis',
  video: 'Video Processing'
};

const MODALITY_ICONS: Record<string, any> = {
  text: FileText,
  code: Code,
  image: ImageIcon,
  video: Video
};

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics');
        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error('Failed to fetch analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!data) return null;

  const stats = data.stats || [];
  const dailyUsage = data.dailyUsage || [];
  const totalCost = stats.reduce((acc, curr) => acc + curr.total_cost, 0);
  const totalRequests = stats.reduce((acc, curr) => acc + curr.count, 0);

  // Transform daily usage for AreaChart
  const chartDataMap: Record<string, any> = {};
  dailyUsage.forEach(item => {
    if (!chartDataMap[item.date]) {
      chartDataMap[item.date] = { date: item.date };
    }
    chartDataMap[item.date][item.modality] = item.cost;
  });
  const chartData = Object.values(chartDataMap);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#0A0A0A] min-h-full text-white font-sans">
      <header className="flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Service Analytics</h1>
          <p className="text-white/40 text-sm italic font-serif">Usage metrics and consumption monitoring</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Last Updated</div>
          <div className="text-xs font-mono">{new Date().toLocaleString()}</div>
        </div>
      </header>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Consumption" 
          value={`$${totalCost.toFixed(4)}`} 
          icon={DollarSign} 
          trend="+12.5%" 
          trendUp={true}
        />
        <StatCard 
          title="Total Requests" 
          value={totalRequests.toString()} 
          icon={Activity} 
          trend="+5.2%" 
          trendUp={true}
        />
        <StatCard 
          title="Active Services" 
          value={stats.length.toString()} 
          icon={Zap} 
          trend="Stable" 
          trendUp={null}
        />
        <StatCard 
          title="Avg. Latency" 
          value="1.2s" 
          icon={Clock} 
          trend="-0.3s" 
          trendUp={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Cost Trends (7 Days)</h3>
            <div className="flex gap-4">
              {Object.entries(COLORS).map(([mod, color]) => (
                <div key={mod} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-[10px] uppercase font-bold text-white/40">{MODALITY_LABELS[mod]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  {Object.entries(COLORS).map(([mod, color]) => (
                    <linearGradient key={mod} id={`grad-${mod}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis stroke="#ffffff20" fontSize={10} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                />
                {Object.keys(COLORS).map(mod => (
                  <Area 
                    key={mod}
                    type="monotone" 
                    dataKey={mod} 
                    stackId="1" 
                    stroke={COLORS[mod as keyof typeof COLORS]} 
                    fill={`url(#grad-${mod})`} 
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-8">Service Distribution</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="total_cost"
                  nameKey="modality"
                >
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.modality as keyof typeof COLORS] || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                   itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span className="text-[10px] uppercase font-bold text-white/40">{MODALITY_LABELS[value] || value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {stats.map(stat => {
              const Icon = MODALITY_ICONS[stat.modality] || Activity;
              return (
                <div key={stat.modality} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5">
                      <Icon className="w-4 h-4" style={{ color: COLORS[stat.modality as keyof typeof COLORS] }} />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{MODALITY_LABELS[stat.modality]}</div>
                      <div className="text-[10px] text-white/40 uppercase">{stat.count} Requests</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold">${stat.total_cost.toFixed(4)}</div>
                    <div className="text-[10px] text-white/20 uppercase">Total Cost</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Consumption Log</h3>
          <button className="text-[10px] font-bold uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Service</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Units</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Cost</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Efficiency</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.map(stat => (
                <tr key={stat.modality} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[stat.modality as keyof typeof COLORS] }}></div>
                      <span className="text-xs font-bold">{MODALITY_LABELS[stat.modality]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-white/60">
                    {stat.total_units.toLocaleString()} {stat.modality === 'text' || stat.modality === 'code' ? 'Tokens' : 'Gens'}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono font-bold text-white">
                    ${stat.total_cost.toFixed(4)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500/50" 
                        style={{ width: `${Math.min(100, (stat.total_cost / totalCost) * 200)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: any;
  trend: string;
  trendUp: boolean | null;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp }) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group"
  >
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon className="w-12 h-12" />
    </div>
    <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">{title}</div>
    <div className="text-2xl font-bold tracking-tight mb-2">{value}</div>
    <div className="flex items-center gap-2">
      {trendUp !== null && (
        trendUp ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 text-rose-500" />
      )}
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-wider",
        trendUp === true ? "text-emerald-500" : trendUp === false ? "text-rose-500" : "text-white/20"
      )}>
        {trend}
      </span>
    </div>
  </motion.div>
);

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

import React from 'react';
import {
    TrendingUp,
    Users,
    DollarSign,
    Activity,
    MoreHorizontal,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Bell
} from 'lucide-react';
import ModernBadge from '../../components/common/ModernBadge';

// Mock Data
const KPIS = [
    {
        label: 'Total Revenue',
        value: '$124,500',
        change: '+12.5%',
        trend: 'up',
        color: 'from-indigo-500 to-violet-500'
    },
    {
        label: 'Active Projects',
        value: '45',
        change: '+3 new',
        trend: 'up',
        color: 'from-blue-400 to-cyan-400'
    },
    {
        label: 'Pending Tasks',
        value: '12',
        change: '-2.4%',
        trend: 'down',
        color: 'from-amber-400 to-orange-400'
    },
    {
        label: 'Team Velocity',
        value: '94%',
        change: '+1.2%',
        trend: 'up',
        color: 'from-emerald-400 to-teal-500'
    }
];

const RECENT_ACTIVITY = [
    { user: 'Sarah Connor', action: 'completed task', target: 'Homepage Redesign', time: '2h ago', avatar: 'SC' },
    { user: 'John Doe', action: 'commented on', target: 'API Integration', time: '4h ago', avatar: 'JD' },
    { user: 'Mike Smith', action: 'uploaded file', target: 'Q4 Report.pdf', time: '5h ago', avatar: 'MS' },
];

const ModernDashboardPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Overview
                    </h1>
                    <p className="text-slate-500 mt-1">Welcome back, here's what's happening today.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64 shadow-sm"
                        />
                    </div>
                    <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                    </button>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5">
                        New Project
                    </button>
                </div>
            </header>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {KPIS.map((kpi, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                        {/* Background Decor */}
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${kpi.color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />

                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${kpi.color} text-white shadow-lg shadow-indigo-500/10`}>
                                <Activity className="w-5 h-5" />
                            </div>
                            {kpi.trend === 'up' ? (
                                <div className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-full">
                                    <ArrowUpRight className="w-3 h-3 mr-1" />
                                    {kpi.change}
                                </div>
                            ) : (
                                <div className="flex items-center text-rose-600 text-xs font-bold bg-rose-50 px-2 py-1 rounded-full">
                                    <ArrowDownRight className="w-3 h-3 mr-1" />
                                    {kpi.change}
                                </div>
                            )}
                        </div>

                        <h3 className="text-slate-500 text-sm font-medium">{kpi.label}</h3>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Main Content Grid (Bento Style) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Chart Area (Using CSS Bars for Demo) */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Performance Analytics</h2>
                            <p className="text-slate-500 text-sm">Revenue vs Expenses over time</p>
                        </div>
                        <div className="flex gap-2">
                            <select className="bg-slate-50 border-none text-sm font-semibold text-slate-600 rounded-lg px-3 py-1 focus:ring-0 cursor-pointer hover:bg-slate-100">
                                <option>This Year</option>
                                <option>Last Year</option>
                            </select>
                        </div>
                    </div>

                    <div className="h-64 flex items-end justify-between gap-2 md:gap-4 w-full px-2">
                        {[45, 78, 55, 90, 60, 85, 40, 70, 65, 95, 80, 50].map((h, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer">
                                <div
                                    className="w-full bg-indigo-50 rounded-t-lg relative overflow-hidden transition-all duration-300 group-hover:bg-indigo-100"
                                    style={{ height: '100%' }}
                                >
                                    <div
                                        className="absolute bottom-0 left-0 w-full bg-indigo-500 rounded-t-lg transition-all duration-500 ease-out group-hover:bg-indigo-600"
                                        style={{ height: `${h}%` }}
                                    ></div>
                                </div>
                                <span className="text-xs text-slate-400 font-medium group-hover:text-indigo-600">
                                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Activity & quick actions */}
                <div className="flex flex-col gap-6">

                    {/* Recent Activity */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
                            <button className="text-indigo-600 text-sm font-semibold hover:text-indigo-700">View All</button>
                        </div>

                        <div className="space-y-6">
                            {RECENT_ACTIVITY.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs ring-4 ring-slate-50">
                                        {item.avatar}
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-800">
                                            <span className="font-semibold">{item.user}</span> {item.action} <span className="text-indigo-600 font-medium">{item.target}</span>
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">{item.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-50">
                            <button className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl transition-colors">
                                Load More
                            </button>
                        </div>
                    </div>

                    {/* Mini Project Card */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-3xl shadow-xl shadow-indigo-500/20 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-6">
                                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                    <TrendingUp className="w-5 h-5 text-white" />
                                </div>
                                <ModernBadge label="High Priority" variant="warning" />
                            </div>

                            <h3 className="text-xl font-bold mb-1">Mobile App Redesign</h3>
                            <p className="text-indigo-100 text-sm mb-6">Due in 2 days</p>

                            <div className="w-full bg-black/20 rounded-full h-2 mb-2">
                                <div className="bg-white h-2 rounded-full w-3/4 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                            </div>
                            <div className="flex justify-between text-xs font-medium text-indigo-100">
                                <span>Progress</span>
                                <span>75%</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ModernDashboardPage;

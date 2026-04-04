import { Activity } from 'lucide-react'

export default function DashboardLoading() {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header skeleton */}
            <div className="border-b border-slate-800 pb-6 space-y-3">
                <div className="flex items-center gap-3">
                    <Activity className="h-8 w-8 text-blue-500/40 animate-pulse-slow" />
                    <div className="h-8 w-64 bg-surface-raised rounded-lg animate-pulse" />
                </div>
                <div className="h-4 w-96 max-w-full bg-surface-raised rounded animate-pulse" />
            </div>

            {/* Main grid skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Canvas placeholder */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-surface-raised border border-border rounded-3xl p-8 min-h-[400px] flex items-center justify-center animate-pulse">
                        <svg viewBox="0 0 200 180" className="w-48 h-48 opacity-10">
                            <polygon
                                points="100,10 10,170 190,170"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-slate-500"
                            />
                        </svg>
                    </div>
                    {/* Metric cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-surface-raised border border-border rounded-2xl p-5 space-y-2 animate-pulse">
                                <div className="h-3 w-16 bg-surface-overlay rounded" />
                                <div className="h-7 w-20 bg-surface-overlay rounded" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sidebar skeleton */}
                <div className="space-y-6">
                    <div className="bg-surface-raised border border-border rounded-3xl p-6 h-48 animate-pulse" />
                    <div className="bg-surface-raised border border-border rounded-3xl p-6 h-64 animate-pulse" />
                </div>
            </div>
        </div>
    )
}

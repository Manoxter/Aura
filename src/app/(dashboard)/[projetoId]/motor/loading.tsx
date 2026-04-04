import { Activity } from 'lucide-react'

export default function MotorLoading() {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header skeleton */}
            <div className="border-b border-slate-800 pb-6 space-y-3">
                <div className="flex items-center gap-3">
                    <Activity className="h-6 w-6 text-blue-500/40 animate-pulse-slow" />
                    <div className="h-7 w-48 bg-surface-raised rounded-lg animate-pulse" />
                </div>
                <div className="h-4 w-80 max-w-full bg-surface-raised rounded animate-pulse" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Triangle placeholder */}
                <div className="lg:col-span-2 bg-surface-raised border border-border rounded-2xl p-8 min-h-[350px] sm:min-h-[450px] flex items-center justify-center animate-pulse">
                    <svg viewBox="0 0 200 180" className="w-40 h-40 animate-pulse-slow">
                        <polygon
                            points="100,10 10,170 190,170"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeDasharray="6 4"
                            className="text-slate-600"
                        />
                        <circle cx="100" cy="117" r="3" className="text-slate-600 fill-current" />
                    </svg>
                </div>

                {/* Sidebar metrics skeleton */}
                <div className="space-y-6">
                    <div className="bg-surface-raised border border-border rounded-2xl p-6 space-y-4 animate-pulse">
                        <div className="h-4 w-32 bg-surface-overlay rounded" />
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex justify-between">
                                    <div className="h-3 w-24 bg-surface-overlay rounded" />
                                    <div className="h-3 w-16 bg-surface-overlay rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-surface-raised border border-border rounded-2xl p-6 h-40 animate-pulse" />
                    <div className="bg-surface-raised border border-border rounded-2xl p-6 h-32 animate-pulse" />
                </div>
            </div>
        </div>
    )
}

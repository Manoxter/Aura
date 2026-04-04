export default function SetupLoading() {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header skeleton */}
            <div className="border-b border-slate-800 pb-6 space-y-3">
                <div className="h-8 w-72 bg-surface-raised rounded-lg animate-pulse" />
                <div className="h-4 w-80 max-w-full bg-surface-raised rounded animate-pulse" />
            </div>

            {/* Stepper placeholder */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-2 shrink-0">
                        <div className="h-8 w-8 rounded-full bg-surface-raised animate-pulse" />
                        <div className="h-3 w-20 bg-surface-raised rounded animate-pulse hidden sm:block" />
                        {i < 5 && <div className="h-px w-6 bg-surface-overlay" />}
                    </div>
                ))}
            </div>

            {/* Content area */}
            <div className="bg-surface-raised border border-border rounded-2xl p-6 space-y-5 animate-pulse">
                <div className="h-5 w-48 bg-surface-overlay rounded" />
                <div className="space-y-3">
                    <div className="h-10 w-full bg-surface-overlay rounded-lg" />
                    <div className="h-10 w-full bg-surface-overlay rounded-lg" />
                    <div className="h-10 w-3/4 bg-surface-overlay rounded-lg" />
                </div>
                <div className="h-24 w-full bg-surface-overlay rounded-lg" />
            </div>

            {/* AI Insight placeholder */}
            <div className="bg-klauss-bg border border-klauss-border rounded-2xl p-6 h-32 animate-pulse" />
        </div>
    )
}

import { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { GabineteDeCrise } from '@/components/ia/GabineteDeCrise'
import { SkinProvider } from '@/components/SkinContext'
import { ProjectProvider } from '@/context/ProjectContext'

export default function ProjectDashboardLayout({ children }: { children: ReactNode }) {
    return (
        <ProjectProvider>
            <SkinProvider>
                <div className="flex min-h-screen bg-slate-950 text-slate-50 relative">
                    <Sidebar />
                    <main className="flex-1 overflow-x-hidden pt-16 px-4 pb-6 md:pt-8 md:px-8 relative">
                        {/* Story 6.7 — page transition: fade-in ao navegar entre seções */}
                        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
                            {children}
                        </div>
                    </main>
                    <GabineteDeCrise />
                </div>
            </SkinProvider>
        </ProjectProvider>
    )
}

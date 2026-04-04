import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Criar Conta',
  description:
    'Crie sua conta Aura e comece a gerenciar projetos com o motor CDT e zonas MATED.',
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

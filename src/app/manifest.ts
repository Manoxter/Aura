import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aura — Triângulo de Qualidade',
    short_name: 'AURA',
    description:
      'Gestão de projetos com motor CDT, zonas MATED e simulação what-if.',
    start_url: '/',
    display: 'standalone',
    theme_color: '#0f172a',
    background_color: '#0a0a0a',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}

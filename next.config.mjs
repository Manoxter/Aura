/** @type {import('next').NextConfig} */

// TRIQ-FIX-401: sanitizar vars PUBLIC no momento do build (antes do bake no bundle JS).
// Vars do Vercel Dashboard podem conter \n ou espaços embutidos de copy-paste.
// O replace aqui é aplicado em Node.js durante a compilação — o bundle recebe
// o valor já limpo, eliminando o 401 recorrente em auth/v1/token.
const sanitize = (v) => (v ?? '').replace(/\s/g, '')

const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    env: {
        NEXT_PUBLIC_SUPABASE_URL: sanitize(process.env.NEXT_PUBLIC_SUPABASE_URL),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: sanitize(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
};

export default nextConfig;

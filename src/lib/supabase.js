import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  // Ohne diese Prüfung wirft createClient beim Import und die ganze Seite bleibt weiss.
  console.error(
    'Supabase ist nicht konfiguriert: VITE_SUPABASE_URL und/oder VITE_SUPABASE_ANON_KEY fehlen. ' +
      'Siehe .env.example.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://not-configured.supabase.co',
  supabaseAnonKey || 'not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

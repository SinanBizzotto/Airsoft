import { createClient } from '@supabase/supabase-js'

/**
 * Diese beiden Werte sind bewusst öffentlich.
 *
 * Supabase liefert den Publishable Key an jeden Browser aus — er steht in jedem
 * Build im JavaScript und ist mit einem Rechtsklick auslesbar. Er ist kein
 * Geheimnis, sondern nur die Adressierung des Projekts. Der Schutz der Daten
 * liegt vollständig bei den Row-Level-Security-Policies, siehe
 * supabase/policies.sql.
 *
 * Sie stehen hier als Fallback, damit der Build ohne Zusatzkonfiguration läuft.
 * Sind bei Vercel Umgebungsvariablen gesetzt, gewinnen die — dann muss bei einem
 * Schlüsselwechsel nichts am Code geändert werden.
 *
 * Der Service-Role-Key gehört NIE hierher und auch in keine .env mit VITE_-Prefix.
 */
const PUBLIC_SUPABASE_URL = 'https://ohufjxsqqxazlmasmkbm.supabase.co'
const PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_Rsjlv24KZeFsLX7Pc34fNA_Qjc-cX6n'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  // Ohne diese Prüfung wirft createClient beim Import und die Seite bleibt weiss.
  console.error('Supabase ist nicht konfiguriert. Siehe .env.example.')
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

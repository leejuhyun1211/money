import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vvpeigyuzfjkwqdjxafr.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2cGVpZ3l1emZqa3dxZGp4YWZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzc5ODIsImV4cCI6MjA5MTcxMzk4Mn0._OP51L0EOpNijE6rplhlALh3WSV46HLco8LS43f617Q'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

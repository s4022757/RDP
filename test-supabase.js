import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  // Check auth status as a lightweight connection test
  const { data, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Connection failed:', error.message)
  } else {
    console.log('Successfully connected to Supabase!')
  }
}

testConnection()
// server/supa_db.js

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Service Role Key not found in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase Connected');

export default supabase;

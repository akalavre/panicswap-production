// supabaseClient.ts
console.log('!!! supabaseClient.ts: Module execution started at: ' + new Date().toISOString());

import { createClient } from '@supabase/supabase-js';
import config from '../config';

console.log('!!! supabaseClient.ts: Imports completed at: ' + new Date().toISOString());

const supabaseUrl = config.supabaseUrl;
const supabaseKey = config.supabaseServiceKey;

console.log('!!! supabaseClient.ts: Environment variables read at: ' + new Date().toISOString());

if (!supabaseUrl || !supabaseKey) {
  console.error('!!! supabaseClient.ts: Supabase URL or service key is MISSING!');
  throw new Error('Supabase URL or service key is not defined in environment variables.');
}

console.log('!!! supabaseClient.ts: About to create Supabase client at: ' + new Date().toISOString());
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('!!! supabaseClient.ts: Supabase client INSTANCE CREATED at: ' + new Date().toISOString());

export default supabase;
console.log('!!! supabaseClient.ts: Module execution finished, exporting client at: ' + new Date().toISOString());

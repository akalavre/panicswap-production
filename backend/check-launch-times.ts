import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkLaunchTimes() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Check rugcheck_reports for launch times
  const { data: reports, error } = await supabase
    .from('rugcheck_reports')
    .select('token_mint, launch_time')
    .not('launch_time', 'is', null)
    .order('launch_time', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching rugcheck reports:', error);
    return;
  }
  
  console.log(`\nFound ${reports?.length || 0} tokens with launch times:\n`);
  
  for (const report of reports || []) {
    const launchDate = new Date(report.launch_time);
    const ageMs = Date.now() - launchDate.getTime();
    const ageMinutes = Math.floor(ageMs / (1000 * 60));
    const ageHours = Math.floor(ageMinutes / 60);
    const ageDays = Math.floor(ageHours / 24);
    
    let ageStr = '';
    if (ageDays > 0) {
      ageStr = `${ageDays}d ${ageHours % 24}h`;
    } else if (ageHours > 0) {
      ageStr = `${ageHours}h ${ageMinutes % 60}m`;
    } else {
      ageStr = `${ageMinutes}m`;
    }
    
    console.log(`Token: ${report.token_mint}`);
    console.log(`  Launch: ${report.launch_time}`);
    console.log(`  Age: ${ageStr}\n`);
  }
  
  // Check how many tokens still need launch times
  const { count: missingCount } = await supabase
    .from('rugcheck_reports')
    .select('*', { count: 'exact', head: true })
    .is('launch_time', null);
    
  console.log(`\nTokens still missing launch time: ${missingCount || 0}`);
}

checkLaunchTimes().catch(console.error);
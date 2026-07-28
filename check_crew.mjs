import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rsomamqswbezhcaprbol.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzb21hbXFzd2JlemhjYXByYm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyOTY4NjksImV4cCI6MjA5Mjg3Mjg2OX0.w6kwFhcRBJ38CpP7LUIDzL1bZWJBRuEae-6XMXeS2nU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

(async () => {
  try {
    console.log('Fetching crew_members...');
    const { data, error } = await supabase
      .from('crew_members')
      .select('id, email, first_name, last_name, is_admin, role')
      .limit(20);
    
    if (error) {
      console.error('Error fetching crew_members:', error);
      process.exit(1);
    }
    
    console.log('\nCurrent crew_members:');
    console.table(data);
    
    // Check for admin users
    const admins = data.filter(m => m.is_admin);
    console.log(`\nAdmin users (is_admin=true): ${admins.length}`);
    admins.forEach(a => console.log(`  - ${a.email} (ID: ${a.id})`));
    
    // Check for nolanaisley@gmail.com
    const targetEmail = 'nolanaisley@gmail.com';
    const targetUser = data.find(m => m.email === targetEmail);
    if (targetUser) {
      console.log(`\n✓ Found ${targetEmail}:`);
      console.log(`  - ID: ${targetUser.id}`);
      console.log(`  - is_admin: ${targetUser.is_admin}`);
      console.log(`  - role: ${targetUser.role}`);
    } else {
      console.log(`\n✗ ${targetEmail} not found in crew_members`);
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();

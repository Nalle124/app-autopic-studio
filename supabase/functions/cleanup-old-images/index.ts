import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find jobs older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: oldJobs, error: selectError } = await supabase
      .from('processing_jobs')
      .select('id, final_url, project_id')
      .lt('created_at', sevenDaysAgo.toISOString());

    if (selectError) {
      throw selectError;
    }

    console.log(`Found ${oldJobs?.length || 0} jobs older than 7 days`);

    if (!oldJobs || oldJobs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, deleted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete storage files
    const filesToDelete: string[] = [];
    for (const job of oldJobs) {
      if (job.final_url) {
        // Extract filename from URL
        const urlParts = job.final_url.split('/');
        const filename = urlParts[urlParts.length - 1];
        if (filename) {
          filesToDelete.push(filename);
        }
      }
    }

    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('processed-cars')
        .remove(filesToDelete);

      if (storageError) {
        console.error('Storage delete error:', storageError);
      } else {
        console.log(`Deleted ${filesToDelete.length} files from storage`);
      }
    }

    // Delete jobs from database
    const jobIds = oldJobs.map(j => j.id);
    const { error: deleteJobsError } = await supabase
      .from('processing_jobs')
      .delete()
      .in('id', jobIds);

    if (deleteJobsError) {
      throw deleteJobsError;
    }

    // Find and delete empty projects (projects with no remaining jobs)
    const projectIds = [...new Set(oldJobs.filter(j => j.project_id).map(j => j.project_id))];
    
    for (const projectId of projectIds) {
      const { data: remainingJobs } = await supabase
        .from('processing_jobs')
        .select('id')
        .eq('project_id', projectId)
        .limit(1);

      if (!remainingJobs || remainingJobs.length === 0) {
        await supabase.from('projects').delete().eq('id', projectId);
        console.log(`Deleted empty project: ${projectId}`);
      }
    }

    console.log(`✅ Cleanup complete: ${oldJobs.length} jobs deleted`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: oldJobs.length,
        filesRemoved: filesToDelete.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

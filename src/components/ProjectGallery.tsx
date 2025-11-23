import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Project {
  id: string;
  registration_number: string;
  created_at: string;
  jobs: {
    id: string;
    final_url: string | null;
    scene_id: string;
  }[];
}

export const ProjectGallery = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
          id,
          registration_number,
          created_at,
          processing_jobs (
            id,
            final_url,
            scene_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(projectsData as any);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Kunde inte ladda projekt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAll = async (project: Project) => {
    const completedJobs = project.jobs.filter(j => j.final_url);
    
    for (const job of completedJobs) {
      if (job.final_url) {
        const link = document.createElement('a');
        link.href = job.final_url;
        link.download = `${project.registration_number}_${job.id}.jpg`;
        link.click();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    toast.success(`Laddar ner ${completedJobs.length} bilder`);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== projectId));
      toast.success('Projekt borttaget');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Kunde inte ta bort projekt');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Laddar projekt...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Inga projekt ännu. Skapa ditt första!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const completedJobs = project.jobs.filter(j => j.final_url);
          const firstImage = completedJobs[0];

          return (
            <Card key={project.id} className="overflow-hidden group hover:shadow-lg transition-all">
              {/* Preview Image */}
              <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                {firstImage?.final_url ? (
                  <img
                    src={firstImage.final_url}
                    alt={project.registration_number}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Ingen bild
                  </div>
                )}
                
                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => setSelectedProject(project)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleDownloadAll(project)}
                    disabled={completedJobs.length === 0}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Project Info */}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">
                  {project.registration_number}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {completedJobs.length} bilder • {new Date(project.created_at).toLocaleDateString('sv-SE')}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">{selectedProject.registration_number}</h2>
                <Button onClick={() => handleDownloadAll(selectedProject)}>
                  <Download className="w-4 h-4 mr-2" />
                  Ladda ner alla
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedProject.jobs
                  .filter(j => j.final_url)
                  .map((job) => (
                    <div key={job.id} className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                      <img
                        src={job.final_url!}
                        alt={`${selectedProject.registration_number}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
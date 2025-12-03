import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, Trash2, ChevronLeft, ChevronRight, Scissors, Sliders } from 'lucide-react';
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
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

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
          jobs:processing_jobs (
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
      setSelectedProject(null);
      toast.success('Projekt borttaget');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Kunde inte ta bort projekt');
    }
  };

  const openPreview = (project: Project, index: number) => {
    setSelectedProject(project);
    setPreviewIndex(index);
    setPreviewOpen(true);
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

  const completedJobs = selectedProject?.jobs.filter(j => j.final_url) || [];
  const currentJob = completedJobs[previewIndex];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const projectJobs = project.jobs.filter(j => j.final_url);
          const firstImage = projectJobs[0];

          return (
            <Card 
              key={project.id} 
              className="overflow-hidden group hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedProject(project)}
            >
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
                
                {/* Image count badge */}
                {projectJobs.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                    {projectJobs.length} bilder
                  </div>
                )}
                
                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (projectJobs.length > 0) {
                        openPreview(project, 0);
                      }
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadAll(project);
                    }}
                    disabled={projectJobs.length === 0}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
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
                  {projectJobs.length} bilder • {new Date(project.created_at).toLocaleDateString('sv-SE')}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject && !previewOpen} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedProject && (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                <h2 className="text-2xl font-bold">{selectedProject.registration_number}</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleDownloadAll(selectedProject)}>
                    <Download className="w-4 h-4 mr-2" />
                    Ladda ner alla
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDeleteProject(selectedProject.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedProject.jobs
                    .filter(j => j.final_url)
                    .map((job, idx) => (
                      <div 
                        key={job.id} 
                        className="aspect-[4/3] bg-muted rounded-lg overflow-hidden group relative cursor-pointer"
                        onClick={() => openPreview(selectedProject, idx)}
                      >
                        <img
                          src={job.final_url!}
                          alt={`${selectedProject.registration_number}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Gallery Dialog */}
      <Dialog open={previewOpen} onOpenChange={() => setPreviewOpen(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          {selectedProject && currentJob?.final_url && (
            <div className="flex flex-col h-full max-h-[90vh]">
              {/* Action Buttons */}
              <div className="p-3 bg-background border-b flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPreviewOpen(false)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Tillbaka
                  </Button>
                </div>
                <Button size="sm" onClick={() => {
                  const link = document.createElement('a');
                  link.href = currentJob.final_url!;
                  link.download = `${selectedProject.registration_number}_${currentJob.id}.jpg`;
                  link.click();
                }}>
                  <Download className="w-4 h-4 mr-1" />
                  Ladda ner
                </Button>
              </div>
              
              {/* Image Display */}
              <div className="relative flex-1 bg-black min-h-0 flex items-center justify-center">
                <img 
                  src={currentJob.final_url} 
                  alt="Preview" 
                  className="max-w-full max-h-[calc(90vh-100px)] object-contain" 
                />
                
                {/* Navigation Arrows */}
                {completedJobs.length > 1 && (
                  <>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="absolute left-2 top-1/2 -translate-y-1/2" 
                      onClick={() => setPreviewIndex(prev => prev > 0 ? prev - 1 : completedJobs.length - 1)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="absolute right-2 top-1/2 -translate-y-1/2" 
                      onClick={() => setPreviewIndex(prev => prev < completedJobs.length - 1 ? prev + 1 : 0)}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </>
                )}
                
                {/* Counter */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  {previewIndex + 1} / {completedJobs.length}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Download, Eye, Trash2, ChevronLeft, ChevronRight, Scissors, Sliders, Pencil, Check, X, RefreshCw, Upload, StickyNote, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageCropEditor } from '@/components/ImageCropEditor';
import { OriginalImageEditor } from '@/components/OriginalImageEditor';
import { Checkbox } from '@/components/ui/checkbox';

interface Project {
  id: string;
  registration_number: string;
  created_at: string;
  notes: string | null;
  jobs: {
    id: string;
    final_url: string | null;
    scene_id: string;
  }[];
}

interface OrphanJob {
  id: string;
  final_url: string | null;
  scene_id: string;
  created_at: string;
}

interface ProjectGalleryProps {
  onUseAsNewImage?: (imageUrl: string) => void;
}

export const ProjectGallery = ({ onUseAsNewImage }: ProjectGalleryProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [orphanJobs, setOrphanJobs] = useState<OrphanJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  
  // Edit states
  const [editingImage, setEditingImage] = useState<{ jobId: string; url: string; type: 'crop' | 'adjust' } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  const toggleJobSelection = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedJobIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleDownloadSelected = async () => {
    if (!selectedProject) return;
    const selectedJobs = selectedProject.jobs.filter(j => j.final_url && selectedJobIds.has(j.id));
    
    for (const job of selectedJobs) {
      if (job.final_url) {
        const link = document.createElement('a');
        link.href = job.final_url;
        link.download = `${selectedProject.registration_number}_${job.id}.jpg`;
        link.click();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load projects with their jobs
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          registration_number,
          created_at,
          notes,
          jobs:processing_jobs (
            id,
            final_url,
            scene_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Load orphan jobs (jobs without project_id)
      const { data: orphanData, error: orphanError } = await supabase
        .from('processing_jobs')
        .select('id, final_url, scene_id, created_at')
        .eq('user_id', user.id)
        .is('project_id', null)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (orphanError) throw orphanError;

      setProjects(projectsData as any);
      setOrphanJobs(orphanData || []);
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
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Kunde inte ta bort projekt');
    }
  };

  const handleRenameProject = async (projectId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ registration_number: newName.trim().toUpperCase() })
        .eq('id', projectId);

      if (error) throw error;

      setProjects(projects.map(p => 
        p.id === projectId ? { ...p, registration_number: newName.trim().toUpperCase() } : p
      ));
      setEditingProjectId(null);
    } catch (error) {
      console.error('Error renaming project:', error);
      toast.error('Kunde inte byta namn');
    }
  };

  const handleSaveNotes = async (projectId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ notes: notes.trim() || null })
        .eq('id', projectId);

      if (error) throw error;

      setProjects(projects.map(p => 
        p.id === projectId ? { ...p, notes: notes.trim() || null } : p
      ));
      if (selectedProject?.id === projectId) {
        setSelectedProject({ ...selectedProject, notes: notes.trim() || null });
      }
      setEditingNotes(null);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Kunde inte spara anteckning');
    }
  };

  const openPreview = (project: Project, index: number) => {
    setSelectedProject(project);
    setPreviewIndex(index);
    setPreviewOpen(true);
  };

  const handleDownloadSingle = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  };

  const handleUseAsNew = (imageUrl: string) => {
    if (onUseAsNewImage) {
      onUseAsNewImage(imageUrl);
      setPreviewOpen(false);
      setSelectedProject(null);
    }
  };

  const handleCropSave = (jobId: string, croppedUrl: string) => {
    // Update the job's final_url in local state
    setProjects(projects.map(p => ({
      ...p,
      jobs: p.jobs.map(j => j.id === jobId ? { ...j, final_url: croppedUrl } : j)
    })));
    if (selectedProject) {
      setSelectedProject({
        ...selectedProject,
        jobs: selectedProject.jobs.map(j => j.id === jobId ? { ...j, final_url: croppedUrl } : j)
      });
    }
    setEditingImage(null);
  };

  const handleAdjustSave = (jobId: string, adjustedUrl: string) => {
    // Update the job's final_url in local state
    setProjects(projects.map(p => ({
      ...p,
      jobs: p.jobs.map(j => j.id === jobId ? { ...j, final_url: adjustedUrl } : j)
    })));
    if (selectedProject) {
      setSelectedProject({
        ...selectedProject,
        jobs: selectedProject.jobs.map(j => j.id === jobId ? { ...j, final_url: adjustedUrl } : j)
      });
    }
    setEditingImage(null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (projects.length === 0 && orphanJobs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Inga projekt ännu. Skapa ditt första!</p>
      </div>
    );
  }

  const completedJobs = selectedProject?.jobs.filter(j => j.final_url) || [];
  const currentJob = completedJobs[previewIndex];

  // Create virtual project for orphan jobs
  const orphanProject: Project | null = orphanJobs.length > 0 ? {
    id: 'orphan',
    registration_number: 'Utan projekt',
    created_at: orphanJobs[0]?.created_at || new Date().toISOString(),
    notes: null,
    jobs: orphanJobs.map(j => ({ id: j.id, final_url: j.final_url, scene_id: j.scene_id }))
  } : null;

  const allProjects = orphanProject ? [orphanProject, ...projects] : projects;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allProjects.map((project) => {
          const projectJobs = project.jobs.filter(j => j.final_url);
          const firstImage = projectJobs[0];
          const isOrphan = project.id === 'orphan';

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
                
                {/* Notes indicator */}
                {project.notes && (
                  <div className="absolute top-2 left-2 bg-black/70 text-white p-1.5 rounded-full" title={project.notes}>
                    <StickyNote className="w-3 h-3" />
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
                  {!isOrphan && (
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
                  )}
                </div>
              </div>

              {/* Project Info */}
              <div className="p-4">
                {editingProjectId === project.id ? (
                  <div className="flex items-center gap-2">
                    <Input 
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameProject(project.id, editingName);
                        } else if (e.key === 'Escape') {
                          setEditingProjectId(null);
                        }
                      }}
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameProject(project.id, editingName);
                      }}
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProjectId(null);
                      }}
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg flex-1">
                      {isOrphan ? 'Utan registreringsnummer' : project.registration_number}
                    </h3>
                    {!isOrphan && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProjectId(project.id);
                          setEditingName(project.registration_number);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {projectJobs.length} bilder • {new Date(project.created_at).toLocaleDateString('sv-SE')}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject && !previewOpen} onOpenChange={() => { setSelectedProject(null); setSelectedJobIds(new Set()); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedProject && (() => {
            const completedJobsList = selectedProject.jobs.filter(j => j.final_url);
            return (
            <div className="flex flex-col h-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b flex-shrink-0 gap-3">
                <h2 className="text-2xl font-bold">{selectedProject.registration_number}</h2>
                <div className="flex gap-2 flex-wrap">
                  {selectedJobIds.size > 0 ? (
                    <Button variant="outline" onClick={handleDownloadSelected}>
                      <Download className="w-4 h-4 mr-2" />
                      Ladda ner valda ({selectedJobIds.size})
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => handleDownloadAll(selectedProject)}>
                      <Download className="w-4 h-4 mr-2" />
                      Ladda ner alla
                    </Button>
                  )}
                  {selectedProject.id !== 'orphan' && (
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteProject(selectedProject.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Selection controls */}
              <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                <Checkbox 
                  id="select-all-gallery" 
                  checked={selectedJobIds.size === completedJobsList.length && completedJobsList.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedJobIds(new Set(completedJobsList.map(j => j.id)));
                    } else {
                      setSelectedJobIds(new Set());
                    }
                  }}
                />
                <label htmlFor="select-all-gallery" className="text-sm text-muted-foreground cursor-pointer">
                  Markera alla ({completedJobsList.length} bilder)
                </label>
              </div>
              
              {/* Notes Section */}
              {selectedProject.id !== 'orphan' && (
                <div className="px-4 pt-2 pb-2 border-b">
                  {editingNotes === selectedProject.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Skriv en anteckning..."
                        className="min-h-[80px] text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveNotes(selectedProject.id, notesText)}>
                          <Check className="w-4 h-4 mr-1" />
                          Spara
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingNotes(null)}>
                          Avbryt
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="flex items-start gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-lg -m-2 transition-colors"
                      onClick={() => {
                        setEditingNotes(selectedProject.id);
                        setNotesText(selectedProject.notes || '');
                      }}
                    >
                      <StickyNote className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      {selectedProject.notes ? (
                        <p className="text-sm flex-1">{selectedProject.notes}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Klicka för att lägga till anteckning...</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {completedJobsList.map((job, idx) => (
                      <div 
                        key={job.id} 
                        className={`aspect-[4/3] bg-muted rounded-lg overflow-hidden group relative cursor-pointer transition-all ${selectedJobIds.has(job.id) ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => openPreview(selectedProject, idx)}
                      >
                        <img
                          src={job.final_url!}
                          alt={`${selectedProject.registration_number}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        
                        {/* Selection checkbox */}
                        <div 
                          className="absolute top-2 left-2 z-10"
                          onClick={(e) => toggleJobSelection(job.id, e)}
                        >
                          <Checkbox 
                            checked={selectedJobIds.has(job.id)}
                            className="bg-background/80 border-border"
                          />
                        </div>
                        
                        {selectedJobIds.has(job.id) && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          );
          })()}
        </DialogContent>
      </Dialog>

      {/* Image Preview Gallery Dialog */}
      <Dialog open={previewOpen} onOpenChange={() => setPreviewOpen(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          {selectedProject && currentJob?.final_url && (
            <div className="flex flex-col h-full max-h-[90vh]">
              {/* Image Display */}
              <div className="relative flex-1 bg-black min-h-0 flex items-center justify-center">
                <img 
                  src={currentJob.final_url} 
                  alt="Preview" 
                  className="max-w-full max-h-[calc(90vh-150px)] object-contain" 
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
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                  {previewIndex + 1} / {completedJobs.length}
                </div>
              </div>
              
              {/* Bottom action bar */}
              <div className="p-3 bg-background border-t flex flex-col gap-3">
                {/* Regenerate button - prominent below image */}
                {onUseAsNewImage && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleUseAsNew(currentJob.final_url!)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generera igen
                  </Button>
                )}
                
                {/* Edit and share buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPreviewOpen(false)}>
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Tillbaka</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setEditingImage({ jobId: currentJob.id, url: currentJob.final_url!, type: 'adjust' })}
                      title="Justera"
                    >
                      <Sliders className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Justera</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setEditingImage({ jobId: currentJob.id, url: currentJob.final_url!, type: 'crop' })}
                      title="Beskär"
                    >
                      <Scissors className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Beskär</span>
                    </Button>
                  </div>
                  
                  <Button size="sm" onClick={() => handleDownloadSingle(
                    currentJob.final_url!, 
                    `${selectedProject.registration_number}_${currentJob.id}.jpg`
                  )}>
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">Dela</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Crop Editor */}
      {editingImage?.type === 'crop' && (
        <ImageCropEditor
          image={{
            id: editingImage.jobId,
            finalUrl: editingImage.url,
            fileName: 'image.jpg'
          }}
          onClose={() => {
            setEditingImage(null);
          }}
          onSave={(imageId, croppedUrl) => {
            handleCropSave(imageId, croppedUrl);
          }}
          aspectRatio="landscape"
        />
      )}

      {/* Adjustment Editor */}
      {editingImage?.type === 'adjust' && (
        <OriginalImageEditor
          imageUrl={editingImage.url}
          imageName="image.jpg"
          open={true}
          onClose={() => setEditingImage(null)}
          onSave={(adjustedUrl) => {
            handleAdjustSave(editingImage.jobId, adjustedUrl);
          }}
        />
      )}
    </>
  );
};

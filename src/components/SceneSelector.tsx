import { Card } from '@/components/ui/card';
import { SceneMetadata } from '@/types/scene';
import { SCENES } from '@/data/scenes';
import { Check } from 'lucide-react';

interface SceneSelectorProps {
  selectedSceneId: string | null;
  onSceneSelect: (scene: SceneMetadata) => void;
}

export const SceneSelector = ({ selectedSceneId, onSceneSelect }: SceneSelectorProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Välj scen
        </h3>
        <p className="text-sm text-muted-foreground">
          Varje scen har optimerade inställningar för position, skugga och reflektion
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SCENES.map((scene) => (
          <Card
            key={scene.id}
            className={`cursor-pointer transition-all overflow-hidden group ${
              selectedSceneId === scene.id
                ? 'ring-2 ring-primary shadow-premium'
                : 'hover:shadow-card hover:scale-[1.02]'
            }`}
            onClick={() => onSceneSelect(scene)}
          >
            <div className="relative aspect-video">
              <img
                src={scene.thumbnailUrl}
                alt={scene.name}
                className="w-full h-full object-cover"
              />
              {selectedSceneId === scene.id && (
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-premium">
                  <Check className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h4 className="text-white font-semibold mb-1">{scene.name}</h4>
                <p className="text-white/80 text-xs">{scene.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedSceneId && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
            <div>
              <h4 className="font-medium text-foreground mb-1">Scen vald</h4>
              <p className="text-sm text-muted-foreground">
                Alla bilder kommer att placeras konsekvent enligt scenens inställningar
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

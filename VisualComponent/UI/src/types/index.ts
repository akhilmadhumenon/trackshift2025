export interface TyreMetadata {
  tyreType: string;
  compound: string;
  lapsUsed: number;
}

export interface UploadedVideo {
  file: File;
  url: string;
  uploadId: string;
  metadata: TyreMetadata;
}

export type VisualizationMode = 
  | 'texture' 
  | 'wireframe' 
  | 'crackHeatmap' 
  | 'depthFog' 
  | 'normalMap' 
  | 'geometry';

export type DamageType = 
  | 'blistering' 
  | 'micro-cracks' 
  | 'grain' 
  | 'cuts' 
  | 'flat-spots' 
  | 'chunking';

export type RecommendedAction = 
  | 'replace-immediately' 
  | 'monitor-next-stint' 
  | 'safe-qualifying-only';

export interface TimelinePoint {
  rotationAngle: number;
  severity: number;
}

export interface TyreInsights {
  crackCount: number;
  severityScore: number;
  depthEstimate: number;
  damageClassification: DamageType[];
  recommendedAction: RecommendedAction;
  severityTimeline: TimelinePoint[];
}

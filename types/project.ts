// types/project.ts
export type Level = {
    id: string;
    name: string;
    description?: string;
  };

export type Program = {
    id: string;
    name: string;
    number: string;
    version: string;
    date: string;
    /** Local file URI from camera or gallery (expo-image-picker) */
    imageUri?: string;
    latestVersion?:boolean;
  };

export enum ConcreateType {
    CONCRETE = 'concrete',
    REINFORCED_CONCRETE = 'reinforced concrete',
    PRECAST_CONCRETE = 'precast concrete',
    MIXED_CONCRETE = 'mixed concrete',
}

export enum ElementType {
    COLUMN = 'column',
    WALL = 'wall',
    CEILLING_FLOOR = 'ceilling/floor',
    BEAM = 'beam',
}

export type Control = {
    id: string;
    Level: Level;
    elementName: string;
    elementLocation:string;
    elementType: ElementType;
    programs: Program[];
    IronControlImagesUri?: string[];
    IronControlDescription?: string;
    ElectricalControlImagesUri?:string[];
    ElectricalControlDescription?: string;
    electricNeeded?:boolean;
    InstallationControlImagesUri?:string[];
    InstallationControlDescription?: string;
    installationNeeded?:boolean;
    WaterControlImagesUri?:string[];
    WaterControlDescription?: string;
    waterNeeded?:boolean;
    concreateType: ConcreateType;
    ConcreteControlImagesUri?:string[];
    ConcreteControlDescription?: string;
  };
  
  export type Project = {
    id: string;
    name: string;
    levels?: Level[];
    programs?: Program[];
    controls?: Control[];
  };
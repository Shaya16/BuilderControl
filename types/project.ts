// types/project.ts
export type Level = {
    id: string;
    name: string;
    description?: string;
  };

export type ConcreteType = {
  id: string;
  name: string;
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

export type ControlImage = {
    uri: string;
    description: string;
  };



export enum ElementType {
    COLUMN = 'עמוד',
    WALL = 'קיר',
    CEILLING_FLOOR = 'רצפה/תקרה',
    BEAM = 'עמודה',
}

export type Control = {
    id: string;
    Level: Level;
    elementName: string;
    elementLocation:string;
    elementType: ElementType | string;
    programs: Program[];
    IronControlImages?: ControlImage[];
    ElectricalControlImages?: ControlImage[];
    electricNeeded?:boolean;
    InstallationControlImages?: ControlImage[];
    installationNeeded?:boolean;
    WaterControlImages?: ControlImage[];
    waterNeeded?:boolean;
    otherControlImages?: ControlImage[];
    otherControlNeeded?:boolean;
    concreateType: ConcreteType;
    validated_concrete?: boolean;
    validated_concrete_at?: string;
    ConcreteControlImages?: ControlImage[];
    /** ISO 8601 date-time string (e.g. from Date.toISOString()) */
    createdAt?: string;
    /** ISO 8601 date-time string (e.g. from Date.toISOString()) */
    updatedAt?: string;
  };

  export type Project = {
    id: string;
    name: string;
    companyName?: string;
    logoUri?: string;
    levels?: Level[];
    concreteTypes?: ConcreteType[];
    programs?: Program[];
    controls?: Control[];
  };

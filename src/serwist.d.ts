declare module "serwist" {
  export interface PrecacheEntry {
    url: string;
    revision: string | null;
  }
  export interface SerwistGlobalConfig {
    [key: string]: any;
  }
  export class Serwist {
    constructor(config: any);
    addEventListeners(): void;
  }
}

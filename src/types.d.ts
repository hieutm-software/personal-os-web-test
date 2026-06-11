import "react";

declare module "react" {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

declare module "serwist" {
  export type PrecacheEntry = any;
  export type SerwistGlobalConfig = any;
  export class Serwist {
    constructor(config: any);
    addEventListeners(): void;
  }
}

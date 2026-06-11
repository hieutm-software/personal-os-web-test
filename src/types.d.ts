import type { AriaAttributes, DOMAttributes } from "react";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

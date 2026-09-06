// Le paquet ne livre pas ses types. On ne déclare que ce que la construction emploie :
// une fonction de minification et les trois options qu'elle reçoit.
declare module "html-minifier-terser" {
  export interface Options {
    collapseWhitespace?: boolean;
    minifyCSS?: boolean;
    removeComments?: boolean;
  }

  export function minify(value: string, options?: Options): Promise<string>;
}

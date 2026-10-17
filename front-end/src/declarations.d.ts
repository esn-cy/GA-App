declare module 'docs-soap' {
  export function docsSoap(html: string): string;
}

declare module 'qrcode' {
  export function toCanvas(
    text: string | Array<any>,
    options: any,
    callback: (error: Error, canvas: HTMLCanvasElement) => void
  ): void;
}


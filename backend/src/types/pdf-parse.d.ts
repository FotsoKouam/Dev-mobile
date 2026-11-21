declare module 'pdf-parse/lib/pdf-parse.js' {
  function pdfParse(
    dataBuffer: Buffer,
    options?: {
      pagerender?: (pageData: any) => Promise<string> | string;
      max?: number;
      version?: string;
    },
  ): Promise<{
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }>;

  export default pdfParse;
}

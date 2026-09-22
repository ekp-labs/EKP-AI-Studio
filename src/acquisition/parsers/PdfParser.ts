import { IFormatParser } from './IFormatParser.js';
import { FileMetadata, ParsedContent, ParsedSection } from '../types.js';
import { PDFParse } from 'pdf-parse';

export class PdfParser implements IFormatParser {
  public parserName = 'PdfParser';

  public canParse(extension: string): boolean {
    return extension.toLowerCase() === '.pdf';
  }

  public async parse(filePath: string, contentBuffer: Buffer, metadata: FileMetadata): Promise<ParsedContent> {
    const pdfParser = new PDFParse({ data: contentBuffer });

    try {
      const textResult = await pdfParser.getText();
      let infoResult: any = null;
      try {
        infoResult = await pdfParser.getInfo({ parsePageInfo: true });
      } catch {
        // Optional metadata fetch failure should not block text extraction
      }

      const title = metadata.filename.replace(/\.pdf$/i, '');
      const numPages = textResult.total || textResult.pages?.length || 1;
      const text = textResult.text || '';

      const sections: ParsedSection[] = [];

      if (textResult.pages && textResult.pages.length > 0) {
        for (const page of textResult.pages) {
          const pageText = (page.text || '').trim();
          sections.push({
            title: `Page ${page.num}`,
            content: pageText,
            pageNumber: page.num,
          });
        }
      } else {
        sections.push({
          title: 'Document Content',
          content: text.trim(),
          pageNumber: 1,
        });
      }

      return {
        title,
        content: text,
        format: 'pdf',
        parser: this.parserName,
        pageCount: numPages,
        sections,
        metadata: {
          info: infoResult?.info || null,
          numPages,
          fingerprints: infoResult?.fingerprints || null,
        },
      };
    } catch (err: any) {
      throw new Error(`[PdfParser] Failed to parse PDF ${metadata.filename}: ${err.message}`);
    } finally {
      await pdfParser.destroy().catch(() => {});
    }
  }
}

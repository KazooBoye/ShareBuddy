/**
 * Preview Controller - Generate and serve document previews (PDF & Office)
 */

const { PDFDocument } = require('pdf-lib');
const { createCanvas } = require('canvas');
const fs = require('fs').promises;
const fsSync = require('fs'); // Needed for libreoffice-convert
const path = require('path');
const { query } = require('../config/database');
const libre = require('libreoffice-convert');
const util = require('util');
const convertAsync = util.promisify(libre.convert);

const PREVIEW_PAGE_LIMIT = 10; // Updated to 10 pages

const resolveFilePath = (dbPath) => {
  if (!dbPath) return null;
  const cleanPath = dbPath.startsWith('/') ? dbPath.slice(1) : dbPath;
  return path.join(process.cwd(), cleanPath);
};

// Helper: Convert Office file buffer to PDF buffer
const convertToPdf = async (inputBuffer, ext) => {
  try {
    const pdfBuf = await convertAsync(inputBuffer, '.pdf', undefined);
    return pdfBuf;
  } catch (err) {
    console.error(`Error converting ${ext} to PDF:`, err);
    return null;
  }
};

// Internal function to generate preview
const generatePreviewInternal = async (documentId) => {
  try {
    const docResult = await query(
      'SELECT document_id, file_path, file_name, file_type FROM documents WHERE document_id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) return { success: false, error: 'Not found' };

    const document = docResult.rows[0];
    const filePath = resolveFilePath(document.file_path);
    // Normalize file type (remove dot if present)
    const fileType = document.file_type ? document.file_type.toLowerCase().replace('.', '') : 'unknown';

    // Verify file exists
    try {
      await fs.access(filePath);
    } catch (e) {
      return { success: false, error: 'File missing' };
    }

    let pdfDoc = null;
    let originalFileBytes = await fs.readFile(filePath);

    // 1. LOAD OR CONVERT TO PDF
    if (fileType === 'pdf') {
      pdfDoc = await PDFDocument.load(originalFileBytes);
    } else if (['docx', 'doc', 'pptx', 'ppt'].includes(fileType)) {
      console.log(`[Preview] Converting ${fileType} to PDF for preview extraction...`);
      // Convert Office to PDF Buffer
      const pdfBuffer = await convertToPdf(originalFileBytes, fileType);
      if (pdfBuffer) {
        pdfDoc = await PDFDocument.load(pdfBuffer);
      } else {
        console.warn('[Preview] Office conversion failed. LibreOffice might be missing.');
      }
    }

    // 2. EXTRACT FIRST 10 PAGES
    let dbPreviewUrl = null;
    let actualPreviewPages = 0;

    if (pdfDoc) {
      const totalPages = pdfDoc.getPageCount();
      actualPreviewPages = Math.min(totalPages, PREVIEW_PAGE_LIMIT);

      const previewPdf = await PDFDocument.create();
      const pages = await previewPdf.copyPages(pdfDoc, Array.from({ length: actualPreviewPages }, (_, i) => i));
      
      pages.forEach(page => {
        // Optional: Add Watermark
        const { width, height } = page.getSize();
        page.drawText('PREVIEW - ShareBuddy', {
          x: width / 2 - 150,
          y: height / 2,
          size: 40,
          opacity: 0.15,
          rotate: { angle: 45, type: 'degrees' }
        });
        previewPdf.addPage(page);
      });

      const previewBytes = await previewPdf.save();

      // Save to uploads/previews
      const previewDir = path.join(process.cwd(), 'uploads', 'previews');
      await fs.mkdir(previewDir, { recursive: true });
      
      const previewFileName = `preview_${documentId}.pdf`;
      const previewPathFull = path.join(previewDir, previewFileName);
      
      await fs.writeFile(previewPathFull, previewBytes);
      
      dbPreviewUrl = `/uploads/previews/${previewFileName}`;
    } else {
      // Fallback if conversion failed or unsupported type:
      // We can't generate a 10-page preview for non-PDFs without conversion.
      // Mark as generated but null URL (frontend will show "Preview not available" or Thumbnail)
      console.log('[Preview] Could not generate PDF preview for this file type.');
    }

    // 3. UPDATE DATABASE
    await query(
      `UPDATE documents 
       SET preview_url = $1, 
           preview_pages = $2, 
           preview_generated = TRUE 
       WHERE document_id = $3`,
      [dbPreviewUrl, actualPreviewPages, documentId]
    );

    return { success: true, previewUrl: dbPreviewUrl };

  } catch (error) {
    console.error('Internal preview generation failed:', error);
    return { success: false, error: error.message };
  }
};

// API Endpoint Wrapper
const generatePreview = async (req, res, next) => {
  const result = await generatePreviewInternal(req.params.documentId);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json({ success: true, message: 'Preview generated', data: result });
};

// Serve preview file
const servePreview = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const docResult = await query('SELECT preview_url, title FROM documents WHERE document_id = $1', [documentId]);

    if (docResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
    const document = docResult.rows[0];

    if (!document.preview_url) return res.status(404).json({ success: false, error: 'No preview available' });

    const previewPath = resolveFilePath(document.preview_url);
    
    // Always serve as PDF because we converted it
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="preview_${encodeURIComponent(document.title)}.pdf"`);
    
    const fileBuffer = await fs.readFile(previewPath);
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
};

const serveThumbnail = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const docResult = await query('SELECT thumbnail_url FROM documents WHERE document_id = $1', [documentId]);
        if (docResult.rows.length === 0 || !docResult.rows[0].thumbnail_url) {
            return res.status(404).send('No thumbnail');
        }
        const p = resolveFilePath(docResult.rows[0].thumbnail_url);
        const b = await fs.readFile(p);
        res.setHeader('Content-Type', 'image/png');
        res.send(b);
    } catch(e) { next(e); }
}

const generateThumbnail = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const docResult = await query('SELECT file_type FROM documents WHERE document_id = $1', [documentId]);
        const fileType = docResult.rows[0]?.file_type || 'DOC';

        const canvas = createCanvas(300, 400);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0,0,300,400);
        ctx.fillStyle = '#333';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(fileType.toUpperCase(), 150, 200);
        
        const dir = path.join(process.cwd(), 'uploads', 'thumbnails');
        await fs.mkdir(dir, {recursive:true});
        const p = path.join(dir, `thumb_${documentId}.png`);
        await fs.writeFile(p, canvas.toBuffer('image/png'));
        
        const dbUrl = `/uploads/thumbnails/thumb_${documentId}.png`;
        await query('UPDATE documents SET thumbnail_url=$1 WHERE document_id=$2', [dbUrl, documentId]);
        res.json({success:true, thumbnailUrl: dbUrl});
    } catch(e) { next(e); }
}

const getPreviewInfo = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const result = await query(
            'SELECT document_id, title, preview_url, preview_pages, thumbnail_url, view_count, file_size, preview_generated, file_type FROM documents WHERE document_id = $1',
            [documentId]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false });
        const doc = result.rows[0];
        
        res.json({
            success: true,
            data: {
                ...doc,
                hasPreview: !!doc.preview_url,
                // Ensure URLs are accessible
                previewUrl: doc.preview_url ? `/api/preview/${documentId}` : null,
                thumbnailUrl: doc.thumbnail_url ? `/api/preview/thumbnail/${documentId}` : null,
            }
        });
    } catch(e) { next(e); }
}

module.exports = {
  generatePreview,
  generatePreviewInternal,
  servePreview,
  generateThumbnail,
  serveThumbnail,
  getPreviewInfo,
};
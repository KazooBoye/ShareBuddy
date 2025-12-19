/**
 * Preview Controller - Generate and serve document previews
 */

const { PDFDocument } = require('pdf-lib');
const { createCanvas } = require('canvas');
const fs = require('fs').promises;
const path = require('path');
const { query } = require('../config/database');

// Generate preview for a document
const generatePreview = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    // Get document info
    const docResult = await query(
      'SELECT * FROM documents WHERE document_id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const document = docResult.rows[0];
    const filePath = path.join(process.cwd(), 'uploads', document.file_path);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'File tài liệu không tồn tại'
      });
    }

    // Read PDF file
    const pdfBytes = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const totalPages = pdfDoc.getPageCount();
    const previewPages = Math.min(totalPages, 5); // Preview first 5 pages

    // Create new PDF with only preview pages
    const previewPdf = await PDFDocument.create();
    const pages = await previewPdf.copyPages(pdfDoc, Array.from({ length: previewPages }, (_, i) => i));
    
    pages.forEach(page => {
      previewPdf.addPage(page);
    });

    // Add watermark to each page
    for (let i = 0; i < previewPdf.getPageCount(); i++) {
      const page = previewPdf.getPage(i);
      const { width, height } = page.getSize();
      
      page.drawText('PREVIEW - ShareBuddy', {
        x: width / 2 - 100,
        y: height / 2,
        size: 50,
        opacity: 0.1,
        rotate: { angle: 45, type: 'degrees' }
      });
    }

    const previewBytes = await previewPdf.save();

    // Save preview file
    const previewDir = path.join(process.cwd(), 'uploads', 'previews');
    await fs.mkdir(previewDir, { recursive: true });
    
    const previewFileName = `preview_${documentId}.pdf`;
    const previewPath = path.join(previewDir, previewFileName);
    
    await fs.writeFile(previewPath, previewBytes);

    // Update database
    await query(
      'UPDATE documents SET preview_path = $1, preview_pages = $2 WHERE document_id = $3',
      [`previews/${previewFileName}`, previewPages, documentId]
    );

    res.json({
      success: true,
      message: 'Preview đã được tạo',
      data: {
        previewPath: `/api/preview/${documentId}`,
        previewPages,
        totalPages
      }
    });
  } catch (error) {
    console.error('Preview generation error:', error);
    next(error);
  }
};

// Serve preview file
const servePreview = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    // Get document info
    const docResult = await query(
      'SELECT preview_path, title FROM documents WHERE document_id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const document = docResult.rows[0];
    
    if (!document.preview_path) {
      return res.status(404).json({
        success: false,
        error: 'Preview chưa được tạo. Vui lòng tạo preview trước.'
      });
    }

    const previewPath = path.join(process.cwd(), 'uploads', document.preview_path);

    // Check if preview exists
    try {
      await fs.access(previewPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'File preview không tồn tại'
      });
    }

    // Increment preview count
    await query(
      'UPDATE documents SET preview_count = preview_count + 1 WHERE document_id = $1',
      [documentId]
    );

    // Set headers and send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="preview_${document.title}.pdf"`);
    
    const fileBuffer = await fs.readFile(previewPath);
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
};

// Generate thumbnail for document
const generateThumbnail = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const width = parseInt(req.query.width) || 300;
    const height = parseInt(req.query.height) || 400;

    // Get document info
    const docResult = await query(
      'SELECT file_path FROM documents WHERE document_id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const document = docResult.rows[0];
    const filePath = path.join(process.cwd(), 'uploads', document.file_path);

    // Read PDF
    const pdfBytes = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const firstPage = pdfDoc.getPage(0);
    const { width: pdfWidth, height: pdfHeight } = firstPage.getSize();

    // Calculate scale
    const scale = Math.min(width / pdfWidth, height / pdfHeight);
    const canvasWidth = Math.floor(pdfWidth * scale);
    const canvasHeight = Math.floor(pdfHeight * scale);

    // Create canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Draw white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw placeholder (actual PDF rendering would require pdf.js or similar)
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(20, 20, canvasWidth - 40, canvasHeight - 40);
    
    ctx.fillStyle = '#666';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PDF Preview', canvasWidth / 2, canvasHeight / 2);

    // Save thumbnail
    const thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    await fs.mkdir(thumbnailDir, { recursive: true });
    
    const thumbnailFileName = `thumb_${documentId}.png`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFileName);
    
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(thumbnailPath, buffer);

    // Update database
    await query(
      'UPDATE documents SET thumbnail_path = $1 WHERE document_id = $2',
      [`thumbnails/${thumbnailFileName}`, documentId]
    );

    res.json({
      success: true,
      message: 'Thumbnail đã được tạo',
      data: {
        thumbnailPath: `/api/preview/thumbnail/${documentId}`,
        width: canvasWidth,
        height: canvasHeight
      }
    });
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    next(error);
  }
};

// Serve thumbnail
const serveThumbnail = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    // Get document info
    const docResult = await query(
      'SELECT thumbnail_path FROM documents WHERE document_id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const document = docResult.rows[0];
    
    if (!document.thumbnail_path) {
      return res.status(404).json({
        success: false,
        error: 'Thumbnail chưa được tạo'
      });
    }

    const thumbnailPath = path.join(process.cwd(), 'uploads', document.thumbnail_path);

    try {
      await fs.access(thumbnailPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'File thumbnail không tồn tại'
      });
    }

    res.setHeader('Content-Type', 'image/png');
    
    const fileBuffer = await fs.readFile(thumbnailPath);
    res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
};

// Get preview info
const getPreviewInfo = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    const result = await query(
      `SELECT 
        document_id,
        title,
        preview_path,
        preview_pages,
        preview_count,
        thumbnail_path,
        page_count,
        file_size
       FROM documents 
       WHERE document_id = $1`,
      [documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const doc = result.rows[0];

    res.json({
      success: true,
      data: {
        documentId: doc.document_id,
        title: doc.title,
        hasPreview: !!doc.preview_path,
        hasThumbnail: !!doc.thumbnail_path,
        previewPages: doc.preview_pages,
        totalPages: doc.page_count,
        previewCount: doc.preview_count,
        fileSize: doc.file_size,
        previewUrl: doc.preview_path ? `/api/preview/${documentId}` : null,
        thumbnailUrl: doc.thumbnail_path ? `/api/preview/thumbnail/${documentId}` : null
      }
    });
  } catch (error) {
    next(error);
  }
};

// Batch generate previews (admin only)
const batchGeneratePreviews = async (req, res, next) => {
  try {
    const { documentIds } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Document IDs phải là mảng không rỗng'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const documentId of documentIds) {
      try {
        // Get document
        const docResult = await query(
          'SELECT * FROM documents WHERE document_id = $1',
          [documentId]
        );

        if (docResult.rows.length === 0) {
          results.failed.push({ documentId, reason: 'Không tìm thấy' });
          continue;
        }

        const document = docResult.rows[0];
        const filePath = path.join(process.cwd(), 'uploads', document.file_path);

        // Generate preview
        const pdfBytes = await fs.readFile(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        const totalPages = pdfDoc.getPageCount();
        const previewPages = Math.min(totalPages, 5);

        const previewPdf = await PDFDocument.create();
        const pages = await previewPdf.copyPages(pdfDoc, Array.from({ length: previewPages }, (_, i) => i));
        
        pages.forEach(page => previewPdf.addPage(page));

        const previewBytes = await previewPdf.save();

        const previewDir = path.join(process.cwd(), 'uploads', 'previews');
        await fs.mkdir(previewDir, { recursive: true });
        
        const previewFileName = `preview_${documentId}.pdf`;
        const previewPath = path.join(previewDir, previewFileName);
        
        await fs.writeFile(previewPath, previewBytes);

        await query(
          'UPDATE documents SET preview_path = $1, preview_pages = $2 WHERE document_id = $3',
          [`previews/${previewFileName}`, previewPages, documentId]
        );

        results.success.push(documentId);
      } catch (error) {
        results.failed.push({ documentId, reason: error.message });
      }
    }

    res.json({
      success: true,
      message: `Đã tạo ${results.success.length}/${documentIds.length} previews`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generatePreview,
  servePreview,
  generateThumbnail,
  serveThumbnail,
  getPreviewInfo,
  batchGeneratePreviews
};

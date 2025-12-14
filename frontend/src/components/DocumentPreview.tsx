/**
 * DocumentPreview Component - Preview PDF documents with watermark
 */

import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import axios from 'axios';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface DocumentPreviewProps {
  documentId: string;
  onPurchase?: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ documentId, onPurchase }) => {
  const [previewInfo, setPreviewInfo] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [scale, setScale] = useState<number>(1.0);

  useEffect(() => {
    fetchPreviewInfo();
  }, [documentId]);

  const fetchPreviewInfo = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/preview/info/${documentId}`);
      setPreviewInfo(response.data.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không thể tải thông tin preview');
      setLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Đang tải preview...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  if (!previewInfo?.hasPreview) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <Alert.Heading>Preview chưa khả dụng</Alert.Heading>
          <p>Tài liệu này chưa có bản preview. Vui lòng liên hệ quản trị viên.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Card>
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">{previewInfo.title}</h5>
            <small>
              Preview: {previewInfo.previewPages}/{previewInfo.totalPages} trang
              <Badge bg="warning" className="ms-2">PREVIEW</Badge>
            </small>
          </div>
          {onPurchase && (
            <Button variant="light" onClick={onPurchase}>
              Mua toàn bộ tài liệu
            </Button>
          )}
        </Card.Header>

        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="btn-group">
              <Button variant="outline-primary" onClick={goToPrevPage} disabled={pageNumber <= 1}>
                ‹ Trang trước
              </Button>
              <Button variant="outline-primary" disabled>
                {pageNumber} / {numPages}
              </Button>
              <Button variant="outline-primary" onClick={goToNextPage} disabled={pageNumber >= numPages}>
                Trang sau ›
              </Button>
            </div>

            <div className="btn-group">
              <Button variant="outline-secondary" onClick={zoomOut} disabled={scale <= 0.5}>
                -
              </Button>
              <Button variant="outline-secondary" disabled>
                {Math.round(scale * 100)}%
              </Button>
              <Button variant="outline-secondary" onClick={zoomIn} disabled={scale >= 2.0}>
                +
              </Button>
            </div>
          </div>

          <div className="d-flex justify-content-center bg-light p-3" style={{ minHeight: '600px' }}>
            <Document
              file={`${process.env.REACT_APP_API_URL}${previewInfo.previewUrl}`}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<Spinner animation="border" variant="primary" />}
              error={
                <Alert variant="danger">
                  Không thể tải tài liệu. Vui lòng thử lại sau.
                </Alert>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>

          <Alert variant="info" className="mt-3">
            <strong>Lưu ý:</strong> Đây chỉ là bản preview với watermark. 
            Để xem toàn bộ {previewInfo.totalPages} trang và tải về, vui lòng mua tài liệu.
          </Alert>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DocumentPreview;

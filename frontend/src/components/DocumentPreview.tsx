import React, { useEffect, useState } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { previewService } from '../services/previewService';

interface DocumentPreviewProps {
  documentId: string;
}

interface PreviewInfo {
  hasPreview: boolean;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  previewPages: number;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ documentId }) => {
  const [info, setInfo] = useState<PreviewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const fetchPreviewInfo = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await previewService.getPreviewInfo(documentId);
        if (res.success && res.data) {
          setInfo(res.data);
        }
      } catch (err) {
        console.error("Preview fetch failed:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchPreviewInfo();
    }
  }, [documentId]);

  if (loading) {
    return (
      <div className="text-center py-5 bg-light rounded" style={{minHeight: '200px'}}>
        <Spinner animation="border" variant="secondary" />
        <p className="mt-2 text-muted small">Đang tải bản xem trước...</p>
      </div>
    );
  }

  // Case 1: Preview PDF exists
  if (info?.hasPreview && info.previewUrl) {
    // Ensure URL is absolute if it comes as relative from DB
    const fullUrl = info.previewUrl.startsWith('http') 
      ? info.previewUrl 
      : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${info.previewUrl}`;

    return (
      <div className="document-preview-container" style={{ height: '600px', border: '1px solid #ddd' }}>
        <iframe
          src={fullUrl}
          width="100%"
          height="100%"
          title="Document Preview"
          style={{ border: 'none' }}
        />
        <div className="bg-light p-2 text-center text-muted small border-top">
          Hiển thị {info.previewPages} trang đầu tiên
        </div>
      </div>
    );
  }

  // Case 2: Thumbnail fallback
  if (info?.thumbnailUrl) {
    const thumbUrl = info.thumbnailUrl.startsWith('http') 
      ? info.thumbnailUrl 
      : `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${info.thumbnailUrl}`;

    return (
      <div className="text-center bg-light p-4 rounded">
        <img 
          src={thumbUrl} 
          alt="Document Thumbnail" 
          className="img-fluid shadow-sm mb-3"
          style={{ maxHeight: '400px' }}
        />
        <Alert variant="info" className="small mb-0">
          <i className="bi bi-info-circle me-2"></i>
          Chỉ có hình ảnh thu nhỏ. Tải xuống để xem nội dung đầy đủ.
        </Alert>
      </div>
    );
  }

  // Case 3: Error or No Preview
  return (
    <div className="text-center py-5 bg-light rounded border">
      <i className="bi bi-file-earmark-lock display-4 text-muted opacity-50"></i>
      <p className="mt-3 text-muted">
        {error ? 'Không thể tải bản xem trước.' : 'Bản xem trước chưa sẵn sàng.'}
      </p>
    </div>
  );
};

export default DocumentPreview;
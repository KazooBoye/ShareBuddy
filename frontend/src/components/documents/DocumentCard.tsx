/**
 * DocumentCard Component - Hiển thị thông tin tài liệu dạng card
 * Features: Preview, rating, bookmark, download, author info
 */

import React, { useState } from 'react';
import { Card, Badge, Button, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Document } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../store/hooks';
import { toggleBookmark } from '../../store/slices/documentSlice';
import { documentService } from '../../services/documentService';
import { toast } from 'react-toastify';

interface DocumentCardProps {
  document: Document;
  showAuthor?: boolean;
  compact?: boolean;
  onBookmark?: (documentId: string) => void;
  onDownload?: (documentId: string) => void;
  className?: string;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ 
  document: doc, 
  showAuthor = true,
  compact = false,
  onBookmark, 
  onDownload, 
  className 
}) => {
  const { isAuthenticated, user } = useAuth();
  const dispatch = useAppDispatch();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để bookmark tài liệu');
      return;
    }

    try {
      await dispatch(toggleBookmark({
        documentId: doc.id,
        isBookmarked: doc.userInteraction?.isBookmarked || false
      })).unwrap();
      
      toast.success(
        doc.userInteraction?.isBookmarked 
          ? 'Đã bỏ bookmark' 
          : 'Đã thêm vào bookmark'
      );
      
      if (onBookmark) onBookmark(doc.id);
    } catch (error) {
      console.error('Bookmark error:', error);
      toast.error('Có lỗi xảy ra khi bookmark');
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để tải xuống');
      return;
    }

    if (user?.credits && user.credits < doc.creditCost) {
      toast.error('Không đủ credit để tải xuống');
      return;
    }

    setIsDownloading(true);
    try {
      // Download file
      const blob = await documentService.downloadDocument(doc.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${doc.title}.pdf`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Tải xuống thành công!');
      if (onDownload) onDownload(doc.id);
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Có lỗi xảy ra khi tải xuống');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderRating = () => {
    const rating = parseFloat(doc.avgRating || '0');
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`bi bi-star${i <= rating ? '-fill text-warning' : ''}`}
        />
      );
    }
    
    return (
      <div className="d-flex align-items-center">
        <div className="rating-stars me-2">{stars}</div>
        <small className="text-muted">({doc.ratingCount || 0})</small>
      </div>
    );
  };

  return (
    <Card 
      className={`document-card card-hover h-100 ${compact ? 'card-compact' : ''} ${className || ''}`}
      as={Link}
      to={`/documents/${doc.id}`}
    >
      {/* Document Thumbnail */}
      {doc.thumbnailUrl && (
        <div className="card-img-wrapper">
          <Card.Img 
            variant="top"
            src={doc.thumbnailUrl}
            alt={doc.title}
            style={{ height: compact ? '120px' : '180px', objectFit: 'cover' }}
          />
        </div>
      )}
      
      <Card.Body className="d-flex flex-column">
        {/* Title and Description */}
        <div className="flex-grow-1">
          <Card.Title className={`${compact ? 'h6' : 'h5'} mb-2 text-truncate`}>
            {doc.title}
          </Card.Title>
          
          <Card.Text 
            className={`text-muted ${compact ? 'small' : ''}`}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: compact ? 2 : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {doc.description}
          </Card.Text>
        </div>

        {/* Category and Subject Badges */}
        <div className="mb-2">
          <Badge bg="primary" className="me-2">
            📚 {doc.category}
          </Badge>
          <Badge bg="secondary">
            📖 {doc.subject}
          </Badge>
        </div>

        {/* Author Info */}
        {showAuthor && doc.author && (
          <div className="d-flex align-items-center mb-2">
            <img
              src={doc.author.avatarUrl || '/default-avatar.png'}
              alt="Author"
              className="user-avatar-sm rounded-circle me-2"
              style={{ width: '24px', height: '24px' }}
            />
            <div>
              <small className="text-muted d-flex align-items-center">
                {doc.author.fullName || doc.author.username}
                {doc.author.isVerifiedAuthor && (
                  <i className="bi bi-patch-check-fill text-primary ms-1" />
                )}
              </small>
              {doc.author.university && (
                <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                  {doc.author.university}
                </small>
              )}
            </div>
          </div>
        )}

        {/* Rating */}
        <div className="mb-2">
          {renderRating()}
        </div>

        {/* Footer Actions */}
        <Row className="align-items-center mt-auto">
          <Col xs={6}>
            <div className="d-flex align-items-center">
              <Badge bg="success" className="me-2">
                {doc.creditCost} credits
              </Badge>
              <small className="text-muted">
                <i className="bi bi-download me-1" />
                {doc.downloadCount || 0}
              </small>
            </div>
          </Col>
          
          <Col xs={6} className="text-end">
            <div className="btn-group" role="group">
              {/* Bookmark Button */}
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>
                  {doc.userInteraction?.isBookmarked ? 'Bỏ bookmark' : 'Bookmark'}
                </Tooltip>}
              >
                <Button
                  variant={doc.userInteraction?.isBookmarked ? 'warning' : 'outline-warning'}
                  size="sm"
                  onClick={handleBookmark}
                >
                  <i className={`bi bi-bookmark${doc.userInteraction?.isBookmarked ? '-fill' : ''}`} />
                </Button>
              </OverlayTrigger>

              {/* Download Button */}
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Tải xuống</Tooltip>}
              >
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleDownload}
                  disabled={isDownloading || !doc.userInteraction?.canDownload}
                >
                  {isDownloading ? (
                    <div className="spinner-border spinner-border-sm" />
                  ) : (
                    <i className="bi bi-download" />
                  )}
                </Button>
              </OverlayTrigger>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default DocumentCard;
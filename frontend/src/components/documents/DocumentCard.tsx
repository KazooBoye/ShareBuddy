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
      className={`document-card ${compact ? 'card-compact' : ''} ${className || ''}`}
      as={Link}
      to={`/documents/${doc.id}`}
    >
      {/* Document Thumbnail */}
      <div className="card-img-wrapper" style={{ height: compact ? '140px' : '200px' }}>
        {doc.thumbnailUrl ? (
          <Card.Img 
            variant="top"
            src={doc.thumbnailUrl}
            alt={doc.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div 
            className="d-flex align-items-center justify-content-center h-100"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <i className="bi bi-file-earmark-text text-white" style={{ fontSize: '3rem' }} />
          </div>
        )}
      </div>
      
      <Card.Body className="d-flex flex-column">
        {/* Title */}
        <Card.Title className={`${compact ? 'h6' : 'h5'} mb-2`}>
          {doc.title}
        </Card.Title>
        
        {/* Description */}
        {doc.description && (
          <Card.Text 
            className={`text-muted mb-3 ${compact ? 'small' : ''}`}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}
          >
            {doc.description}
          </Card.Text>
        )}

        {/* Subject Badge */}
        {doc.subject && (
          <div className="mb-2">
            <Badge bg="secondary" className="me-2">
              <i className="bi bi-book me-1" />
              {doc.subject}
            </Badge>
          </div>
        )}

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="mb-3 d-flex flex-wrap gap-1">
            {doc.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} bg="info" pill style={{ fontSize: '0.7rem' }}>
                <i className="bi bi-tag-fill me-1" />
                {tag}
              </Badge>
            ))}
            {doc.tags.length > 3 && (
              <Badge bg="light" text="dark" pill style={{ fontSize: '0.7rem' }}>
                +{doc.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Author Info */}
        {showAuthor && doc.author && (
          <div className="d-flex align-items-center mb-2 pb-2 border-bottom">
            <img
              src={doc.author.avatarUrl || '/default-avatar.png'}
              alt="Author"
              className="user-avatar-sm rounded-circle me-2"
              style={{ width: '32px', height: '32px', objectFit: 'cover' }}
            />
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div className="d-flex align-items-center">
                <small className="text-muted fw-medium text-truncate" style={{ fontSize: '0.8125rem' }}>
                  {doc.author.fullName || doc.author.username}
                </small>
                {doc.author.isVerifiedAuthor && (
                  <i className="bi bi-patch-check-fill text-primary ms-1 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div className="d-flex align-items-center">
            {renderRating()}
          </div>
          <div className="d-flex align-items-center gap-2">
            <small className="text-muted d-flex align-items-center">
              <i className="bi bi-download me-1" />
              {doc.downloadCount || 0}
            </small>
            <Badge bg="success" pill>
              {doc.creditCost} <i className="bi bi-coin" />
            </Badge>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="d-flex justify-content-end gap-2 mt-auto">
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
        </div>
      </Card.Body>
    </Card>
  );
};

export default DocumentCard;
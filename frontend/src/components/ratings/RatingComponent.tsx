/**
 * RatingComponent - Hiển thị và quản lý đánh giá tài liệu
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Modal, ProgressBar, Alert } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { ratingService } from '../../services/ratingService';
import { Rating } from '../../types';
import { toast } from 'react-toastify';

interface RatingComponentProps {
  documentId: string;
}

const RatingComponent: React.FC<RatingComponentProps> = ({ documentId }) => {
  const { isAuthenticated } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [userRating, setUserRating] = useState<Rating | null>(null);
  const [ratingStats, setRatingStats] = useState<any>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [newRating, setNewRating] = useState({ rating: 0, comment: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      await loadRatings();
      await loadRatingStats();
      if (isAuthenticated) {
        await loadUserRating();
      }
    };
    fetchData();
  }, [documentId, isAuthenticated]);

  const loadRatings = async () => {
    try {
      const response = await ratingService.getDocumentRatings(documentId, 1, 10);
      setRatings(response.data?.items || []);
    } catch (error) {
      console.error('Failed to load ratings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRatingStats = async () => {
    try {
      const response = await ratingService.getRatingStats(documentId);
      setRatingStats(response.data);
    } catch (error) {
      console.error('Failed to load rating stats:', error);
    }
  };

  const loadUserRating = async () => {
    try {
      const response = await ratingService.getUserRating(documentId);
      if (response.data) {
        setUserRating(response.data);
        setNewRating({ 
          rating: response.data.rating, 
          comment: response.data.comment || '' 
        });
      }
    } catch (error) {
      console.error('Failed to load user rating:', error);
    }
  };

  const handleSubmitRating = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để đánh giá');
      return;
    }

    if (newRating.rating === 0) {
      toast.error('Vui lòng chọn số sao đánh giá');
      return;
    }

    setIsSubmitting(true);
    try {
      if (userRating) {
        // Update existing rating
        await ratingService.updateRating(
          userRating.id, 
          newRating.rating, 
          newRating.comment
        );
        toast.success('Cập nhật đánh giá thành công!');
      } else {
        // Create new rating
        await ratingService.addRating(
          documentId, 
          newRating.rating, 
          newRating.comment
        );
        toast.success('Đánh giá thành công!');
      }
      
      setShowRatingModal(false);
      loadRatings();
      loadRatingStats();
      loadUserRating();
    } catch (error: any) {
      toast.error(error.message || 'Không thể gửi đánh giá');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeRating = async (ratingId: string) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để like đánh giá');
      return;
    }

    try {
      await ratingService.toggleRatingLike(ratingId);
      loadRatings(); // Reload to update like counts
    } catch (error: any) {
      toast.error(error.message || 'Không thể like đánh giá');
    }
  };

  const renderStars = (rating: number, interactive: boolean = false, onChange?: (rating: number) => void) => {
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`bi bi-star${i <= rating ? '-fill' : ''} ${interactive ? 'rating-interactive' : 'rating-stars'}`}
          style={{ cursor: interactive ? 'pointer' : 'default', fontSize: interactive ? '1.5rem' : '1rem' }}
          onClick={interactive && onChange ? () => onChange(i) : undefined}
        />
      );
    }
    
    return <div className="d-inline-flex">{stars}</div>;
  };

  const renderRatingDistribution = () => {
    if (!ratingStats) return null;
    
    const total = ratingStats.totalRatings;
    if (total === 0) return <p className="text-muted">Chưa có đánh giá nào</p>;
    
    return (
      <div>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = ratingStats.ratingDistribution[star] || 0;
          const percentage = (count / total) * 100;
          
          return (
            <Row key={star} className="align-items-center mb-1">
              <Col xs={3}>
                <small>{star} ⭐</small>
              </Col>
              <Col xs={7}>
                <ProgressBar 
                  now={percentage} 
                  variant={star >= 4 ? 'success' : star >= 3 ? 'warning' : 'danger'}
                  style={{ height: '8px' }}
                />
              </Col>
              <Col xs={2}>
                <small className="text-muted">{count}</small>
              </Col>
            </Row>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border spinner-border-sm me-2" />
        Đang tải đánh giá...
      </div>
    );
  }

  return (
    <div className="rating-component">
      {/* Rating Summary */}
      <Row className="mb-4">
        <Col md={6}>
          <Card className="text-center">
            <Card.Body>
              <div className="display-4 fw-bold text-warning mb-2">
                {ratingStats?.averageRating?.toFixed(1) || '0.0'}
              </div>
              {renderStars(ratingStats?.averageRating || 0)}
              <div className="text-muted mt-2">
                {ratingStats?.totalRatings || 0} đánh giá
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Body>
              <h6 className="mb-3">Phân bố đánh giá</h6>
              {renderRatingDistribution()}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* User Rating Action */}
      {isAuthenticated && (
        <div className="mb-4">
          {userRating ? (
            <Alert variant="info">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Đánh giá của bạn:</strong> {renderStars(userRating.rating)} 
                  <span className="ms-2">({userRating.rating}/5)</span>
                </div>
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => setShowRatingModal(true)}
                >
                  Chỉnh sửa
                </Button>
              </div>
              {userRating.comment && (
                <div className="mt-2">
                  <small className="text-muted">Bình luận: {userRating.comment}</small>
                </div>
              )}
            </Alert>
          ) : (
            <Button 
              variant="primary" 
              onClick={() => setShowRatingModal(true)}
            >
              <i className="bi bi-star me-2" />
              Đánh giá tài liệu này
            </Button>
          )}
        </div>
      )}

      {/* Ratings List */}
      <div>
        <h6 className="mb-3">Đánh giá từ người dùng ({ratings.length})</h6>
        
        {ratings.length === 0 ? (
          <Alert variant="light" className="text-center">
            <i className="bi bi-star display-4 text-muted mb-3 d-block" />
            <p className="text-muted mb-0">Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá!</p>
          </Alert>
        ) : (
          ratings.map((rating) => (
            <Card key={rating.id} className="mb-3">
              <Card.Body>
                <Row>
                  <Col>
                    <div className="d-flex align-items-start">
                      <img
                        src={rating.user.avatarUrl || '/default-avatar.png'}
                        alt="User"
                        className="user-avatar me-3"
                      />
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">
                              {rating.user.fullName || rating.user.username}
                              {rating.user.isVerifiedAuthor && (
                                <i className="bi bi-patch-check-fill text-primary ms-1" />
                              )}
                            </h6>
                            {renderStars(rating.rating)}
                            <span className="text-muted ms-2">({rating.rating}/5)</span>
                          </div>
                          <small className="text-muted">
                            {new Date(rating.createdAt).toLocaleDateString('vi-VN')}
                          </small>
                        </div>
                        
                        {rating.comment && (
                          <p className="mt-2 mb-2">{rating.comment}</p>
                        )}
                        
                        <div className="d-flex align-items-center">
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 me-3"
                            onClick={() => handleLikeRating(rating.id)}
                          >
                            <i className={`bi bi-hand-thumbs-up${rating.isLiked ? '-fill' : ''}`} />
                            <span className="ms-1">{rating.likeCount || 0}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ))
        )}
      </div>

      {/* Rating Modal */}
      <Modal show={showRatingModal} onHide={() => setShowRatingModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{userRating ? 'Chỉnh sửa đánh giá' : 'Đánh giá tài liệu'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Số sao đánh giá *</Form.Label>
              <div className="d-flex justify-content-center mb-2">
                {renderStars(newRating.rating, true, (rating) => 
                  setNewRating(prev => ({ ...prev, rating }))
                )}
              </div>
              <div className="text-center text-muted">
                {newRating.rating === 0 && 'Chọn số sao'}
                {newRating.rating === 1 && 'Rất tệ'}
                {newRating.rating === 2 && 'Tệ'}
                {newRating.rating === 3 && 'Bình thường'}
                {newRating.rating === 4 && 'Tốt'}
                {newRating.rating === 5 && 'Rất tốt'}
              </div>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Bình luận (tùy chọn)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Chia sẻ ý kiến của bạn về tài liệu này..."
                value={newRating.comment}
                onChange={(e) => setNewRating(prev => ({ ...prev, comment: e.target.value }))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowRatingModal(false)}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmitRating}
            disabled={isSubmitting || newRating.rating === 0}
          >
            {isSubmitting ? 'Đang gửi...' : (userRating ? 'Cập nhật' : 'Gửi đánh giá')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default RatingComponent;
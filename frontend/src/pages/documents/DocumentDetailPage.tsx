/**
 * Document Detail Page
 * Layout: Left Column (Info, Comments, Q&A) | Right Column (Preview)
 */

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, Tab, Tabs, Spinner, Alert } from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchDocumentById, toggleBookmark } from '../../store/slices/documentSlice';
import { useAuth } from '../../hooks/useAuth';
import { documentService } from '../../services/documentService';
import { toast } from 'react-toastify';
import RatingComponent from '../../components/ratings/RatingComponent';
import CommentSection from '../../components/comments/CommentSection';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import QuestionList from '../../components/QuestionList'; 
import DocumentPreview from '../../components/DocumentPreview';

const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();
  const { currentDocument, isLoading, error } = useAppSelector(state => state.documents);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      dispatch(fetchDocumentById(id));
    }
  }, [dispatch, id]);

  const handleDownload = async () => {
    if (!currentDocument || !isAuthenticated) {
      toast.error('Vui lòng đăng nhập để tải tài liệu');
      return;
    }

    if (user?.credits && user.credits < currentDocument.creditCost && currentDocument.userInteraction?.canDownload !== true) {
      toast.error(`Không đủ credits. Cần ${currentDocument.creditCost} credits.`);
      return;
    }

    setIsDownloading(true);
    try {
      const blob = await documentService.downloadDocument(currentDocument.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // FIXED: Removed 'fileName' property access since it doesn't exist on the type.
      // Using title is a safe fallback that always exists.
      link.download = `${currentDocument.title}.pdf`; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Tải tài liệu thành công!');
      // Refresh to update credits/download status
      dispatch(fetchDocumentById(currentDocument.id));
    } catch (error: any) {
      toast.error(error.message || 'Không thể tải tài liệu');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleBookmark = async () => {
    if (!currentDocument || !isAuthenticated) {
      toast.error('Vui lòng đăng nhập để bookmark');
      return;
    }
    
    try {
        const isBookmarked = !!currentDocument.userInteraction?.isBookmarked;
        await dispatch(toggleBookmark({ 
            documentId: currentDocument.id, 
            isBookmarked: isBookmarked 
        })).unwrap();
        
        toast.success(isBookmarked ? 'Đã bỏ bookmark' : 'Đã thêm vào bookmark');
    } catch (error: any) {
        toast.error(error.message || 'Lỗi cập nhật bookmark');
    }
  };

  const renderRating = () => {
    if (!currentDocument) return null;
    const rating = parseFloat(currentDocument.avgRating || '0');
    return (
      <div className="d-flex align-items-center mb-3">
        <div className="text-warning me-2">
           {[...Array(5)].map((_, i) => (
             <i key={i} className={`bi bi-star${i < Math.round(rating) ? '-fill' : ''}`} />
           ))}
        </div>
        <span className="fw-bold">{rating.toFixed(1)}</span>
        <span className="text-muted ms-1">({currentDocument.ratingCount || 0} đánh giá)</span>
      </div>
    );
  };

  if (isLoading) return <LoadingSpinner message="Đang tải..." />;
  
  if (error || !currentDocument) {
    return (
      <Container className="py-5 mt-5">
        <Alert variant="danger">
          <i className="bi bi-exclamation-triangle me-2" />
          {error || 'Không tìm thấy tài liệu'}
          <Button variant="link" onClick={() => navigate(-1)}>Quay lại</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4 mt-5">
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
          <li className="breadcrumb-item"><Link to="/documents">Tài liệu</Link></li>
          <li className="breadcrumb-item active" aria-current="page">{currentDocument.title}</li>
        </ol>
      </nav>

      <Row>
        {/* --- LEFT COLUMN --- */}
        <Col lg={7}>
          <Card className="shadow-sm mb-4 border-0">
            <Card.Body>
              <h1 className="h2 mb-3">{currentDocument.title}</h1>
              
              <div className="mb-3">
                 <Badge bg="primary" className="me-2">{currentDocument.subject}</Badge>
                 {currentDocument.author?.university && (
                    <Badge bg="secondary">{currentDocument.author.university}</Badge>
                 )}
              </div>
              
              {renderRating()}

              <div className="d-flex align-items-center mb-4 p-3 bg-light rounded">
                <img 
                  src={currentDocument.author.avatarUrl || 'https://via.placeholder.com/50'} 
                  alt="Author" 
                  className="rounded-circle me-3"
                  width="50" height="50"
                  style={{objectFit: 'cover'}}
                />
                <div>
                  <div className="fw-bold">
                    {currentDocument.author.fullName || currentDocument.author.username}
                    {currentDocument.author.isVerifiedAuthor && <i className="bi bi-patch-check-fill text-primary ms-1" />}
                  </div>
                  <div className="text-muted small">
                    Đăng ngày {new Date(currentDocument.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 mb-4">
                <Button 
                  variant="success" 
                  size="lg" 
                  className="flex-grow-1"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? <Spinner size="sm" /> : <i className="bi bi-download me-2" />}
                  Tải xuống ({currentDocument.creditCost === 0 ? 'Miễn phí' : `${currentDocument.creditCost} Credits`})
                </Button>
                <Button 
                  variant={currentDocument.userInteraction?.isBookmarked ? "warning" : "outline-warning"}
                  onClick={handleBookmark}
                >
                  <i className={`bi bi-bookmark${currentDocument.userInteraction?.isBookmarked ? '-fill' : ''}`} />
                </Button>
              </div>

              <div className="mb-4">
                <h5>Mô tả</h5>
                <p className="text-secondary" style={{ whiteSpace: 'pre-line' }}>{currentDocument.description}</p>
              </div>
            </Card.Body>
          </Card>

          <Card className="shadow-sm border-0">
            <Card.Body>
              <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'questions')} className="mb-4">
                <Tab eventKey="questions" title="Hỏi & Đáp">
                  <QuestionList documentId={currentDocument.id} />
                </Tab>
                <Tab eventKey="comments" title="Bình luận">
                  <CommentSection documentId={currentDocument.id} />
                </Tab>
                <Tab eventKey="ratings" title={`Đánh giá (${currentDocument.ratingCount})`}>
                  <RatingComponent documentId={currentDocument.id} />
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>

        {/* --- RIGHT COLUMN --- */}
        <Col lg={5}>
          <div className="sticky-top" style={{ top: '100px', zIndex: 1 }}>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-white fw-bold py-3 border-bottom">
                <i className="bi bi-eye me-2"></i> Xem trước tài liệu
              </Card.Header>
              <Card.Body className="p-0">
                <DocumentPreview documentId={currentDocument.id} />
              </Card.Body>
              <Card.Footer className="bg-light text-center small text-muted">
                Bạn đang xem bản xem trước giới hạn.
              </Card.Footer>
            </Card>

            {currentDocument.tags && currentDocument.tags.length > 0 && (
              <Card className="mt-3 shadow-sm border-0">
                <Card.Body>
                  <h6 className="mb-3">Tags</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {currentDocument.tags.map((tag, idx) => (
                      <Badge key={idx} bg="light" text="dark" className="border">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default DocumentDetailPage;
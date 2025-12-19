/**
 * Verified Author Progress Page
 * Shows user's progress towards automatic verification
 */

import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, ProgressBar, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';

interface CriteriaProgress {
  current: number | boolean;
  required: number | boolean;
  met: boolean;
}

interface VerificationProgress {
  isVerified: boolean;
  eligibleForVerification: boolean;
  criteria: {
    emailVerified: CriteriaProgress;
    totalDocuments: CriteriaProgress;
    fiveStarDocuments: CriteriaProgress;
    totalDownloads: CriteriaProgress;
  };
}

const VerifiedAuthorProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, token, user } = useAuth();

  const [progress, setProgress] = useState<VerificationProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  console.log('🔍 VerifiedAuthorProgressPage mounted', { isAuthenticated, token: token ? 'exists' : 'null', user });

  useEffect(() => {
    console.log('🔍 useEffect triggered', { isAuthenticated });
    
    if (!isAuthenticated) {
      console.log('⚠️ Not authenticated, redirecting to login');
      navigate('/login');
      return;
    }

    console.log('✅ Authenticated, fetching progress...');
    fetchProgress();
  }, [isAuthenticated]);

  const fetchProgress = async () => {
    console.log('📡 fetchProgress called', { token: token ? 'exists' : 'null' });
    
    try {
      setLoading(true);
      console.log('📡 Sending request to /verified-author/progress');
      
      const response = await apiClient.get('/verified-author/progress');
      
      console.log('✅ Progress response:', response.data);
      setProgress(response.data.data);
    } catch (err: any) {
      console.error('❌ Failed to fetch progress:', err);
      console.error('❌ Error response:', err.response?.data);
      const errorMessage = err.response?.data?.error || 'Không thể tải thông tin tiến độ';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestVerification = async () => {
    try {
      setVerifying(true);
      await apiClient.post('/verified-author/verify');
      
      toast.success('🎉 Chúc mừng! Bạn đã trở thành Tác giả uy tín!');
      
      // Reload to update badge
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Chưa đủ tiêu chuẩn để nhận verified badge');
      fetchProgress(); // Refresh progress
    } finally {
      setVerifying(false);
    }
  };

  const renderCriteriaCard = (
    icon: string,
    title: string,
    criteria: CriteriaProgress,
    type: 'boolean' | 'number' = 'number'
  ) => {
    let progressPercent = 0;
    let displayText = '';

    if (type === 'boolean') {
      progressPercent = criteria.current ? 100 : 0;
      displayText = criteria.current ? 'Đã xác minh' : 'Chưa xác minh';
    } else {
      const current = criteria.current as number;
      const required = criteria.required as number;
      progressPercent = Math.min((current / required) * 100, 100);
      displayText = `${current} / ${required}`;
    }

    return (
      <Card className={`mb-3 border ${criteria.met ? 'border-success' : 'border-secondary'}`}>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h6 className="mb-1">
                <i className={`bi ${icon} me-2`}></i>
                {title}
              </h6>
              <div className="d-flex align-items-center gap-2">
                <span className="fs-4 fw-bold">{displayText}</span>
                {criteria.met && (
                  <Badge bg="success" pill>
                    <i className="bi bi-check-circle me-1"></i>
                    Đạt
                  </Badge>
                )}
              </div>
            </div>
            {criteria.met ? (
              <i className="bi bi-check-circle-fill text-success fs-3"></i>
            ) : (
              <i className="bi bi-circle text-secondary fs-3"></i>
            )}
          </div>
          <ProgressBar 
            now={progressPercent} 
            variant={criteria.met ? 'success' : 'primary'}
            className="mb-2"
            style={{ height: '8px' }}
          />
          <small className="text-muted">
            {criteria.met ? 'Tiêu chí đã đạt!' : `Cần ${type === 'boolean' ? 'xác minh email' : `thêm ${(criteria.required as number) - (criteria.current as number)}`}`}
          </small>
        </Card.Body>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container className="py-5 text-center" style={{ marginTop: '80px' }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Đang tải tiến độ...</p>
      </Container>
    );
  }

  if (!progress) {
    return (
      <Container className="py-5" style={{ marginTop: '80px' }}>
        <Alert variant="danger">Không thể tải thông tin tiến độ</Alert>
      </Container>
    );
  }

  if (progress.isVerified) {
    return (
      <Container className="py-4" style={{ marginTop: '80px', maxWidth: '800px' }}>
        <Card className="text-center border-success">
          <Card.Body className="py-5">
            <i className="bi bi-patch-check-fill text-success" style={{ fontSize: '5rem' }}></i>
            <h2 className="mt-3">Bạn đã là Tác giả uy tín!</h2>
            <p className="text-muted">
              Badge xanh đã được kích hoạt trên hồ sơ của bạn.
            </p>
            <Button variant="primary" onClick={() => navigate('/profile')}>
              Xem hồ sơ
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  const criteriaArray = Object.entries(progress.criteria);
  const metCount = criteriaArray.filter(([_, c]) => c.met).length;
  const totalCount = criteriaArray.length;
  const overallProgress = (metCount / totalCount) * 100;

  return (
    <Container className="py-4" style={{ marginTop: '80px', maxWidth: '900px' }}>
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">
            <i className="bi bi-award me-2"></i>
            Tiến độ trở thành Tác giả uy tín
          </h4>
        </Card.Header>
        <Card.Body>
          {progress.eligibleForVerification ? (
            <Alert variant="success">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <i className="bi bi-check-circle-fill me-2"></i>
                  <strong>Chúc mừng!</strong> Bạn đã đủ tiêu chuẩn để trở thành Tác giả uy tín!
                </div>
                <Button 
                  variant="success" 
                  onClick={handleRequestVerification}
                  disabled={verifying}
                >
                  {verifying ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-award me-2"></i>
                      Nhận Badge ngay
                    </>
                  )}
                </Button>
              </div>
            </Alert>
          ) : (
            <Alert variant="info">
              <h6>Về huy hiệu Tác giả uy tín:</h6>
              <p className="mb-2">
                Huy hiệu Tác giả uy tín được cấp <strong>tự động</strong> khi bạn đáp ứng đủ tất cả tiêu chuẩn bên dưới.
              </p>
              <p className="mb-0">
                <strong>Lợi ích:</strong> Badge xanh bên cạnh tên, tăng uy tín, được ưu tiên trong tìm kiếm.
              </p>
            </Alert>
          )}

          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="mb-0">Tổng quan</h6>
              <span className="text-muted">{metCount}/{totalCount} tiêu chí đạt</span>
            </div>
            <ProgressBar 
              now={overallProgress} 
              variant={progress.eligibleForVerification ? 'success' : 'primary'}
              style={{ height: '12px' }}
            />
          </div>
        </Card.Body>
      </Card>

      <Row>
        <Col md={6}>
          {renderCriteriaCard(
            'bi-envelope-check',
            'Email đã xác minh',
            progress.criteria.emailVerified,
            'boolean'
          )}
        </Col>
        <Col md={6}>
          {renderCriteriaCard(
            'bi-file-earmark-text',
            'Tổng số tài liệu',
            progress.criteria.totalDocuments
          )}
        </Col>
        <Col md={6}>
          {renderCriteriaCard(
            'bi-star-fill',
            'Tài liệu 5 sao',
            progress.criteria.fiveStarDocuments
          )}
        </Col>
        <Col md={6}>
          {renderCriteriaCard(
            'bi-download',
            'Tổng lượt tải xuống',
            progress.criteria.totalDownloads
          )}
        </Col>
      </Row>

      <Card className="mt-3 border-0">
        <Card.Body>
          <h6 className="mb-3">
            <i className="bi bi-lightbulb me-2"></i>
            Mẹo để nhanh chóng trở thành Tác giả uy tín:
          </h6>
          <ul className="mb-0">
            <li>Xác minh email ngay để hoàn thành tiêu chí đầu tiên</li>
            <li>Tải lên tài liệu chất lượng cao với mô tả chi tiết</li>
            <li>Chọn tags phù hợp để tài liệu dễ tìm kiếm hơn</li>
            <li>Tương tác với cộng đồng qua Q&A và bình luận</li>
            <li>Chia sẻ tài liệu của bạn để tăng lượt tải xuống</li>
          </ul>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default VerifiedAuthorProgressPage;

/**
 * Verified Author Request Page - Submit request to become verified author
 */

import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

interface Request {
  request_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

const VerifiedAuthorRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, token, user } = useAuth();

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.isVerifiedAuthor) {
      navigate('/profile');
      return;
    }

    fetchRequests();
  }, [isAuthenticated, user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/verified-author/my-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data.data.requests || []);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch requests:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (reason.length < 50) {
      setError('Lý do phải có ít nhất 50 ký tự');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        '/api/verified-author/request',
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Yêu cầu đã được gửi thành công! Chúng tôi sẽ xem xét và phản hồi sớm nhất.');
      setReason('');
      fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không thể gửi yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  const hasPendingRequest = requests.some(r => r.status === 'pending');

  if (loading) {
    return (
      <Container className="py-5 text-center" style={{ marginTop: '80px' }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Đang tải...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ marginTop: '80px', maxWidth: '800px' }}>
      <Card>
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">
            <i className="bi bi-award me-2"></i>
            Đăng ký trở thành Tác giả uy tín
          </h4>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

          <Alert variant="info">
            <h6>Tiêu chí để trở thành Tác giả uy tín:</h6>
            <ul className="mb-0">
              <li>Đã tải lên ít nhất 5 tài liệu chất lượng</li>
              <li>Có đánh giá trung bình từ 4.0 sao trở lên</li>
              <li>Tài liệu có nhiều lượt tải xuống</li>
              <li>Tuân thủ quy định của ShareBuddy</li>
              <li>Không có vi phạm nghiêm trọng</li>
            </ul>
          </Alert>

          {!hasPendingRequest ? (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>
                  Lý do bạn muốn trở thành Tác giả uy tín <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={8}
                  placeholder="Vui lòng mô tả chi tiết về:&#10;- Kinh nghiệm học tập và nghề nghiệp&#10;- Thành tích nổi bật (nếu có)&#10;- Cam kết đóng góp cho cộng đồng ShareBuddy&#10;- Lý do bạn xứng đáng nhận huy hiệu Tác giả uy tín"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  minLength={50}
                  maxLength={1000}
                />
                <Form.Text className="text-muted">
                  {reason.length}/1000 ký tự (tối thiểu 50 ký tự)
                </Form.Text>
              </Form.Group>

              <div className="d-flex gap-2">
                <Button variant="primary" type="submit" disabled={submitting || reason.length < 50}>
                  {submitting ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Đang gửi...
                    </>
                  ) : (
                    'Gửi yêu cầu'
                  )}
                </Button>
                <Button variant="outline-secondary" onClick={() => navigate(-1)}>
                  Hủy
                </Button>
              </div>
            </Form>
          ) : (
            <Alert variant="warning">
              Bạn đã có yêu cầu đang chờ xét duyệt. Vui lòng đợi phản hồi từ quản trị viên.
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Request History */}
      {requests.length > 0 && (
        <Card className="mt-4">
          <Card.Header>
            <h5 className="mb-0">Lịch sử yêu cầu</h5>
          </Card.Header>
          <Card.Body>
            {requests.map((request) => (
              <Card key={request.request_id} className="mb-3">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <Badge
                        bg={
                          request.status === 'approved' ? 'success' :
                          request.status === 'rejected' ? 'danger' :
                          'warning'
                        }
                      >
                        {
                          request.status === 'approved' ? 'Đã chấp nhận' :
                          request.status === 'rejected' ? 'Đã từ chối' :
                          'Đang chờ'
                        }
                      </Badge>
                    </div>
                    <small className="text-muted">
                      {new Date(request.created_at).toLocaleDateString('vi-VN')}
                    </small>
                  </div>

                  <p className="mb-2">{request.reason}</p>

                  {request.admin_note && (
                    <Alert variant={request.status === 'approved' ? 'success' : 'danger'} className="mb-0">
                      <strong>Phản hồi từ Admin:</strong> {request.admin_note}
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            ))}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default VerifiedAuthorRequestPage;

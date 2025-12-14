/**
 * Verified Authors Page - Lists all verified authors
 */

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface VerifiedAuthor {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  university: string | null;
  major: string | null;
  document_count: number;
  avg_rating: number;
  total_downloads: number;
  follower_count: number;
}

const VerifiedAuthorsPage: React.FC = () => {
  const [authors, setAuthors] = useState<VerifiedAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchAuthors();
  }, [page]);

  const fetchAuthors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/verified-author/authors?page=${page}&limit=12`);
      
      const newAuthors = response.data.data.authors || [];
      const total = response.data.data.total || 0;
      
      setAuthors(prev => page === 1 ? newAuthors : [...prev, ...newAuthors]);
      setHasMore(authors.length + newAuthors.length < total);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không thể tải danh sách tác giả');
      setLoading(false);
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  if (loading && page === 1) {
    return (
      <Container className="py-5 text-center" style={{ marginTop: '80px' }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Đang tải...</p>
      </Container>
    );
  }

  if (error && page === 1) {
    return (
      <Container className="py-5" style={{ marginTop: '80px' }}>
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ marginTop: '80px' }}>
      <div className="mb-4">
        <h2>
          <Badge bg="primary" className="me-2">✓</Badge>
          Tác giả uy tín
        </h2>
        <p className="text-muted">
          Danh sách các tác giả đã được xác minh và có uy tín cao trên ShareBuddy
        </p>
      </div>

      {authors.length === 0 ? (
        <Alert variant="info">Chưa có tác giả uy tín nào.</Alert>
      ) : (
        <>
          <Row>
            {authors.map((author) => (
              <Col md={6} lg={4} key={author.user_id} className="mb-4">
                <Card className="h-100 shadow-sm hover-shadow">
                  <Card.Body>
                    <div className="d-flex align-items-start mb-3">
                      <img
                        src={author.avatar_url || '/default-avatar.png'}
                        alt={author.full_name}
                        className="rounded-circle me-3"
                        style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                      />
                      <div className="flex-grow-1">
                        <h5 className="mb-1">
                          <Link
                            to={`/profile/${author.username}`}
                            className="text-decoration-none text-dark"
                          >
                            {author.full_name}
                          </Link>
                          <Badge bg="primary" className="ms-2">✓</Badge>
                        </h5>
                        <p className="text-muted small mb-0">@{author.username}</p>
                      </div>
                    </div>

                    {author.bio && (
                      <p className="text-muted small mb-3" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {author.bio}
                      </p>
                    )}

                    {(author.university || author.major) && (
                      <div className="mb-3">
                        {author.university && (
                          <Badge bg="secondary" className="me-1 mb-1">{author.university}</Badge>
                        )}
                        {author.major && (
                          <Badge bg="info" className="mb-1">{author.major}</Badge>
                        )}
                      </div>
                    )}

                    <div className="row text-center g-0 border-top pt-3">
                      <div className="col-4">
                        <div className="fw-bold text-primary">{author.document_count}</div>
                        <small className="text-muted">Tài liệu</small>
                      </div>
                      <div className="col-4">
                        <div className="fw-bold text-warning">
                          {author.avg_rating ? parseFloat(author.avg_rating.toString()).toFixed(1) : '0.0'}
                        </div>
                        <small className="text-muted">Rating</small>
                      </div>
                      <div className="col-4">
                        <div className="fw-bold text-success">{author.total_downloads || 0}</div>
                        <small className="text-muted">Tải xuống</small>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {hasMore && (
            <div className="text-center mt-4">
              <Button
                variant="outline-primary"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Đang tải...
                  </>
                ) : (
                  'Xem thêm'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </Container>
  );
};

export default VerifiedAuthorsPage;

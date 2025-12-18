/**
 * Author Profile Modal Component - Overlay modal showing author's profile
 * Features: View author stats, documents, simplified profile view
 */

import React, { useState, useEffect } from 'react';
import { Modal, Row, Col, Card, Badge, Spinner, Alert, Tab, Tabs } from 'react-bootstrap';
import { FaFileAlt, FaDownload, FaEye, FaStar, FaUserPlus, FaTimes } from 'react-icons/fa';
import { userService } from '../../services/userService';
import { documentService } from '../../services/documentService';
import DocumentCard from './DocumentCard';

interface AuthorProfileModalProps {
  show: boolean;
  onHide: () => void;
  authorId: string;
}

interface AuthorProfile {
  id: string;
  username: string;
  fullName: string;
  bio?: string;
  university?: string;
  major?: string;
  avatarUrl?: string;
  isVerifiedAuthor: boolean;
  stats: {
    documentCount: number;
    avgRating?: string;
    followerCount: number;
    followingCount: number;
  };
}

const AuthorProfileModal: React.FC<AuthorProfileModalProps> = ({ show, onHide, authorId }) => {
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show && authorId) {
      loadAuthorProfile();
      loadAuthorDocuments();
    }
  }, [show, authorId]);

  const loadAuthorProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await userService.getUserProfile(authorId);
      if (response.success && response.data) {
        const userData = response.data;
        setProfile({
          id: userData.id,
          username: userData.username,
          fullName: userData.fullName,
          bio: userData.bio,
          university: userData.university,
          major: userData.major,
          avatarUrl: userData.avatarUrl,
          isVerifiedAuthor: userData.isVerifiedAuthor,
          stats: {
            documentCount: userData.stats?.documentCount || 0,
            avgRating: userData.stats?.avgRating,
            followerCount: userData.stats?.followerCount || 0,
            followingCount: userData.stats?.followingCount || 0
          }
        });
      }
    } catch (err: any) {
      console.error('Error loading author profile:', err);
      setError('Không thể tải thông tin tác giả');
    } finally {
      setLoading(false);
    }
  };

  const loadAuthorDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const response = await documentService.getDocuments({ 
        authorId: authorId,
        status: 'approved' 
      } as any);
      if (response.success && response.data) {
        setDocuments(response.data.items || []);
      }
    } catch (err: any) {
      console.error('Error loading author documents:', err);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const calculateTotalDownloads = () => {
    return documents.reduce((sum, doc) => sum + (doc.downloadCount || 0), 0);
  };

  const calculateTotalViews = () => {
    return documents.reduce((sum, doc) => sum + (doc.viewCount || 0), 0);
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      backdrop="static"
      className="author-profile-modal"
      style={{
        backdropFilter: 'blur(5px)',
      }}
    >
      <Modal.Header className="border-0 pb-0">
        <button
          type="button"
          className="btn-close"
          onClick={onHide}
          aria-label="Close"
        />
      </Modal.Header>
      
      <Modal.Body className="pt-0">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Đang tải thông tin tác giả...</p>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : profile ? (
          <>
            {/* Author Header */}
            <div className="text-center mb-4">
              <div className="position-relative d-inline-block mb-3">
                <img
                  src={profile.avatarUrl || 'https://via.placeholder.com/150'}
                  alt={profile.fullName}
                  className="rounded-circle"
                  style={{ width: '120px', height: '120px', objectFit: 'cover', border: '3px solid #f8f9fa' }}
                />
              </div>
              <h4 className="mb-1">
                {profile.fullName}
                {profile.isVerifiedAuthor && (
                  <Badge bg="primary" className="ms-2">
                    <i className="bi bi-patch-check-fill" /> Verified
                  </Badge>
                )}
              </h4>
              <p className="text-muted mb-2">@{profile.username}</p>
              
              {profile.bio && (
                <p className="text-muted mb-3" style={{ maxWidth: '600px', margin: '0 auto' }}>
                  {profile.bio}
                </p>
              )}
              
              <div className="d-flex justify-content-center gap-2 mb-3">
                {profile.university && (
                  <Badge bg="light" text="dark">
                    <i className="bi bi-building me-1" />
                    {profile.university}
                  </Badge>
                )}
                {profile.major && (
                  <Badge bg="light" text="dark">
                    <i className="bi bi-mortarboard me-1" />
                    {profile.major}
                  </Badge>
                )}
              </div>
            </div>

            {/* Stats Section */}
            <Row className="mb-4 g-2">
              <Col xs={6} lg={3}>
                <Card className="text-center border-0 shadow-sm py-2 px-2">
                  <Card.Body className="p-2">
                    <FaFileAlt className="text-primary mb-2" style={{ fontSize: '1.5rem' }} />
                    <h5 className="mb-0" style={{ fontSize: '1.25rem' }}>{profile.stats.documentCount}</h5>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>Tài liệu</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={6} lg={3}>
                <Card className="text-center border-0 shadow-sm py-2 px-2">
                  <Card.Body className="p-2">
                    <FaDownload className="text-success mb-2" style={{ fontSize: '1.5rem' }} />
                    <h5 className="mb-0" style={{ fontSize: '1.25rem' }}>{calculateTotalDownloads()}</h5>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>Lượt tải</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={6} lg={3}>
                <Card className="text-center border-0 shadow-sm py-2 px-2">
                  <Card.Body className="p-2">
                    <FaEye className="text-info mb-2" style={{ fontSize: '1.5rem' }} />
                    <h5 className="mb-0" style={{ fontSize: '1.25rem' }}>{calculateTotalViews()}</h5>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>Lượt xem</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={6} lg={3}>
                <Card className="text-center border-0 shadow-sm py-2 px-2">
                  <Card.Body className="p-2">
                    <FaStar className="text-warning mb-2" style={{ fontSize: '1.5rem' }} />
                    <h5 className="mb-0" style={{ fontSize: '1.25rem' }}>
                      {profile.stats.avgRating ? parseFloat(profile.stats.avgRating).toFixed(1) : '0.0'}
                    </h5>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>Đánh giá</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Documents Section */}
            <div className="mt-4">
              <h5 className="mb-3">
                <FaFileAlt className="me-2" />
                Tài liệu của tác giả
              </h5>
              
              {documentsLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" size="sm" />
                  <p className="text-muted mt-2">Đang tải tài liệu...</p>
                </div>
              ) : documents.length === 0 ? (
                <Alert variant="info">Tác giả chưa có tài liệu nào.</Alert>
              ) : (
                <Row className="g-3">
                  {documents.map((doc) => (
                    <Col key={doc.id} xs={12} sm={6} lg={4}>
                      <DocumentCard document={doc} compact showAuthor={false} />
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          </>
        ) : null}
      </Modal.Body>
    </Modal>
  );
};

export default AuthorProfileModal;

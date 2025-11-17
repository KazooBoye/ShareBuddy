/**
 * CommentSection - Hiển thị và quản lý bình luận tài liệu với thread và replies
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Modal, Dropdown, Alert, Badge } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';
import { commentService } from '../../services/commentService';
import { Comment } from '../../types';
import { toast } from 'react-toastify';

interface CommentSectionProps {
  documentId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ documentId }) => {
  const { isAuthenticated, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'popular'>('newest');

  useEffect(() => {
    loadComments();
  }, [documentId, pagination.page, sortOrder]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const response = await commentService.getDocumentComments(
        documentId, 
        pagination.page, 
        10
      );
      setComments(response.data?.items || []);
      setPagination({
        page: response.data?.page || 1,
        totalPages: response.data?.totalPages || 1,
        totalItems: response.data?.totalItems || 0
      });
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast.error('Không thể tải bình luận');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để bình luận');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Vui lòng nhập nội dung bình luận');
      return;
    }

    setIsSubmitting(true);
    try {
      await commentService.addComment(documentId, newComment);
      setNewComment('');
      toast.success('Bình luận thành công!');
      loadComments();
    } catch (error: any) {
      toast.error(error.message || 'Không thể gửi bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyComment = async (parentId: string) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để trả lời');
      return;
    }

    if (!replyText.trim()) {
      toast.error('Vui lòng nhập nội dung trả lời');
      return;
    }

    setIsSubmitting(true);
    try {
      await commentService.replyToComment(parentId, replyText);
      setReplyText('');
      setReplyingTo(null);
      toast.success('Trả lời thành công!');
      loadComments();
    } catch (error: any) {
      toast.error(error.message || 'Không thể gửi trả lời');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) {
      toast.error('Vui lòng nhập nội dung chỉnh sửa');
      return;
    }

    setIsSubmitting(true);
    try {
      await commentService.updateComment(commentId, editText);
      setEditText('');
      setEditingComment(null);
      toast.success('Cập nhật bình luận thành công!');
      loadComments();
    } catch (error: any) {
      toast.error(error.message || 'Không thể cập nhật bình luận');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId);
      setShowDeleteModal(null);
      toast.success('Xóa bình luận thành công!');
      loadComments();
    } catch (error: any) {
      toast.error(error.message || 'Không thể xóa bình luận');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để like bình luận');
      return;
    }

    try {
      await commentService.toggleCommentLike(commentId);
      loadComments();
    } catch (error: any) {
      toast.error(error.message || 'Không thể like bình luận');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return diffMinutes <= 1 ? 'Vừa xong' : `${diffMinutes} phút trước`;
      }
      return `${diffHours} giờ trước`;
    } else if (diffDays === 1) {
      return 'Hôm qua';
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN');
    }
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => (
    <Card key={comment.id} className={`mb-3 ${isReply ? 'ms-4 border-start border-3' : ''}`}>
      <Card.Body>
        <div className="d-flex align-items-start">
          <img
            src={comment.user.avatarUrl || '/default-avatar.png'}
            alt="User"
            className="user-avatar me-3"
          />
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h6 className="mb-1">
                  {comment.user.fullName || comment.user.username}
                  {comment.user.isVerifiedAuthor && (
                    <i className="bi bi-patch-check-fill text-primary ms-1" />
                  )}

                </h6>
                <small className="text-muted">{formatDate(comment.createdAt)}</small>
                {comment.updatedAt !== comment.createdAt && (
                  <small className="text-muted"> • đã chỉnh sửa</small>
                )}
              </div>
              
              {/* Comment Actions Menu */}
              {isAuthenticated && (
                <Dropdown align="end">
                  <Dropdown.Toggle 
                    variant="link" 
                    size="sm" 
                    className="text-muted p-0 border-0"
                  >
                    <i className="bi bi-three-dots" />
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {(user?.id === comment.user.id || user?.role === 'admin') && (
                      <>
                        <Dropdown.Item 
                          onClick={() => {
                            setEditingComment(comment.id);
                            setEditText(comment.content);
                          }}
                        >
                          <i className="bi bi-pencil me-2" />
                          Chỉnh sửa
                        </Dropdown.Item>
                        <Dropdown.Item 
                          className="text-danger"
                          onClick={() => setShowDeleteModal(comment.id)}
                        >
                          <i className="bi bi-trash me-2" />
                          Xóa
                        </Dropdown.Item>
                      </>
                    )}
                    <Dropdown.Item onClick={() => {/* Report comment */}}>
                      <i className="bi bi-flag me-2" />
                      Báo cáo
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </div>
            
            {/* Comment Content */}
            {editingComment === comment.id ? (
              <div>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="mb-2"
                />
                <div className="d-flex gap-2">
                  <Button 
                    size="sm" 
                    variant="primary"
                    onClick={() => handleEditComment(comment.id)}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => {
                      setEditingComment(null);
                      setEditText('');
                    }}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="mb-2">{comment.content}</p>
                
                {/* Comment Actions */}
                <div className="d-flex align-items-center gap-3">
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0"
                    onClick={() => handleLikeComment(comment.id)}
                  >
                    <i className={`bi bi-hand-thumbs-up${comment.isLiked ? '-fill text-primary' : ''}`} />
                    <span className="ms-1">{comment.likeCount || 0}</span>
                  </Button>
                  
                  {!isReply && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0"
                      onClick={() => {
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                        setReplyText('');
                      }}
                    >
                      <i className="bi bi-reply me-1" />
                      Trả lời
                    </Button>
                  )}
                  
                  {comment.replyCount > 0 && !isReply && (
                    <small className="text-muted">
                      {comment.replyCount} trả lời
                    </small>
                  )}
                </div>
              </div>
            )}
            
            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-3">
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder={`Trả lời ${comment.user.fullName || comment.user.username}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="mb-2"
                />
                <div className="d-flex gap-2">
                  <Button 
                    size="sm" 
                    variant="primary"
                    onClick={() => handleReplyComment(comment.id)}
                    disabled={isSubmitting || !replyText.trim()}
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Gửi trả lời'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText('');
                    }}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card.Body>
      
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ps-3">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </Card>
  );

  return (
    <div className="comment-section">
      {/* Comment Form */}
      {isAuthenticated ? (
        <Card className="mb-4">
          <Card.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Viết bình luận</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Chia sẻ ý kiến của bạn về tài liệu này..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
              </Form.Group>
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  Hãy giữ bình luận lịch sự và xây dựng
                </small>
                <Button 
                  variant="primary"
                  onClick={handleSubmitComment}
                  disabled={isSubmitting || !newComment.trim()}
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi bình luận'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      ) : (
        <Alert variant="info" className="mb-4">
          <i className="bi bi-info-circle me-2" />
          <a href="/login" className="alert-link">Đăng nhập</a> để viết bình luận
        </Alert>
      )}

      {/* Comments Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6>Bình luận ({pagination.totalItems})</h6>
        
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" size="sm">
            <i className="bi bi-sort-down me-1" />
            {sortOrder === 'newest' && 'Mới nhất'}
            {sortOrder === 'oldest' && 'Cũ nhất'}
            {sortOrder === 'popular' && 'Phổ biến'}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item onClick={() => setSortOrder('newest')}>
              Mới nhất
            </Dropdown.Item>
            <Dropdown.Item onClick={() => setSortOrder('oldest')}>
              Cũ nhất
            </Dropdown.Item>
            <Dropdown.Item onClick={() => setSortOrder('popular')}>
              Phổ biến
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-4">
          <div className="spinner-border spinner-border-sm me-2" />
          Đang tải bình luận...
        </div>
      ) : comments.length === 0 ? (
        <Alert variant="light" className="text-center">
          <i className="bi bi-chat display-4 text-muted mb-3 d-block" />
          <p className="text-muted mb-0">
            Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
          </p>
        </Alert>
      ) : (
        <>
          {comments.map(comment => renderComment(comment))}
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <nav>
                <ul className="pagination">
                  <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                    >
                      Trước
                    </button>
                  </li>
                  
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                    <li key={pageNum} className={`page-item ${pagination.page === pageNum ? 'active' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                      >
                        {pageNum}
                      </button>
                    </li>
                  ))}
                  
                  <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Sau
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal !== null} 
        onHide={() => setShowDeleteModal(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận xóa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Bạn có chắc chắn muốn xóa bình luận này không? Hành động này không thể hoàn tác.
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteModal(null)}
          >
            Hủy
          </Button>
          <Button 
            variant="danger" 
            onClick={() => showDeleteModal && handleDeleteComment(showDeleteModal)}
          >
            Xóa
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CommentSection;
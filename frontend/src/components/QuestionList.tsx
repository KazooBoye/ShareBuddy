/**
 * QuestionList Component - Display questions for a document
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Form, Alert, Spinner, Modal } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

interface Question {
  id: string;
  title: string;
  content: string;
  isAnswered: boolean;
  acceptedAnswerId: string | null;
  voteCount: number;
  viewCount: number;
  answerCount: number;
  author: {
    username: string;
    name: string;
    avatar: string | null;
    isVerified: boolean;
  };
  createdAt: string;
}

interface QuestionListProps {
  documentId: string;
}

const QuestionList: React.FC<QuestionListProps> = ({ documentId }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [showNewQuestionModal, setShowNewQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ title: '', content: '' });
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    fetchQuestions();
  }, [documentId, sortBy]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/questions/document/${documentId}`, {
        params: { sortBy }
      });
      setQuestions(response.data.data.questions);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không thể tải câu hỏi');
      setLoading(false);
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để đặt câu hỏi');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        '/api/questions',
        {
          documentId,
          title: newQuestion.title,
          content: newQuestion.content
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowNewQuestionModal(false);
      setNewQuestion({ title: '', content: '' });
      fetchQuestions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Không thể tạo câu hỏi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (questionId: string, voteType: number) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để vote');
      return;
    }

    try {
      await axios.post(
        `/api/questions/${questionId}/vote`,
        { voteType },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      fetchQuestions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Không thể vote');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Đang tải câu hỏi...</p>
      </div>
    );
  }

  return (
    <div className="question-list">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Hỏi & Đáp</h3>
        <div className="d-flex gap-2">
          <Form.Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="recent">Mới nhất</option>
            <option value="votes">Nhiều vote</option>
            <option value="unanswered">Chưa trả lời</option>
          </Form.Select>
          <Button variant="primary" onClick={() => setShowNewQuestionModal(true)}>
            Đặt câu hỏi
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {questions.length === 0 ? (
        <Alert variant="info">
          Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!
        </Alert>
      ) : (
        questions.map((question) => (
          <Card key={question.id} className="mb-3">
            <Card.Body>
              <div className="d-flex">
                <div className="d-flex flex-column align-items-center me-3" style={{ minWidth: '50px' }}>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-secondary"
                    onClick={() => handleVote(question.id, 1)}
                  >
                    ▲
                  </Button>
                  <span className="fw-bold">{question.voteCount}</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-secondary"
                    onClick={() => handleVote(question.id, -1)}
                  >
                    ▼
                  </Button>
                </div>

                <div className="flex-grow-1">
                  <h5>
                    <a href={`/questions/${question.id}`} className="text-decoration-none">
                      {question.title}
                    </a>
                  </h5>
                  <p className="text-muted mb-2">{question.content.substring(0, 200)}...</p>
                  
                  <div className="d-flex gap-2 mb-2">
                    {question.isAnswered && (
                      <Badge bg="success">✓ Đã trả lời</Badge>
                    )}
                    <Badge bg="secondary">{question.answerCount} câu trả lời</Badge>
                    <Badge bg="info">{question.viewCount} lượt xem</Badge>
                  </div>

                  <div className="d-flex justify-content-between align-items-center text-muted small">
                    <div>
                      Hỏi bởi <strong>{question.author.name}</strong>
                      {question.author.isVerified && (
                        <Badge bg="primary" className="ms-1">✓</Badge>
                      )}
                    </div>
                    <span>{new Date(question.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        ))
      )}

      {/* New Question Modal */}
      <Modal show={showNewQuestionModal} onHide={() => setShowNewQuestionModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Đặt câu hỏi mới</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitQuestion}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Tiêu đề câu hỏi *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Nhập tiêu đề câu hỏi (ít nhất 10 ký tự)"
                value={newQuestion.title}
                onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                required
                minLength={10}
                maxLength={500}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nội dung câu hỏi *</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                placeholder="Mô tả chi tiết câu hỏi của bạn (ít nhất 20 ký tự)"
                value={newQuestion.content}
                onChange={(e) => setNewQuestion({ ...newQuestion, content: e.target.value })}
                required
                minLength={20}
              />
            </Form.Group>

            <Alert variant="info">
              <small>
                Bạn sẽ nhận được <strong>1 credit</strong> khi đặt câu hỏi.
                Câu hỏi chất lượng sẽ thu hút nhiều câu trả lời hơn!
              </small>
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNewQuestionModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Đặt câu hỏi'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default QuestionList;

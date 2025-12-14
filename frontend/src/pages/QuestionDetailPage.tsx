/**
 * QuestionDetail Page - Display question with answers
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

interface Answer {
  id: string;
  content: string;
  isAccepted: boolean;
  voteCount: number;
  author: {
    username: string;
    name: string;
    avatar: string | null;
    isVerified: boolean;
  };
  createdAt: string;
}

interface QuestionDetail {
  id: string;
  title: string;
  content: string;
  isAnswered: boolean;
  acceptedAnswerId: string | null;
  voteCount: number;
  viewCount: number;
  documentId: string;
  documentTitle: string;
  author: {
    username: string;
    name: string;
    avatar: string | null;
    isVerified: boolean;
  };
  createdAt: string;
}

const QuestionDetailPage: React.FC = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, token, user } = useAuth();

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [newAnswer, setNewAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestion();
  }, [questionId]);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/questions/${questionId}`);
      setQuestion(response.data.data.question);
      setAnswers(response.data.data.answers);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không thể tải câu hỏi');
      setLoading(false);
    }
  };

  const handleVoteQuestion = async (voteType: number) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để vote');
      return;
    }

    try {
      await axios.post(
        `/api/questions/${questionId}/vote`,
        { voteType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchQuestion();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Không thể vote');
    }
  };

  const handleVoteAnswer = async (answerId: string, voteType: number) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để vote');
      return;
    }

    try {
      await axios.post(
        `/api/questions/answer/${answerId}/vote`,
        { voteType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchQuestion();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Không thể vote');
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để trả lời');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        '/api/questions/answer',
        {
          questionId,
          content: newAnswer
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewAnswer('');
      fetchQuestion();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Không thể gửi câu trả lời');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập');
      return;
    }

    try {
      await axios.post(
        `/api/questions/answer/${answerId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchQuestion();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Không thể chấp nhận câu trả lời');
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center" style={{ marginTop: '80px' }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Đang tải câu hỏi...</p>
      </Container>
    );
  }

  if (error || !question) {
    return (
      <Container className="py-5" style={{ marginTop: '80px' }}>
        <Alert variant="danger">{error || 'Không tìm thấy câu hỏi'}</Alert>
        <Button variant="primary" onClick={() => navigate(-1)}>
          Quay lại
        </Button>
      </Container>
    );
  }

  const isQuestionAuthor = user?.id === question.author.username;

  return (
    <Container className="py-4" style={{ marginTop: '80px' }}>
      <Button variant="link" onClick={() => navigate(`/documents/${question.documentId}`)}>
        ← Quay lại tài liệu: {question.documentTitle}
      </Button>

      {/* Question */}
      <Card className="mb-4 mt-3">
        <Card.Body>
          <div className="d-flex">
            <div className="d-flex flex-column align-items-center me-3" style={{ minWidth: '50px' }}>
              <Button
                variant="link"
                size="sm"
                className="p-0 text-secondary"
                onClick={() => handleVoteQuestion(1)}
              >
                ▲
              </Button>
              <span className="fw-bold fs-4">{question.voteCount}</span>
              <Button
                variant="link"
                size="sm"
                className="p-0 text-secondary"
                onClick={() => handleVoteQuestion(-1)}
              >
                ▼
              </Button>
            </div>

            <div className="flex-grow-1">
              <h2>{question.title}</h2>
              
              <div className="d-flex gap-2 mb-3">
                {question.isAnswered && (
                  <Badge bg="success">✓ Đã trả lời</Badge>
                )}
                <Badge bg="info">{question.viewCount} lượt xem</Badge>
              </div>

              <p className="lead">{question.content}</p>

              <div className="d-flex justify-content-between align-items-center text-muted small mt-3">
                <div>
                  Hỏi bởi <strong>{question.author.name}</strong>
                  {question.author.isVerified && (
                    <Badge bg="primary" className="ms-1">✓ Verified</Badge>
                  )}
                </div>
                <span>{new Date(question.createdAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Answers */}
      <h4 className="mb-3">{answers.length} Câu trả lời</h4>

      {answers.map((answer) => (
        <Card key={answer.id} className={`mb-3 ${answer.isAccepted ? 'border-success' : ''}`}>
          <Card.Body>
            <div className="d-flex">
              <div className="d-flex flex-column align-items-center me-3" style={{ minWidth: '50px' }}>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-secondary"
                  onClick={() => handleVoteAnswer(answer.id, 1)}
                >
                  ▲
                </Button>
                <span className="fw-bold">{answer.voteCount}</span>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-secondary"
                  onClick={() => handleVoteAnswer(answer.id, -1)}
                >
                  ▼
                </Button>

                {isQuestionAuthor && !answer.isAccepted && (
                  <Button
                    variant="outline-success"
                    size="sm"
                    className="mt-2"
                    onClick={() => handleAcceptAnswer(answer.id)}
                  >
                    ✓
                  </Button>
                )}
              </div>

              <div className="flex-grow-1">
                {answer.isAccepted && (
                  <Badge bg="success" className="mb-2">
                    ✓ Câu trả lời được chấp nhận
                  </Badge>
                )}
                
                <p>{answer.content}</p>

                <div className="d-flex justify-content-between align-items-center text-muted small">
                  <div>
                    Trả lời bởi <strong>{answer.author.name}</strong>
                    {answer.author.isVerified && (
                      <Badge bg="primary" className="ms-1">✓</Badge>
                    )}
                  </div>
                  <span>{new Date(answer.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      ))}

      {/* Answer Form */}
      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">Câu trả lời của bạn</h5>
        </Card.Header>
        <Card.Body>
          {isAuthenticated ? (
            <Form onSubmit={handleSubmitAnswer}>
              <Form.Group className="mb-3">
                <Form.Control
                  as="textarea"
                  rows={6}
                  placeholder="Nhập câu trả lời của bạn (ít nhất 20 ký tự)"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  required
                  minLength={20}
                />
              </Form.Group>

              <Alert variant="info">
                <small>
                  Bạn sẽ nhận được <strong>2 credits</strong> khi trả lời câu hỏi.
                  Nếu câu trả lời được chấp nhận, bạn sẽ nhận thêm <strong>5 credits</strong>!
                </small>
              </Alert>

              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Đang gửi...' : 'Gửi câu trả lời'}
              </Button>
            </Form>
          ) : (
            <Alert variant="warning">
              Vui lòng <a href="/login">đăng nhập</a> để trả lời câu hỏi.
            </Alert>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default QuestionDetailPage;

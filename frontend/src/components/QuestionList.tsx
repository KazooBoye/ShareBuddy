import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Badge, Form, Pagination, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { questionService } from '../services/questionService';
import { toast } from 'react-toastify';

interface QuestionListProps {
  documentId: string;
}

interface Question {
  id: string;
  title: string;
  voteCount: number;
  answerCount: number;
  isAnswered: boolean;
  createdAt: string;
  author: {
    name: string;
    avatar: string;
  };
}

const QuestionList: React.FC<QuestionListProps> = ({ documentId }) => {
  const { isAuthenticated } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [showAskForm, setShowAskForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await questionService.getQuestionsByDocumentId(documentId, page, 5);
      if (res.success && res.data) {
        setQuestions(res.data.questions);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [documentId, page]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để đặt câu hỏi');
      return;
    }

    try {
      setSubmitting(true);
      await questionService.createQuestion(documentId, newTitle, newContent);
      toast.success('Đặt câu hỏi thành công!');
      setShowAskForm(false);
      setNewTitle('');
      setNewContent('');
      setPage(1);
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.error || 'Lỗi khi tạo câu hỏi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="question-module">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0">Hỏi & Đáp ({questions.length})</h5>
        <Button 
          variant={showAskForm ? "secondary" : "primary"} 
          size="sm"
          onClick={() => setShowAskForm(!showAskForm)}
        >
          {showAskForm ? 'Hủy' : 'Đặt câu hỏi'}
        </Button>
      </div>

      {showAskForm && (
        <Card className="mb-4 bg-light border-0">
          <Card.Body>
            <Form onSubmit={handleAskSubmit}>
              <Form.Group className="mb-2">
                <Form.Label>Tiêu đề tóm tắt</Form.Label>
                <Form.Control 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="VD: Làm sao để chạy code ở trang 5?"
                  required 
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Chi tiết câu hỏi</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3} 
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  required 
                />
              </Form.Group>
              <div className="text-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Spinner size="sm" animation="border" /> : 'Gửi câu hỏi'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
      ) : questions.length === 0 ? (
        <Alert variant="light" className="text-center text-muted">
          Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!
        </Alert>
      ) : (
        <div className="question-list">
          {questions.map(q => (
            <Card key={q.id} className="mb-3 border-0 shadow-sm">
              <Card.Body className="p-3">
                <div className="d-flex">
                  <div className="text-center me-3 text-muted" style={{minWidth: '60px'}}>
                    <div className="fs-5 fw-bold">{q.voteCount}</div>
                    <small>votes</small>
                  </div>
                  <div className={`text-center me-3 p-1 rounded ${q.isAnswered ? 'bg-success text-white' : 'border'}`} style={{minWidth: '60px', height: 'fit-content'}}>
                    <div className="fw-bold">{q.answerCount}</div>
                    <small>trả lời</small>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1">
                      <Link to={`/questions/${q.id}`} className="text-decoration-none text-dark stretched-link">
                        {q.title}
                      </Link>
                    </h6>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <small className="text-muted">
                        Bởi <strong>{q.author.name}</strong> • {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                      </small>
                      {q.isAnswered && <Badge bg="success" pill>Đã giải quyết</Badge>}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination className="justify-content-center mt-3" size="sm">
          <Pagination.Prev disabled={page === 1} onClick={() => setPage(p => p - 1)} />
          {[...Array(totalPages)].map((_, idx) => (
            <Pagination.Item key={idx + 1} active={idx + 1 === page} onClick={() => setPage(idx + 1)}>
              {idx + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
        </Pagination>
      )}
    </div>
  );
};

export default QuestionList;
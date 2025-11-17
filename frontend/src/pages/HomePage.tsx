/**
 * Home Page for ShareBuddy
 */

import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  return (
    <Container className="py-5">
      <Row className="text-center mb-5">
        <Col>
          <h1 className="display-4 fw-bold text-gradient-purple mb-3">
            📚 Chào mừng đến ShareBuddy
          </h1>
          <p className="lead text-muted">
            Nền tảng chia sẻ tài liệu học tập dành cho sinh viên Việt Nam
          </p>
          <Link
            to="/documents"
            className="btn btn-primary btn-lg btn-gradient-purple me-3"
          >
            Khám phá tài liệu
          </Link>
          <Link
            to="/register"
            className="btn btn-outline-primary btn-lg"
          >
            Tham gia ngay
          </Link>
        </Col>
      </Row>

      <Row className="mb-5">
        <Col md={4} className="mb-4">
          <Card className="h-100 card-hover">
            <Card.Body className="text-center">
              <div className="accent-blue fs-1 mb-3">📖</div>
              <Card.Title>Thư viện phong phú</Card.Title>
              <Card.Text>
                Hàng nghìn tài liệu học tập từ các trường đại học hàng đầu Việt Nam
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 card-hover">
            <Card.Body className="text-center">
              <div className="accent-green fs-1 mb-3">🤝</div>
              <Card.Title>Cộng đồng hỗ trợ</Card.Title>
              <Card.Text>
                Kết nối với sinh viên cùng chuyên ngành, chia sẻ kinh nghiệm học tập
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-4">
          <Card className="h-100 card-hover">
            <Card.Body className="text-center">
              <div className="accent-yellow fs-1 mb-3">⭐</div>
              <Card.Title>Chất lượng đảm bảo</Card.Title>
              <Card.Text>
                Hệ thống đánh giá và kiểm duyệt giúp đảm bảo chất lượng tài liệu
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="text-center">
        <Col>
          <h2 className="mb-4">Tại sao chọn ShareBuddy?</h2>
          <p className="text-muted">
            ShareBuddy giúp sinh viên dễ dàng tìm kiếm, chia sẻ và đánh giá tài liệu học tập.
            Tham gia cộng đồng ngay hôm nay!
          </p>
        </Col>
      </Row>
    </Container>
  );
};

export default HomePage;
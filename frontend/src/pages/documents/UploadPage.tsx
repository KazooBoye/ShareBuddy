/**
 * Upload Page for ShareBuddy
 */

import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const UploadPage: React.FC = () => {
  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">⬆️ Tải lên tài liệu</h2>
          <Card>
            <Card.Body>
              <p className="text-muted">
                Tính năng tải lên tài liệu đang được phát triển...
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default UploadPage;
/**
 * Admin Page for ShareBuddy
 */

import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const AdminPage: React.FC = () => {
  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">⚙️ Quản trị hệ thống</h2>
          <Card>
            <Card.Body>
              <p className="text-muted">
                Trang quản trị đang được phát triển...
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminPage;
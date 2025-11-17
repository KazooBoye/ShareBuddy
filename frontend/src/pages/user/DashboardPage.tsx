/**
 * User Dashboard Page for ShareBuddy
 */

import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const DashboardPage: React.FC = () => {
  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">📊 Dashboard</h2>
          <Card>
            <Card.Body>
              <p className="text-muted">
                Dashboard người dùng đang được phát triển...
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;
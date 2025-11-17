/**
 * User Profile Page for ShareBuddy
 */

import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

const ProfilePage: React.FC = () => {
  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h2 className="mb-4">👤 Hồ sơ cá nhân</h2>
          <Card>
            <Card.Body>
              <p className="text-muted">
                Trang hồ sơ cá nhân đang được phát triển...
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfilePage;
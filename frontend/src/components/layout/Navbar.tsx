/**
 * Navbar Component for ShareBuddy
 */

import React from 'react';
import { Navbar as BSNavbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { toggleSidebar, toggleTheme } from '../../store/slices/uiSlice';
import { useAuth } from '../../hooks/useAuth';

const Navbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const { user, isAuthenticated, logout } = useAuth();

  // Default avatar as data URL to prevent infinite requests
  const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Ccircle cx="20" cy="20" r="20" fill="%236c757d"/%3E%3Ctext x="20" y="26" font-size="20" fill="white" text-anchor="middle" font-family="Arial"%3E👤%3C/text%3E%3C/svg%3E';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <BSNavbar bg="dark" variant="dark" expand="lg" fixed="top" className="shadow-sm">
      <Container fluid>
        {/* Sidebar toggle button */}
        <Button
          variant="outline-light"
          size="sm"
          onClick={() => dispatch(toggleSidebar())}
          className="me-3"
        >
          <i className="bi bi-list"></i>
        </Button>

        {/* Brand */}
        <BSNavbar.Brand as={Link} to="/" className="fw-bold text-gradient-purple">
          📚 ShareBuddy
        </BSNavbar.Brand>

        <BSNavbar.Toggle aria-controls="basic-navbar-nav" />
        
        <BSNavbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Trang chủ</Nav.Link>
            <Nav.Link as={Link} to="/documents">Tài liệu</Nav.Link>
          </Nav>

          <Nav className="align-items-center">
            {/* Theme toggle */}
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => dispatch(toggleTheme())}
              className="me-2"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </Button>

            {isAuthenticated ? (
              <>
                <Nav.Link as={Link} to="/upload" className="me-2">
                  Tải lên
                </Nav.Link>
                <Nav.Link as={Link} to="/dashboard" className="me-2">
                  Dashboard
                </Nav.Link>
                <div className="d-flex align-items-center">
                  <img
                    src={user?.avatarUrl || DEFAULT_AVATAR}
                    alt="Avatar"
                    className="user-avatar me-2"
                    onError={(e) => {
                      e.currentTarget.onerror = null; // Prevent infinite loop
                      e.currentTarget.src = DEFAULT_AVATAR;
                    }}
                  />
                  <span className="me-2 text-light d-none d-md-inline">
                    {user?.username}
                  </span>
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={handleLogout}
                  >
                    Đăng xuất
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" className="me-2">
                  Đăng nhập
                </Nav.Link>
                <Link
                  to="/register"
                  className="btn btn-primary btn-sm"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
};

export default Navbar;
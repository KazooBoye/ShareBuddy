/**
 * Sidebar Component for ShareBuddy
 */

import React, { useEffect } from 'react';
import { Nav, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useAuth } from '../../hooks/useAuth';
import { toggleSidebar } from '../../store/slices/uiSlice';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const { isAuthenticated, user } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <Nav className="flex-column p-3">
        {/* Public Navigation */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/"
            className={isActive('/') ? 'active' : ''}
          >
            <i className="bi bi-house me-2"></i>
            Trang chủ
          </Nav.Link>
        </Nav.Item>

        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/documents"
            className={isActive('/documents') ? 'active' : ''}
          >
            <i className="bi bi-file-text me-2"></i>
            Tài liệu
          </Nav.Link>
        </Nav.Item>

        {/* Authenticated Navigation */}
        {isAuthenticated && (
          <>
            <Nav.Item>
              <Nav.Link
                as={Link}
                to="/bookmarked"
                className={isActive('/bookmarked') ? 'active' : ''}
              >
                <i className="bi bi-bookmark-fill me-2"></i>
                Đã lưu
              </Nav.Link>
            </Nav.Item>
          </>
        )}

        {/* Admin Navigation */}
        {isAuthenticated && user?.role === 'admin' && (
          <>
            <hr className="my-2" />
            <Nav.Item>
              <Nav.Link
                as={Link}
                to="/admin"
                className={isActive('/admin') ? 'active' : ''}
              >
                <i className="bi bi-gear me-2"></i>
                Quản trị
              </Nav.Link>
            </Nav.Item>
          </>
        )}
      </Nav>
    </div>
  );
};

export default Sidebar;
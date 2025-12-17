/**
 * DocumentList Component - Hiển thị danh sách tài liệu với pagination
 * Features: Grid/List view, sorting, filtering, infinite scroll
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, Dropdown, Button, Spinner, Alert } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchDocuments, setSearchParams } from '../../store/slices/documentSlice';
import { Document, DocumentSearchParams } from '../../types';
import DocumentCard from './DocumentCard';
import SearchFilters from './SearchFilters';
import LoadingSpinner from '../common/LoadingSpinner';

interface DocumentListProps {
  title?: string;
  showFilters?: boolean;
  showViewToggle?: boolean;
  defaultView?: 'grid' | 'list';
  documentsOverride?: Document[];
  compact?: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({
  title = 'Tài liệu',
  showFilters = true,
  showViewToggle = true,
  defaultView = 'grid',
  documentsOverride,
  compact = false
}) => {
  const dispatch = useAppDispatch();
  const [searchParams, setUrlSearchParams] = useSearchParams();
  const { 
    documents, 
    searchResults, 
    isLoading, 
    error, 
    pagination 
  } = useAppSelector(state => state.documents);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(defaultView);
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Determine which documents to display
  const displayDocuments = documentsOverride || 
    (searchParams.get('search') ? searchResults : documents);

  // Parse search params to filters
  const getFiltersFromUrl = useCallback((): DocumentSearchParams => {
    const filters: DocumentSearchParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: 12,
      sortBy: searchParams.get('sortBy') as any || 'newest'
    };
    
    const search = searchParams.get('search');
    if (search) filters.search = search;
    
    const category = searchParams.get('category');
    if (category) filters.category = category;
    
    const subject = searchParams.get('subject');
    if (subject) filters.subject = subject;
    
    const minRating = searchParams.get('minRating');
    if (minRating) filters.minRating = parseInt(minRating);
    
    const maxCreditCost = searchParams.get('maxCreditCost');
    if (maxCreditCost) filters.maxCreditCost = parseInt(maxCreditCost);
    
    return filters;
  }, [searchParams]);

  // Load documents when filters change
  useEffect(() => {
    if (!documentsOverride) {
      const filters = getFiltersFromUrl();
      dispatch(setSearchParams(filters));
      dispatch(fetchDocuments(filters));
    }
  }, [dispatch, searchParams, documentsOverride, getFiltersFromUrl]);

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<DocumentSearchParams>) => {
    const currentFilters = getFiltersFromUrl();
    const updatedFilters = { ...currentFilters, ...newFilters, page: 1 };
    
    // Update URL params
    const newSearchParams = new URLSearchParams();
    Object.entries(updatedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        newSearchParams.set(key, value.toString());
      }
    });
    setUrlSearchParams(newSearchParams);
  };

  // Handle sort change
  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    handleFilterChange({ sortBy: newSortBy as any });
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    handleFilterChange({ page });
  };

  // Handle document download
  const handleDocumentDownload = useCallback((documentId: string) => {
    // Refresh documents to update download count
    const filters = getFiltersFromUrl();
    dispatch(fetchDocuments(filters));
  }, [dispatch, getFiltersFromUrl]);

  if (isLoading && displayDocuments.length === 0) {
    return <LoadingSpinner message="Đang tải tài liệu..." />;
  }

  if (error) {
    return (
      <Alert variant="danger" className="text-center">
        <i className="bi bi-exclamation-triangle me-2" />
        {error}
        <div className="mt-2">
          <Button variant="outline-danger" onClick={() => window.location.reload()}>
            Thử lại
          </Button>
        </div>
      </Alert>
    );
  }

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;
    
    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === pagination.currentPage ? 'primary' : 'outline-primary'}
          size="sm"
          className="me-1"
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      );
    }
    
    return (
      <div className="d-flex justify-content-center align-items-center mt-4">
        <Button
          variant="outline-primary"
          size="sm"
          className="me-2"
          disabled={!pagination.hasPrev}
          onClick={() => handlePageChange(pagination.currentPage - 1)}
        >
          <i className="bi bi-chevron-left" />
        </Button>
        
        {pages}
        
        <Button
          variant="outline-primary"
          size="sm"
          className="ms-2"
          disabled={!pagination.hasNext}
          onClick={() => handlePageChange(pagination.currentPage + 1)}
        >
          <i className="bi bi-chevron-right" />
        </Button>
      </div>
    );
  };

  return (
    <div className="document-list">
      {/* Header */}
      <Row className="align-items-center mb-4">
        <Col>
          <h3 className="mb-0">
            📚 {title}
            <small className="text-muted ms-2">
              ({pagination.totalItems || displayDocuments.length} tài liệu)
            </small>
          </h3>
        </Col>
        
        {showViewToggle && (
          <Col xs="auto">
            <div className="d-flex align-items-center">
              {/* Sort Dropdown */}
              <Dropdown className="me-3">
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  <i className="bi bi-sort-down me-1" />
                  Sắp xếp
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item 
                    active={sortBy === 'newest'}
                    onClick={() => handleSortChange('newest')}
                  >
                    Mới nhất
                  </Dropdown.Item>
                  <Dropdown.Item 
                    active={sortBy === 'oldest'}
                    onClick={() => handleSortChange('oldest')}
                  >
                    Cũ nhất
                  </Dropdown.Item>
                  <Dropdown.Item 
                    active={sortBy === 'popular'}
                    onClick={() => handleSortChange('popular')}
                  >
                    Phổ biến nhất
                  </Dropdown.Item>
                  <Dropdown.Item 
                    active={sortBy === 'rating'}
                    onClick={() => handleSortChange('rating')}
                  >
                    Đánh giá cao
                  </Dropdown.Item>
                  <Dropdown.Item 
                    active={sortBy === 'downloads'}
                    onClick={() => handleSortChange('downloads')}
                  >
                    Tải nhiều nhất
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              
              {/* View Toggle */}
              <div className="btn-group" role="group">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <i className="bi bi-grid" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <i className="bi bi-list" />
                </Button>
              </div>
            </div>
          </Col>
        )}
      </Row>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-4">
          <Card.Body>
            <SearchFilters 
              onFilterChange={handleFilterChange}
              initialFilters={getFiltersFromUrl()}
            />
          </Card.Body>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && displayDocuments.length > 0 && (
        <div className="text-center mb-3">
          <Spinner animation="border" size="sm" className="me-2" />
          Đang tải thêm tài liệu...
        </div>
      )}

      {/* Documents Grid/List */}
      {displayDocuments.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <i className="bi bi-files display-1 text-muted mb-3 d-block" />
            <h5 className="text-muted">Không tìm thấy tài liệu nào</h5>
            <p className="text-muted">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </Card.Body>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="document-grid">
              {displayDocuments.map((document) => (
                <DocumentCard 
                  key={document.id}
                  document={document} 
                  compact={compact}
                  onDownload={handleDocumentDownload}
                />
              ))}
            </div>
          ) : (
            <div className="document-list-view">
              {displayDocuments.map((document) => (
                <div key={document.id} className="mb-3">
                  <DocumentCard 
                    document={document} 
                    compact
                    onDownload={handleDocumentDownload}
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default DocumentList;
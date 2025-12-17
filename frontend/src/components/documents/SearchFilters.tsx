/**
 * SearchFilters Component - Bộ lọc tìm kiếm nâng cao
 * Features: subject, rating, credit cost filters
 */

import React, { useState, useMemo } from 'react';
import { Row, Col, Form, Button, Badge } from 'react-bootstrap';
import { DocumentSearchParams } from '../../types';
import debounce from 'lodash/debounce';

interface SearchFiltersProps {
  onFilterChange: (filters: Partial<DocumentSearchParams>) => void;
  initialFilters?: DocumentSearchParams;
  compact?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFilterChange,
  initialFilters = {},
  compact = false
}) => {
  const [filters, setFilters] = useState<DocumentSearchParams>(initialFilters);
  const [localSearch, setLocalSearch] = useState(initialFilters.search || '');
  const [localSubject, setLocalSubject] = useState(initialFilters.subject || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounced filter change using lodash
  const debouncedFilterChange = useMemo(
    () =>
      debounce((key: keyof DocumentSearchParams, value: any) => {
        setFilters((prevFilters) => {
          const newFilters = { ...prevFilters, [key]: value };
          onFilterChange(newFilters);
          return newFilters;
        });
      }, 500),
    [onFilterChange]
  );

  const handleFilterChange = (key: keyof DocumentSearchParams, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleTextInputChange = (key: keyof DocumentSearchParams, value: string) => {
    if (key === 'search') {
      setLocalSearch(value);
    } else if (key === 'subject') {
      setLocalSubject(value);
    }
    debouncedFilterChange(key, value || undefined);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: filters.search, // Keep search term
      page: 1,
      limit: filters.limit
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = () => {
    return !!(filters.subject || filters.minRating || filters.maxCreditCost || filters.tags?.length);
  };

  return (
    <div className="search-filters">
      <Row className="g-3">
        {/* Search Input */}
        <Col xs={12} md={compact ? 12 : 6}>
          <Form.Label>Tìm kiếm</Form.Label>
          <Form.Control
            type="text"
            placeholder="Tìm tài liệu..."
            value={localSearch}
            onChange={(e) => handleTextInputChange('search', e.target.value)}
          />
        </Col>

        {/* Subject Filter */}
        <Col xs={12} sm={6} md={compact ? 6 : 4}>
          <Form.Label>Môn học</Form.Label>
          <Form.Control
            type="text"
            placeholder="VD: Toán, Vật lý..."
            value={localSubject}
            onChange={(e) => handleTextInputChange('subject', e.target.value)}
          />
        </Col>

        {/* Action Buttons */}
        <Col xs={12} sm={6} md={compact ? 12 : 2}>
          <Form.Label className="d-none d-md-block">&nbsp;</Form.Label>
          <div className="d-flex gap-2 flex-wrap">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <i className={`bi bi-chevron-${showAdvanced ? 'up' : 'down'}`} />
              {compact ? '' : ' Nâng cao'}
            </Button>
            
            {hasActiveFilters() && (
              <Button
                variant="outline-danger"
                size="sm"
                onClick={clearFilters}
              >
                <i className="bi bi-x-circle" />
                {compact ? '' : ' Xóa bộ lọc'}
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Row className="mt-3 pt-3 border-top">
          {/* Rating Filter */}
          <Col md={4} className="mb-3">
            <Form.Label>Đánh giá tối thiểu</Form.Label>
            <Form.Select
              value={filters.minRating || ''}
              onChange={(e) => handleFilterChange('minRating', e.target.value ? parseInt(e.target.value) : undefined)}
            >
              <option value="">Tất cả</option>
              <option value="1">⭐ 1 sao trở lên</option>
              <option value="2">⭐ 2 sao trở lên</option>
              <option value="3">⭐ 3 sao trở lên</option>
              <option value="4">⭐ 4 sao trở lên</option>
              <option value="5">⭐ 5 sao</option>
            </Form.Select>
          </Col>

          {/* Credit Cost Filter */}
          <Col md={4} className="mb-3">
            <Form.Label>Chi phí tối đa (Credits)</Form.Label>
            <Form.Control
              type="number"
              min="0"
              placeholder="Nhập số credits..."
              value={filters.maxCreditCost || ''}
              onChange={(e) => handleFilterChange('maxCreditCost', e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </Col>

          {/* Sort By */}
          <Col md={4} className="mb-3">
            <Form.Label>Sắp xếp theo</Form.Label>
            <Form.Select
              value={filters.sortBy || 'newest'}
              onChange={(e) => handleFilterChange('sortBy', e.target.value as any)}
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="popular">Phổ biến nhất</option>
              <option value="rating">Đánh giá cao nhất</option>
              <option value="downloads">Tải nhiều nhất</option>
            </Form.Select>
          </Col>

          {/* Tags Input */}
          <Col md={12} className="mb-3">
            <Form.Label>Tags</Form.Label>
            <Form.Control
              type="text"
              placeholder="Nhập tags cách nhau bằng dấu phẩy..."
              value={filters.tags?.join(', ') || ''}
              onChange={(e) => {
                const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                handleFilterChange('tags', tags.length ? tags : undefined);
              }}
            />
          </Col>
        </Row>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <Row className="mt-3">
          <Col>
            <div className="d-flex flex-wrap align-items-center">
              <small className="text-muted me-2">Bộ lọc đang áp dụng:</small>
              
              {filters.subject && (
                <Badge bg="info" className="me-1 mb-1">
                  Môn học: {filters.subject}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1 text-white"
                    onClick={() => handleFilterChange('subject', undefined)}
                  >
                    <i className="bi bi-x" />
                  </Button>
                </Badge>
              )}
              
              {filters.minRating && (
                <Badge bg="warning" className="me-1 mb-1">
                  Min {filters.minRating}⭐
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1 text-dark"
                    onClick={() => handleFilterChange('minRating', undefined)}
                  >
                    <i className="bi bi-x" />
                  </Button>
                </Badge>
              )}
              
              {filters.maxCreditCost && (
                <Badge bg="success" className="me-1 mb-1">
                  Max {filters.maxCreditCost} credits
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1 text-white"
                    onClick={() => handleFilterChange('maxCreditCost', undefined)}
                  >
                    <i className="bi bi-x" />
                  </Button>
                </Badge>
              )}
              
              {filters.tags?.map((tag, index) => (
                <Badge key={index} bg="secondary" className="me-1 mb-1">
                  {tag}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1 text-white"
                    onClick={() => {
                      const newTags = filters.tags?.filter(t => t !== tag);
                      handleFilterChange('tags', newTags?.length ? newTags : undefined);
                    }}
                  >
                    <i className="bi bi-x" />
                  </Button>
                </Badge>
              ))}
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default SearchFilters;
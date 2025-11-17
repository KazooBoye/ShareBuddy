/**
 * SearchFilters Component - Bộ lọc tìm kiếm nâng cao
 * Features: Category, subject, rating, credit cost filters
 */

import React, { useState, useEffect } from 'react';
import { Row, Col, Form, Button, Badge } from 'react-bootstrap';
import { DocumentSearchParams } from '../../types';
import { documentService } from '../../services/documentService';

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
  const [categories, setCategories] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load categories and subjects
  useEffect(() => {
    const loadData = async () => {
      try {
        const categoriesResponse = await documentService.getCategories();
        setCategories(categoriesResponse.data || []);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    
    loadData();
  }, []);

  // Load subjects when category changes
  useEffect(() => {
    if (filters.category) {
      const loadSubjects = async () => {
        try {
          const subjectsResponse = await documentService.getSubjectsByCategory(filters.category!);
          setSubjects(subjectsResponse.data || []);
        } catch (error) {
          console.error('Failed to load subjects:', error);
        }
      };
      
      loadSubjects();
    } else {
      setSubjects([]);
    }
  }, [filters.category]);

  const handleFilterChange = (key: keyof DocumentSearchParams, value: any) => {
    const newFilters = { ...filters, [key]: value };
    
    // Reset subject when category changes
    if (key === 'category') {
      newFilters.subject = undefined;
    }
    
    setFilters(newFilters);
    onFilterChange(newFilters);
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
    return !!(filters.category || filters.subject || filters.minRating || filters.maxCreditCost || filters.tags?.length);
  };

  return (
    <div className="search-filters">
      <Row className="align-items-end">
        {/* Search Input */}
        <Col md={compact ? 12 : 4} className="mb-3">
          <Form.Label>Tìm kiếm</Form.Label>
          <Form.Control
            type="text"
            placeholder="Tìm tài liệu..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </Col>

        {/* Category Filter */}
        <Col md={compact ? 6 : 3} className="mb-3">
          <Form.Label>Danh mục</Form.Label>
          <Form.Select
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Form.Select>
        </Col>

        {/* Subject Filter */}
        <Col md={compact ? 6 : 3} className="mb-3">
          <Form.Label>Môn học</Form.Label>
          <Form.Select
            value={filters.subject || ''}
            onChange={(e) => handleFilterChange('subject', e.target.value || undefined)}
            disabled={!filters.category}
          >
            <option value="">Tất cả môn học</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </Form.Select>
        </Col>

        {/* Action Buttons */}
        <Col md={compact ? 12 : 2} className="mb-3">
          <div className="d-flex gap-2">
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
              
              {filters.category && (
                <Badge bg="primary" className="me-1 mb-1">
                  Danh mục: {filters.category}
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 ms-1 text-white"
                    onClick={() => handleFilterChange('category', undefined)}
                  >
                    <i className="bi bi-x" />
                  </Button>
                </Badge>
              )}
              
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
/**
 * Advanced Search Page - Full-text search with filters
 */

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Form, 
  Row, 
  Col, 
  Card, 
  Button, 
  Badge, 
  Spinner,
  InputGroup,
  Accordion 
} from 'react-bootstrap';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { FiSearch, FiFilter, FiStar, FiDownload, FiUser } from 'react-icons/fi';

interface SearchResult {
  document_id: string;
  title: string;
  description: string;
  category: string;
  subject: string;
  university: string;
  file_type: string;
  credit_cost: number;
  average_rating: number;
  download_count: number;
  author_username: string;
  is_author_verified: boolean;
  created_at: string;
  relevance?: number;
}

interface SearchFilters {
  category?: string;
  subject?: string;
  university?: string;
  minRating?: number;
  maxCost?: number;
  fileType?: string;
  verifiedOnly?: boolean;
  sortBy?: 'relevance' | 'newest' | 'popular' | 'rating';
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance'
  });
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    if (queryParam) {
      performSearch(queryParam);
    }
  }, [queryParam]);

  useEffect(() => {
    if (query.length >= 2) {
      fetchSuggestions(query);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const fetchSuggestions = async (searchQuery: string) => {
    try {
      const response = await axios.get('/api/search/suggestions', {
        params: { q: searchQuery }
      });
      setSuggestions(response.data.data.suggestions);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await axios.get('/api/search/documents', {
        params: {
          q: searchQuery,
          ...filters,
          page: 1,
          limit: 20
        }
      });

      setResults(response.data.data.documents);
      setTotalResults(response.data.data.pagination.total);
      setLoading(false);
    } catch (err: any) {
      console.error('Search failed:', err);
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
      performSearch(query);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setSearchParams({ q: suggestion });
    performSearch(suggestion);
    setSuggestions([]);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (query) {
      performSearch(query);
    }
  };

  const clearFilters = () => {
    setFilters({ sortBy: 'relevance' });
    if (query) {
      performSearch(query);
    }
  };

  return (
    <Container className="py-4" style={{ marginTop: '80px', maxWidth: '1200px' }}>
      {/* Search Bar */}
      <Row className="mb-4">
        <Col>
          <Form onSubmit={handleSearch}>
            <InputGroup size="lg">
              <Form.Control
                type="text"
                placeholder="Search documents, courses, topics..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <Button type="submit" variant="primary">
                <FiSearch /> Search
              </Button>
              <Button 
                variant="outline-secondary"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FiFilter /> Filters
              </Button>
            </InputGroup>
          </Form>

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <Card className="position-absolute w-100 mt-1" style={{ zIndex: 1000 }}>
              <Card.Body className="p-0">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-2 border-bottom cursor-pointer hover-bg-light"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <FiSearch className="me-2 text-muted" />
                    {suggestion}
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-4">
          <Card.Body>
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Sort By</Form.Label>
                  <Form.Select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  >
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                    <option value="popular">Most Popular</option>
                    <option value="rating">Highest Rated</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select
                    value={filters.category || ''}
                    onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                  >
                    <option value="">All Categories</option>
                    <option value="Lecture Notes">Lecture Notes</option>
                    <option value="Assignments">Assignments</option>
                    <option value="Exams">Exams</option>
                    <option value="Projects">Projects</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>File Type</Form.Label>
                  <Form.Select
                    value={filters.fileType || ''}
                    onChange={(e) => handleFilterChange('fileType', e.target.value || undefined)}
                  >
                    <option value="">All Types</option>
                    <option value="pdf">PDF</option>
                    <option value="docx">Word</option>
                    <option value="pptx">PowerPoint</option>
                    <option value="xlsx">Excel</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Cost (credits)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    placeholder="Any"
                    value={filters.maxCost || ''}
                    onChange={(e) => handleFilterChange('maxCost', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Min Rating</Form.Label>
                  <Form.Select
                    value={filters.minRating || ''}
                    onChange={(e) => handleFilterChange('minRating', e.target.value ? parseFloat(e.target.value) : undefined)}
                  >
                    <option value="">Any</option>
                    <option value="4">4+ Stars</option>
                    <option value="3">3+ Stars</option>
                    <option value="2">2+ Stars</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Verified Authors Only"
                    checked={filters.verifiedOnly || false}
                    onChange={(e) => handleFilterChange('verifiedOnly', e.target.checked)}
                    className="mt-4"
                  />
                </Form.Group>
              </Col>

              <Col md={6} className="text-end">
                <Button 
                  variant="outline-secondary" 
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Searching...</p>
        </div>
      ) : (
        <>
          {query && (
            <p className="text-muted mb-4">
              Found <strong>{totalResults}</strong> results for "<strong>{query}</strong>"
            </p>
          )}

          {results.length === 0 && query ? (
            <Card className="text-center py-5">
              <Card.Body>
                <h5>No results found</h5>
                <p className="text-muted">Try different keywords or adjust your filters</p>
              </Card.Body>
            </Card>
          ) : (
            <Row>
              {results.map((doc) => (
                <Col md={12} key={doc.document_id} className="mb-3">
                  <Card>
                    <Card.Body>
                      <Row>
                        <Col md={9}>
                          <div className="d-flex align-items-start">
                            <div>
                              <Link 
                                to={`/documents/${doc.document_id}`}
                                className="text-decoration-none"
                              >
                                <h5 className="mb-2">{doc.title}</h5>
                              </Link>
                              <p className="text-muted mb-2">{doc.description}</p>
                              <div className="d-flex gap-2 flex-wrap">
                                <Badge bg="secondary">{doc.category}</Badge>
                                <Badge bg="info">{doc.subject}</Badge>
                                <Badge bg="light" text="dark">{doc.university}</Badge>
                                <Badge bg="primary">{doc.file_type.toUpperCase()}</Badge>
                              </div>
                            </div>
                          </div>
                        </Col>
                        <Col md={3} className="text-end">
                          <div className="mb-2">
                            <FiUser className="me-1" />
                            <Link to={`/profile/${doc.author_username}`}>
                              {doc.author_username}
                            </Link>
                            {doc.is_author_verified && (
                              <Badge bg="success" className="ms-1">✓</Badge>
                            )}
                          </div>
                          <div className="text-warning mb-2">
                            <FiStar className="me-1" />
                            {doc.average_rating?.toFixed(1) || 'N/A'}
                          </div>
                          <div className="text-muted mb-2">
                            <FiDownload className="me-1" />
                            {doc.download_count} downloads
                          </div>
                          {doc.credit_cost > 0 ? (
                            <Badge bg="warning" text="dark">
                              {doc.credit_cost} credits
                            </Badge>
                          ) : (
                            <Badge bg="success">Free</Badge>
                          )}
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </>
      )}
    </Container>
  );
};

export default SearchPage;

import React, { useState, useEffect } from 'react';
import './App.css';
import DiffViewer from './DiffViewer';

function App() {
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalCount: 0, repositories: 0, teamMembers: 0 });
  const [lastRefresh, setLastRefresh] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [compactMode, setCompactMode] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('compactMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'draft', 'ready'
    repositories: [], // Array of selected repositories
    authors: [], // Array of selected authors
    targetBranches: [] // Array of selected target branches
  });
  
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  
  // Diff viewer state
  const [selectedPRForDiff, setSelectedPRForDiff] = useState(null);

  const fetchPRs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://wsap1580:3001/api/prs');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch PRs');
      }
      
      const data = await response.json();
      setPrs(data.prs);
      setStats({
        totalCount: data.totalCount,
        repositories: data.repositories,
        teamMembers: data.teamMembers
      });
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPRs();
  }, []);

  useEffect(() => {
    // Save dark mode preference and apply to document
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [darkMode]);

  useEffect(() => {
    // Save compact mode preference
    localStorage.setItem('compactMode', JSON.stringify(compactMode));
  }, [compactMode]);

  useEffect(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.multi-select-wrapper')) {
        setShowRepoDropdown(false);
        setShowAuthorDropdown(false);
        setShowBranchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleCompactMode = () => {
    setCompactMode(!compactMode);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get unique repositories, authors, and target branches from PRs
  const uniqueRepositories = [...new Set(prs.map(pr => pr.repository))].sort();
  const uniqueAuthors = [...new Set(prs.map(pr => pr.author))].sort();
  const uniqueTargetBranches = [...new Set(prs.map(pr => pr.targetBranch))].sort();

  // Filter PRs based on selected filters
  const filteredPRs = prs.filter(pr => {
    // Status filter
    if (filters.status === 'draft' && !pr.draft) return false;
    if (filters.status === 'ready' && pr.draft) return false;

    // Repository filter (multiple selection)
    if (filters.repositories.length > 0 && !filters.repositories.includes(pr.repository)) return false;

    // Author filter (multiple selection)
    if (filters.authors.length > 0 && !filters.authors.includes(pr.author)) return false;

    // Target branch filter (multiple selection)
    if (filters.targetBranches.length > 0 && !filters.targetBranches.includes(pr.targetBranch)) return false;

    return true;
  });

  const handleStatusChange = (value) => {
    setFilters(prev => ({
      ...prev,
      status: value
    }));
  };

  const handleRepoToggle = (repo) => {
    setFilters(prev => ({
      ...prev,
      repositories: prev.repositories.includes(repo)
        ? prev.repositories.filter(r => r !== repo)
        : [...prev.repositories, repo]
    }));
  };

  const handleAuthorToggle = (author) => {
    setFilters(prev => ({
      ...prev,
      authors: prev.authors.includes(author)
        ? prev.authors.filter(a => a !== author)
        : [...prev.authors, author]
    }));
  };

  const handleBranchToggle = (branch) => {
    setFilters(prev => ({
      ...prev,
      targetBranches: prev.targetBranches.includes(branch)
        ? prev.targetBranches.filter(b => b !== branch)
        : [...prev.targetBranches, branch]
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      repositories: [],
      authors: [],
      targetBranches: []
    });
  };

  const hasActiveFilters = filters.status !== 'all' || filters.repositories.length > 0 || filters.authors.length > 0 || filters.targetBranches.length > 0;

  const openDiffViewer = (pr) => {
    setSelectedPRForDiff(pr);
  };

  const closeDiffViewer = () => {
    setSelectedPRForDiff(null);
  };

  return (
    <div className="App">
      <header className="header compact">
        <div className="header-content">
          <h1>Platform Dev PRs</h1>
          <div className="header-actions">
            <button onClick={toggleCompactMode} className="compact-mode-toggle" title="Toggle compact mode">
              {compactMode ? '☰' : '▤'}
            </button>
            <button onClick={toggleDarkMode} className="dark-mode-toggle" title="Toggle dark mode">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={fetchPRs} className="refresh-btn" disabled={loading}>
              {loading ? '⟳' : '↻'}
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-layout">
        {/* Filters Sidebar */}
        <aside className="filters-sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Filters</h3>
            
            <div className="filter-group-vertical">
              <label htmlFor="status-filter">Status</label>
              <select 
                id="status-filter"
                value={filters.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="filter-select"
              >
                <option value="all">All ({prs.length})</option>
                <option value="ready">Ready ({prs.filter(pr => !pr.draft).length})</option>
                <option value="draft">Draft ({prs.filter(pr => pr.draft).length})</option>
              </select>
            </div>

            <div className="filter-group-vertical">
              <label>Repositories</label>
              <div className="multi-select-wrapper">
                <button 
                  className="multi-select-button"
                  onClick={() => setShowRepoDropdown(!showRepoDropdown)}
                  type="button"
                >
                  {filters.repositories.length === 0 
                    ? 'All' 
                    : `${filters.repositories.length} selected`}
                  <span className="dropdown-arrow">{showRepoDropdown ? '▲' : '▼'}</span>
                </button>
                {showRepoDropdown && (
                  <div className="multi-select-dropdown">
                    {uniqueRepositories.map(repo => (
                      <label key={repo} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={filters.repositories.includes(repo)}
                          onChange={() => handleRepoToggle(repo)}
                        />
                        <span className="checkbox-text">
                          {repo.split('/')[1] || repo}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="filter-group-vertical">
              <label>Authors</label>
              <div className="multi-select-wrapper">
                <button 
                  className="multi-select-button"
                  onClick={() => setShowAuthorDropdown(!showAuthorDropdown)}
                  type="button"
                >
                  {filters.authors.length === 0 
                    ? 'All' 
                    : `${filters.authors.length} selected`}
                  <span className="dropdown-arrow">{showAuthorDropdown ? '▲' : '▼'}</span>
                </button>
                {showAuthorDropdown && (
                  <div className="multi-select-dropdown">
                    {uniqueAuthors.map(author => (
                      <label key={author} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={filters.authors.includes(author)}
                          onChange={() => handleAuthorToggle(author)}
                        />
                        <span className="checkbox-text">
                          @{author}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="filter-group-vertical">
              <label>Target Branch</label>
              <div className="multi-select-wrapper">
                <button 
                  className="multi-select-button"
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                  type="button"
                >
                  {filters.targetBranches.length === 0 
                    ? 'All' 
                    : `${filters.targetBranches.length} selected`}
                  <span className="dropdown-arrow">{showBranchDropdown ? '▲' : '▼'}</span>
                </button>
                {showBranchDropdown && (
                  <div className="multi-select-dropdown">
                    {uniqueTargetBranches.map(branch => (
                      <label key={branch} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={filters.targetBranches.includes(branch)}
                          onChange={() => handleBranchToggle(branch)}
                        />
                        <span className="checkbox-text">
                          {branch}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="clear-filters-btn-sidebar">
                Clear Filters
              </button>
            )}
          </div>

          <div className="sidebar-stats">
            <div className="stat-item">
              <span className="stat-value">{filteredPRs.length}</span>
              <span className="stat-label">Showing</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{prs.length}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
            <p className="error-hint">
              Make sure your .env file is configured with GITHUB_TOKEN, REPOSITORIES, and TEAM_MEMBERS.
            </p>
          </div>
        )}

        {loading && !error && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading pull requests...</p>
          </div>
        )}

        {!loading && !error && prs.length === 0 && (
          <div className="empty-state">
            <h2>No Pull Requests Found</h2>
            <p>There are no open PRs from your team members in the configured repositories.</p>
          </div>
        )}

        {!loading && !error && prs.length > 0 && (
          <>
            {filteredPRs.length === 0 ? (
              <div className="empty-state">
                <h2>No PRs Match Your Filters</h2>
                <p>Try adjusting your filters to see more results.</p>
                <button onClick={clearFilters} className="clear-filters-btn-large">
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className={`pr-list ${compactMode ? 'compact' : ''}`}>
                {filteredPRs.map(pr => (
                  <div key={pr.id} className={`pr-card ${compactMode ? 'compact' : ''} ${pr.draft ? 'draft' : 'ready'}`}>
                    {compactMode ? (
                      // Compact Mode Layout
                      <div className="pr-compact-content">
                        <div className="pr-compact-left">
                          <a 
                            href={pr.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="pr-compact-title"
                          >
                            {pr.title}
                          </a>
                          <div className="pr-compact-meta">
                            <span className="pr-author">@{pr.author}</span>
                            <button 
                              className="view-diff-btn compact"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDiffViewer(pr);
                              }}
                              title="View diff"
                            >
                              📄 Diff
                            </button>
                          </div>
                        </div>
                        <div className="pr-compact-right">
                          <span className="pr-repo-right">{pr.repository}</span>
                          <span className="pr-branch-right">→ {pr.targetBranch}</span>
                        </div>
                      </div>
                    ) : (
                      // Full Mode Layout
                      <div className="pr-header">
                        <img 
                          src={pr.authorAvatar} 
                          alt={pr.author} 
                          className="author-avatar"
                        />
                        <div className="pr-info">
                          <a 
                            href={pr.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="pr-title"
                          >
                            {pr.title}
                          </a>
                          <div className="pr-meta">
                            <span className="pr-author">@{pr.author}</span>
                            <span className="pr-separator">•</span>
                            <span className="pr-number">#{pr.number}</span>
                          </div>
                          <div className="pr-time">
                            Updated {formatDate(pr.updatedAt)}
                          </div>
                          
                          {/* Reviewers Section */}
                          {(pr.requestedReviewers?.length > 0 || pr.requestedTeams?.length > 0) && (
                            <div className="pr-reviewers">
                              <span className="reviewers-label">Required Reviewers:</span>
                              <div className="reviewers-list">
                                {pr.requestedReviewers?.map(reviewer => (
                                  <div key={reviewer.login} className="reviewer" title={`@${reviewer.login}`}>
                                    <img 
                                      src={reviewer.avatar} 
                                      alt={reviewer.login}
                                      className="reviewer-avatar"
                                    />
                                    <span className="reviewer-name">@{reviewer.login}</span>
                                  </div>
                                ))}
                                {pr.requestedTeams?.map(team => (
                                  <div key={team.slug} className="reviewer team" title={team.name}>
                                    <span className="team-icon">👥</span>
                                    <span className="reviewer-name">{team.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="pr-meta-right">
                          <div className="pr-actions">
                            <button 
                              className="view-diff-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDiffViewer(pr);
                              }}
                              title="View diff"
                            >
                              📄 View Diff
                            </button>
                          </div>
                          <span className="pr-repo-right">{pr.repository}</span>
                          <span className="pr-branch-right">→ {pr.targetBranch}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      </div>
      
      {/* Diff Viewer Modal */}
      {selectedPRForDiff && (
        <DiffViewer
          owner={selectedPRForDiff.repository.split('/')[0]}
          repo={selectedPRForDiff.repository.split('/')[1]}
          prNumber={selectedPRForDiff.number}
          onClose={closeDiffViewer}
        />
      )}
    </div>
  );
}

export default App;

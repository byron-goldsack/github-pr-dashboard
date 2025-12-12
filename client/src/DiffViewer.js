import React, { useState, useEffect, useRef } from 'react';
import FileDiff from './FileDiff';
import { getStatusIcon, getStatusClass } from './diffUtils';
import refractor from 'refractor/core';
import csharp from 'refractor/lang/csharp';
import javascript from 'refractor/lang/javascript';
import typescript from 'refractor/lang/typescript';
import jsx from 'refractor/lang/jsx';
import tsx from 'refractor/lang/tsx';
import python from 'refractor/lang/python';
import java from 'refractor/lang/java';
import css from 'refractor/lang/css';
import json from 'refractor/lang/json';
import markdown from 'refractor/lang/markdown';
import sql from 'refractor/lang/sql';
import 'react-diff-view/style/index.css';
import './DiffViewer.css';

// Register C# first (most important!)
refractor.register(csharp);

// Register other common languages
refractor.register(javascript);
refractor.register(typescript);
refractor.register(jsx);
refractor.register(tsx);
refractor.register(python);
refractor.register(java);
refractor.register(css);
refractor.register(json);
refractor.register(markdown);
refractor.register(sql);

// Create aliases for C#
refractor.alias('csharp', ['cs', 'dotnet']);

// Log supported languages
const ensureLanguageSupport = () => {
  const supportedLanguages = refractor.listLanguages();
  console.log('Refractor v3 registered languages:', supportedLanguages.join(', '));
};

const DiffViewer = ({ owner, repo, prNumber, onClose }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [viewType, setViewType] = useState('split'); // 'split' or 'unified'
  const [showFileTree, setShowFileTree] = useState(true);
  const [expandedDirs, setExpandedDirs] = useState(new Set());
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const ghostRef = useRef(null);
  
  // Log supported languages on mount
  useEffect(() => {
    ensureLanguageSupport();
  }, []);

  // Handle sidebar resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing && ghostRef.current) {
        // Just update the ghost element position, don't update state
        let newWidth = e.clientX;
        if (newWidth < 200) newWidth = 200;
        if (newWidth > 600) newWidth = 600;
        
        ghostRef.current.style.left = `${newWidth}px`;
      }
    };

    const handleMouseUp = (e) => {
      if (isResizing) {
        setIsResizing(false);
        // Only update the actual sidebar width on mouse release
        let newWidth = e.clientX;
        if (newWidth < 200) newWidth = 200;
        if (newWidth > 600) newWidth = 600;
        setSidebarWidth(newWidth);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const fetchDiff = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Fetching diff for PR #${prNumber}...`);
        const response = await fetch(`/api/prs/${owner}/${repo}/${prNumber}/files`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch diff');
        }
        
        const data = await response.json();
        console.log(`Loaded ${data.files.length} files`);
        setFiles(data.files);
        
        // Auto-expand files with small changes (< 500 lines changed)
        // But limit auto-expansion to first 20 files if there are many files
        const autoExpand = new Set();
        const maxAutoExpand = data.files.length > 50 ? 10 : 20;
        let expandedCount = 0;
        
        data.files.forEach((file, index) => {
          if (file.changes < 500 && expandedCount < maxAutoExpand) {
            autoExpand.add(index);
            expandedCount++;
          }
        });
        setExpandedFiles(autoExpand);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDiff();
  }, [owner, repo, prNumber]);

  const toggleFile = (index) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedFiles(new Set(files.map((_, index) => index)));
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
  };

  const scrollToFile = (index) => {
    const fileElement = document.getElementById(`file-${index}`);
    if (fileElement) {
      fileElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Expand the file if it's not already expanded
      if (!expandedFiles.has(index)) {
        toggleFile(index);
      }
    }
  };

  // Build a tree structure from flat file list
  const buildFileTree = (files) => {
    const root = { name: '', children: {}, files: [] };
    
    files.forEach((file, index) => {
      const parts = file.filename.split('/');
      let current = root;
      
      // Navigate/create directory structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current.children[part]) {
          current.children[part] = { name: part, children: {}, files: [] };
        }
        current = current.children[part];
      }
      
      // Add file to the current directory
      current.files.push({ ...file, index });
    });
    
    return root;
  };

  const toggleDir = (path) => {
    setExpandedDirs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const expandAllDirs = () => {
    const allPaths = new Set();
    const collectPaths = (node, currentPath = '') => {
      Object.keys(node.children).forEach(key => {
        const path = currentPath ? `${currentPath}/${key}` : key;
        allPaths.add(path);
        collectPaths(node.children[key], path);
      });
    };
    collectPaths(buildFileTree(files));
    setExpandedDirs(allPaths);
  };

  const collapseAllDirs = () => {
    setExpandedDirs(new Set());
  };

  // Render a directory tree node
  const renderTreeNode = (node, path = '', depth = 0) => {
    const isExpanded = expandedDirs.has(path);
    const hasChildren = Object.keys(node.children).length > 0;
    
    return (
      <div key={path || 'root'}>
        {/* Render directories */}
        {Object.keys(node.children).sort().map(key => {
          const childPath = path ? `${path}/${key}` : key;
          const child = node.children[key];
          const childExpanded = expandedDirs.has(childPath);
          const fileCount = countFiles(child);
          
          return (
            <div key={childPath}>
              <div
                className="file-tree-directory"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => toggleDir(childPath)}
              >
                <span className="dir-icon">{childExpanded ? '📂' : '📁'}</span>
                <span className="dir-name">{key}</span>
                <span className="dir-file-count">({fileCount})</span>
              </div>
              {childExpanded && renderTreeNode(child, childPath, depth + 1)}
            </div>
          );
        })}
        
        {/* Render files in this directory */}
        {node.files.sort((a, b) => a.filename.localeCompare(b.filename)).map(file => (
          <div
            key={file.index}
            className={`file-tree-item ${getStatusClass(file.status)}`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => scrollToFile(file.index)}
          >
            <div className="file-tree-item-content">
              {getStatusIcon(file.status)}
              <span className="file-tree-filename" title={file.filename}>
                {file.filename.split('/').pop()}
              </span>
            </div>
            <div className="file-tree-stats">
              <span className="tree-additions">+{file.additions}</span>
              <span className="tree-deletions">−{file.deletions}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Count total files in a tree node
  const countFiles = (node) => {
    let count = node.files.length;
    Object.values(node.children).forEach(child => {
      count += countFiles(child);
    });
    return count;
  };


  if (loading) {
    return (
      <div className="diff-viewer-fullpage">
        <div className="diff-viewer-container">
          <div className="diff-viewer-header">
            <h2>Loading Diff...</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="diff-viewer-loading">
            <div className="spinner"></div>
            <p>Loading all changes from PR #{prNumber}...</p>
            <p className="loading-hint">This may take a moment for large PRs</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diff-viewer-fullpage">
        <div className="diff-viewer-container">
          <div className="diff-viewer-header">
            <h2>Error Loading Diff</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="diff-viewer-error">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="diff-viewer-fullpage">
      <div className="diff-viewer-container">
        <div className="diff-viewer-header">
          <div className="header-left">
            <h2>Pull Request #{prNumber} - {files.length} File{files.length !== 1 ? 's' : ''} Changed</h2>
            <div className="diff-stats">
              <span className="stat-additions">+{files.reduce((sum, f) => sum + f.additions, 0)}</span>
              {' '}
              <span className="stat-deletions">−{files.reduce((sum, f) => sum + f.deletions, 0)}</span>
              {' '}
              <span className="stat-total">({files.reduce((sum, f) => sum + f.additions + f.deletions, 0)} lines)</span>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="expand-button" 
              onClick={() => setShowFileTree(!showFileTree)}
              title={showFileTree ? "Hide file tree" : "Show file tree"}
            >
              {showFileTree ? '◧' : '☰'} Files
            </button>
            <div className="view-type-toggle">
              <button 
                className={viewType === 'split' ? 'active' : ''}
                onClick={() => setViewType('split')}
                title="Split view"
              >
                Split
              </button>
              <button 
                className={viewType === 'unified' ? 'active' : ''}
                onClick={() => setViewType('unified')}
                title="Unified view"
              >
                Unified
              </button>
            </div>
            <button className="expand-button" onClick={expandAll}>Expand All</button>
            <button className="expand-button" onClick={collapseAll}>Collapse All</button>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="diff-viewer-content">
          {showFileTree && (
            <>
              <div className="file-tree-sidebar" style={{ width: `${sidebarWidth}px` }}>
                <div className="file-tree-header">
                  <span>Files Changed ({files.length})</span>
                  <div className="tree-header-actions">
                    <button 
                      className="tree-action-btn" 
                      onClick={expandAllDirs}
                      title="Expand all directories"
                    >
                      ⊞
                    </button>
                    <button 
                      className="tree-action-btn" 
                      onClick={collapseAllDirs}
                      title="Collapse all directories"
                    >
                      ⊟
                    </button>
                  </div>
                </div>
                <div className="file-tree-list">
                  {renderTreeNode(buildFileTree(files))}
                </div>
              </div>
              <div 
                className="resize-handle"
                onMouseDown={startResizing}
                title="Drag to resize"
              />
              {isResizing && (
                <div 
                  ref={ghostRef} 
                  className="resize-ghost" 
                  style={{ left: `${sidebarWidth}px` }} 
                />
              )}
            </>
          )}
          <div className="files-list">
            {files.map((file, index) => (
              <FileDiff
                key={index}
                file={file}
                index={index}
                isExpanded={expandedFiles.has(index)}
                onToggle={toggleFile}
                viewType={viewType}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;


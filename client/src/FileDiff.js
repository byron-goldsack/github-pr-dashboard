import React, { useMemo, useState, useEffect } from 'react';
import { parseDiff, Diff, Hunk, tokenize } from 'react-diff-view';
import refractor from 'refractor/core';
import { getLanguageFromFilename, getStatusIcon, getStatusClass } from './diffUtils';

const FileDiff = ({ file, index, isExpanded, onToggle, viewType }) => {
  const [tokens, setTokens] = useState(null);
  
  // Memoize the parsed diff - this is relatively fast and can be done synchronously
  const parsedDiff = useMemo(() => {
    if (!file.patch || !isExpanded) {
      return null;
    }

    try {
      const diffText = `diff --git a/${file.filename} b/${file.filename}
--- a/${file.previousFilename || file.filename}
+++ b/${file.filename}
${file.patch}`;
      
      const [diff] = parseDiff(diffText, { nearbySequences: 'zip' });
      return diff;
    } catch (e) {
      console.error('Error parsing diff for', file.filename, e);
      return null;
    }
  }, [file.patch, file.filename, file.previousFilename, isExpanded]);

  // Defer tokenization to avoid blocking the main thread when expanding many files
  useEffect(() => {
    if (!parsedDiff) {
      setTokens(null);
      return;
    }

    // Cancel any pending tokenization if inputs change
    let isCancelled = false;

    // Use setTimeout to yield to the main thread (macro-task)
    // This allows the UI to update with the "Loading..." or unhighlighted state first
    const timerId = setTimeout(() => {
      if (isCancelled) return;
      
      try {
        const language = getLanguageFromFilename(file.filename);
        let diffTokens = null;

        if (language !== 'text' && refractor.registered(language)) {
          diffTokens = tokenize(parsedDiff.hunks || [], {
            highlight: true,
            refractor,
            language
          });
        } else {
          diffTokens = tokenize(parsedDiff.hunks || [], { highlight: false });
        }
        
        if (!isCancelled) {
          setTokens(diffTokens);
        }
      } catch (e) {
        console.error(`❌ Syntax highlighting failed for ${file.filename}:`, e);
        if (!isCancelled) {
          setTokens(tokenize(parsedDiff.hunks || [], { highlight: false }));
        }
      }
    }, 10); // Small delay to allow UI to breathe

    return () => {
      isCancelled = true;
      clearTimeout(timerId);
    };
  }, [parsedDiff, file.filename]);

  return (
    <div id={`file-${index}`} className={`file-diff ${getStatusClass(file.status)}`}>
      <div 
        className="file-header" 
        onClick={() => onToggle(index)}
      >
        <div className="file-header-left">
          {getStatusIcon(file.status)}
          <span className="filename">{file.filename}</span>
          {file.previousFilename && file.previousFilename !== file.filename && (
            <span className="previous-filename">
              {file.previousFilename} → {file.filename}
            </span>
          )}
        </div>
        <div className="file-header-right">
          <span className="file-stats">
            <span className="additions">+{file.additions}</span>
            <span className="deletions">−{file.deletions}</span>
          </span>
          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="file-content">
          {!file.patch ? (
            <div className="no-diff">
              {file.status === 'added' && 'File added (binary or too large to display)'}
              {file.status === 'removed' && 'File removed (binary or too large to display)'}
              {file.status === 'renamed' && 'File renamed'}
              {!['added', 'removed', 'renamed'].includes(file.status) && 'No diff available'}
            </div>
          ) : parsedDiff ? (
            <Diff 
              viewType={viewType}
              diffType={parsedDiff.type}
              hunks={parsedDiff.hunks || []}
              tokens={tokens}
            >
              {(hunks) => hunks.map(hunk => (
                <Hunk key={hunk.content} hunk={hunk} />
              ))}
            </Diff>
          ) : (
            <div className="diff-error">
              <pre className="raw-patch">{file.patch}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(FileDiff);

import React from 'react';

export const getLanguageFromFilename = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  const languageMap = {
    // C# is the most important!
    'cs': 'csharp',
    'csx': 'csharp',
    // JavaScript/TypeScript
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'mjs': 'javascript',
    'cjs': 'javascript',
    // Other languages
    'py': 'python',
    'java': 'java',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'json': 'json',
    'yml': 'yaml',
    'yaml': 'yaml',
    'md': 'markdown',
    'markdown': 'markdown',
    'sql': 'sql',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'sh': 'bash',
    'bash': 'bash',
    'xml': 'xml',
    'html': 'markup',
    'htm': 'markup',
    'vue': 'markup',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'aspx': 'markup',
    'razor': 'csharp'
  };
  const language = languageMap[ext] || 'text';
  
  // Log C# file detection for debugging
  if (language === 'csharp') {
    console.log(`Detected C# file: ${filename}`);
  }
  
  return language;
};

export const getStatusIcon = (status) => {
  switch (status) {
    case 'added': return <span className="status-icon added">+</span>;
    case 'removed': return <span className="status-icon removed">−</span>;
    case 'modified': return <span className="status-icon modified">~</span>;
    case 'renamed': return <span className="status-icon renamed">→</span>;
    default: return null;
  }
};

export const getStatusClass = (status) => {
  return `file-status-${status}`;
};


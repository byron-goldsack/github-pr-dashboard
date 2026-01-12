const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Parse configuration from environment variables
const getConfig = () => {
  const repositories = process.env.REPOSITORIES 
    ? process.env.REPOSITORIES.split(',').map(r => r.trim())
    : [];
  
  const teamMembers = process.env.TEAM_MEMBERS
    ? process.env.TEAM_MEMBERS.split(',').map(m => m.trim())
    : [];
  
  const token = process.env.GITHUB_TOKEN;

  return { repositories, teamMembers, token };
};

// Extract work item IDs from PR description
const extractWorkItemIds = (text) => {
  if (!text) return [];
  
  // Match #XXXXXX pattern (hash followed by 6 digits)
  const regex = /#(\d{6})/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  
  // Return unique IDs, limited to first 3
  return [...new Set(matches)].slice(0, 3);
};

// Fetch TFS work item title using PowerShell with Windows integrated authentication
const fetchTfsWorkItem = async (workItemId) => {
  const serverBase = "https://tfs.aderant.com/tfs/ADERANT";
  const apiUrl = `${serverBase}/_apis/wit/workitems/${workItemId}?api-version=1.0`;
  
  // Simple PowerShell command - just get the title field directly
  const psCommand = `(Invoke-RestMethod -Uri '${apiUrl}' -UseDefaultCredentials).fields.'System.Title'`;
  
  try {
    const { stdout, stderr } = await execAsync(`powershell -NoProfile -Command "${psCommand}"`, {
      timeout: 10000 // 10 second timeout
    });
    
    const title = stdout.trim();
    
    if (title) {
      return {
        id: workItemId,
        title: title,
        url: `${serverBase}/_workitems/edit/${workItemId}`
      };
    }
    
    console.error(`No title returned for TFS work item ${workItemId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching TFS work item ${workItemId}:`, error.message);
    return null;
  }
};

// Fetch PRs from a single repository
const fetchRepoPRs = async (repo, token) => {
  const [owner, repoName] = repo.split('/');
  const url = `https://api.github.com/repos/${owner}/${repoName}/pulls?state=open`;
  
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-PR-Dashboard'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.error(`Error fetching PRs from ${repo}: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const prs = await response.json();
    
    // Process each PR and fetch work items
    const processedPRs = await Promise.all(prs.map(async pr => {
      // Extract requested reviewers (individual users)
      const requestedReviewers = pr.requested_reviewers 
        ? pr.requested_reviewers.map(reviewer => ({
            login: reviewer.login,
            avatar: reviewer.avatar_url
          }))
        : [];
      
      // Extract requested teams
      const requestedTeams = pr.requested_teams 
        ? pr.requested_teams.map(team => ({
            name: team.name,
            slug: team.slug
          }))
        : [];

      // Extract work item IDs from PR body
      const workItemIds = extractWorkItemIds(pr.body);
      
      // Fetch work item details from TFS
      const workItems = await Promise.all(
        workItemIds.map(id => fetchTfsWorkItem(id))
      );
      
      // Filter out any failed fetches
      const validWorkItems = workItems.filter(item => item !== null);

      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: pr.body || '',
        author: pr.user.login,
        authorAvatar: pr.user.avatar_url,
        repository: repo,
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        state: pr.state,
        draft: pr.draft,
        targetBranch: pr.base.ref,
        sourceBranch: pr.head.ref,
        requestedReviewers,
        requestedTeams,
        workItems: validWorkItems
      };
    }));
    
    return processedPRs;
  } catch (error) {
    console.error(`Error fetching PRs from ${repo}:`, error.message);
    return [];
  }
};

// API endpoint to get all PRs
app.get('/api/prs', async (req, res) => {
  try {
    const { repositories, teamMembers, token } = getConfig();

    if (!token) {
      return res.status(500).json({ 
        error: 'GitHub token not configured. Please set GITHUB_TOKEN in .env file.' 
      });
    }

    if (repositories.length === 0) {
      return res.status(500).json({ 
        error: 'No repositories configured. Please set REPOSITORIES in .env file.' 
      });
    }

    // Fetch PRs from all repositories in parallel
    const allPRsArrays = await Promise.all(
      repositories.map(repo => fetchRepoPRs(repo, token))
    );

    // Flatten the array of arrays
    let allPRs = allPRsArrays.flat();

    // Filter by team members if configured
    if (teamMembers.length > 0) {
      allPRs = allPRs.filter(pr => teamMembers.includes(pr.author));
    }

    // Sort by updated date (most recent first)
    allPRs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({
      prs: allPRs,
      totalCount: allPRs.length,
      repositories: repositories.length,
      teamMembers: teamMembers.length
    });
  } catch (error) {
    console.error('Error in /api/prs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get PR diff/files
app.get('/api/prs/:owner/:repo/:prNumber/files', async (req, res) => {
  try {
    const { owner, repo, prNumber } = req.params;
    const { token } = getConfig();

    if (!token) {
      return res.status(500).json({ 
        error: 'GitHub token not configured. Please set GITHUB_TOKEN in .env file.' 
      });
    }

    // Use GitHub API (always uses Myers algorithm)
    const allFiles = [];
    let page = 1;
    const perPage = 100; // Maximum allowed by GitHub API
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitHub-PR-Dashboard',
      'Authorization': `token ${token}`
    };

    // Keep fetching until we get all files
    while (true) {
      const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=${perPage}&page=${page}`;
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        console.error(`Error fetching PR files: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          error: `Failed to fetch PR files: ${response.statusText}` 
        });
      }
      
      const files = await response.json();
      
      if (files.length === 0) {
        break; // No more files to fetch
      }
      
      allFiles.push(...files);
      
      // If we got fewer files than perPage, we've reached the end
      if (files.length < perPage) {
        break;
      }
      
      page++;
    }
    
    console.log(`Fetched ${allFiles.length} files for PR #${prNumber} in ${owner}/${repo}`);
    
    // Return all files with diff info
    res.json({
      files: allFiles.map(file => ({
        filename: file.filename,
        status: file.status, // added, removed, modified, renamed
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch, // unified diff format
        previousFilename: file.previous_filename,
        blobUrl: file.blob_url,
        rawUrl: file.raw_url
      })),
      algorithm: 'myers'
    });
  } catch (error) {
    console.error('Error in /api/prs/:owner/:repo/:prNumber/files:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const { repositories, teamMembers, token } = getConfig();
  
  res.json({
    status: 'ok',
    configured: {
      hasToken: !!token,
      repositories: repositories.length,
      teamMembers: teamMembers.length
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Configuration:');
  const { repositories, teamMembers, token } = getConfig();
  console.log(`  - GitHub Token: ${token ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`  - Repositories: ${repositories.length} configured`);
  console.log(`  - Team Members: ${teamMembers.length} configured`);
});


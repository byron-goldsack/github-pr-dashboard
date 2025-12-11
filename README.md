# GitHub PR Dashboard

A simple web dashboard to view all pull requests from your team across multiple GitHub repositories.

## Features

- 📊 View all open PRs from your team across multiple repositories
- 👥 Filter by team member GitHub usernames  
- 👀 Display required reviewers (both individual users and teams)
- 🔍 Advanced filtering by status (draft/ready), repository, and author
- 📐 Left sidebar layout for efficient space usage
- 🔄 Real-time refresh capability
- 🌙 Dark mode toggle with persistent preference
- ▤ Compact mode for viewing more PRs on screen
- 📱 Responsive design
- 🎨 Clean, modern UI

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- GitHub Personal Access Token

## Setup

### 1. Clone or download this project

### 2. Create a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" (classic)
3. Give it a name (e.g., "PR Dashboard")
4. Select scopes:
   - `repo` (for private repositories)
   - OR `public_repo` (for public repositories only)
5. Click "Generate token" and copy it

### 3. Configure environment variables

1. Copy the `.env.template` file to `.env`:
   ```bash
   copy .env.template .env
   ```

2. Edit `.env` and fill in your values:
   ```env
   GITHUB_TOKEN=your_github_token_here
   REPOSITORIES=owner1/repo1,owner2/repo2,owner3/repo3
   TEAM_MEMBERS=username1,username2,username3
   PORT=3001
   ```

   **Example:**
   ```env
   GITHUB_TOKEN=ghp_abc123xyz...
   REPOSITORIES=facebook/react,microsoft/vscode,nodejs/node
   TEAM_MEMBERS=john-doe,jane-smith,bob-developer
   PORT=3001
   ```

### 4. Install dependencies

```bash
npm run install-all
```

This will install dependencies for both the server and client.

## Running the Application

### Development Mode (Recommended)

Run both the backend server and frontend client simultaneously:

```bash
npm run dev
```

This will start:
- Backend API server on http://localhost:3001
- Frontend React app on http://localhost:3000

The dashboard will automatically open in your browser at http://localhost:3000

### Production Mode

1. Build the client:
   ```bash
   npm run build
   ```

2. Start the server:
   ```bash
   npm start
   ```

## Usage

Once the application is running:

1. The dashboard will automatically fetch and display all open PRs
2. **Layout**: Filters are in a left sidebar, PRs display in the main area
3. Each PR card shows:
   - **Full Mode**: Author avatar, PR title, repository, PR number, draft status, update time, and required reviewers
   - **Compact Mode**: PR title, author, repository, and draft status (optimized for density)
4. Use the filter controls in the left sidebar:
   - **Status**: All, Ready for Review, or Draft (single selection)
   - **Repository**: Select multiple repositories using checkboxes
   - **Author**: Select multiple team members using checkboxes
   - View showing/total counts at the bottom of the sidebar
5. Click "Clear Filters" in the sidebar to reset all filters
6. Click the compact mode icon (▤/☰) in the header to toggle between full and compact views
7. Click the moon/sun icon to toggle between light and dark mode (preference is saved)
8. Click the refresh icon (↻) to reload the PR list

## Configuration Options

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | Your GitHub personal access token | Yes |
| `REPOSITORIES` | Comma-separated list of repos (format: `owner/repo`) | Yes |
| `TEAM_MEMBERS` | Comma-separated list of GitHub usernames to filter | No* |
| `PORT` | Server port (default: 3001) | No |

\* If `TEAM_MEMBERS` is empty, the dashboard will show PRs from all authors in the configured repositories.

## API Endpoints

### `GET /api/prs`

Returns all open PRs from configured repositories, filtered by team members.

**Response:**
```json
{
  "prs": [
    {
      "id": 123456,
      "number": 42,
      "title": "Add new feature",
      "author": "username",
      "authorAvatar": "https://avatars.githubusercontent.com/...",
      "repository": "owner/repo",
      "url": "https://github.com/owner/repo/pull/42",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-02T00:00:00Z",
      "state": "open",
      "draft": false
    }
  ],
  "totalCount": 1,
  "repositories": 3,
  "teamMembers": 5
}
```

### `GET /api/health`

Health check endpoint to verify configuration.

## Troubleshooting

### "GitHub token not configured" error

Make sure your `.env` file exists and contains a valid `GITHUB_TOKEN`.

### "No repositories configured" error

Check that your `.env` file has the `REPOSITORIES` variable set with at least one repository in the format `owner/repo`.

### Rate limiting

GitHub API has rate limits:
- **Authenticated requests**: 5,000 per hour
- **Unauthenticated requests**: 60 per hour

Make sure you're using a valid `GITHUB_TOKEN` to get higher rate limits.

### CORS errors

If you see CORS errors in the browser console, make sure the backend server is running on port 3001 and the frontend is connecting to the correct URL.

## License

MIT


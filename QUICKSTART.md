# Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Install Dependencies
```bash
npm install
cd client
npm install
cd ..
```

### Step 2: Configure Your Environment

Edit the `.env` file in the root directory with your settings:

```env
GITHUB_TOKEN=ghp_your_actual_token_here
REPOSITORIES=your-org/repo1,your-org/repo2,another-org/repo3
TEAM_MEMBERS=alice,bob,charlie
PORT=3001
```

**To get your GitHub token:**
1. Visit https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scope: `repo` (for private repos) or `public_repo` (for public only)
4. Copy the token and paste it in your `.env` file

### Step 3: Run the Dashboard
```bash
npm run dev
```

The dashboard will open automatically at http://localhost:3000

That's it! 🎉

---

For more detailed information, see the main [README.md](README.md).


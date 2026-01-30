# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ISCGP Awards 2025 Voting Application - A B2B voting and prediction system built with React + Vite and Supabase backend. Users vote for nominees across 6 award categories and can predict vote counts.

## Development Commands

```bash
npm run dev       # Start dev server on port 5174
npm run build     # Production build
npm run lint      # ESLint check
npm run preview   # Preview production build on port 8080
```

## Architecture

### Tech Stack
- **Frontend:** React 19, Vite 7, React Router DOM 7
- **Backend/DB:** Supabase (PostgreSQL)
- **Auth:** Google OAuth2
- **Deployment:** Docker + Nginx

### Key Directories
- `src/pages/` - Main pages: HomePage, VotePage, HistoryPage, AdminPage
- `src/components/` - Reusable UI components (NomineeCard, PredictionModal, etc.)
- `src/context/` - React Context for global state (AuthContext, VoteContext)
- `src/lib/supabase.js` - All Supabase API functions (~1,250 lines)
- `src/lib/googleAuth.js` - Google OAuth service
- `src/config/votingConfig.js` - Award categories and voting settings

### State Management
Uses React Context API:
- **AuthContext** - User authentication, vote permissions (requires PM/BA/DEV role)
- **VoteContext** - Voting state, selections, vote history

### Database Schema
Main tables in `supabase_schema.sql`:
- `users` - Nominees with roles (PM, BA, DEV, PROJECT) and admin status
- `vote_sessions` - Groups of votes submitted together
- `votes` - Individual votes with predicted_count field
- `comments` - Nominee comments with anonymous option
- `settings` - Voting configuration

Key views: `nominee_vote_stats`, `category_leaderboard`, `all_votes_report`, `voter_ranking_report`

## Voting Categories

6 categories defined in `votingConfig.js`:
1. **Star Performer** - Has 3 sub-selections (PM, BA, DEV)
2. **The Unsung Hero** - Silent contributor
3. **The Innovator** - Tech/AI innovation
4. **People's Choice** - Most beloved employee
5. **The Dream Team** - Best project
6. **The Challenger** - Overcoming obstacles project

Total required selections: 8 (3 for Star Performer + 5 others)

## Environment Variables

Required in `.env` (see `.env.example`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_API_KEY=      # For Google Sheets sponsorship data
```

## Key Patterns

- **Demo mode:** App works offline with localStorage when Supabase unavailable
- **Vietnamese localization:** UI text and comments throughout codebase
- **Prediction system:** Users estimate vote counts; admin can find correct predictions
- **Anonymous comments:** Comment system supports anonymity option
- **Role-based voting:** Only users with PM, BA, or DEV roles can vote

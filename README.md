# MGT160 Mockup - Sports Betting Simulation Survey

This is a survey application for a sports betting simulation study with control and treatment groups.

## Setup Instructions

### 1. Render Deployment

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and sign up/login
3. Click "New +" and select "Static Site"
4. Connect your GitHub repository
5. Configure:
   - **Name**: mgt160-mockup (or your preferred name)
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `npm install`
   - **Publish Directory**: `.` (current directory)
   - **Environment**: `Static`
6. Click "Create Static Site"
7. Your site will be deployed automatically and you'll get a URL like `https://mgt160-mockup.onrender.com`

**Note**: For routing to work properly (accessing both `index.html` and `index-treatment.html`), you may need to configure custom routes in Render or use query parameters.

## Project Structure

- `index.html` - Control group survey
- `index-treatment.html` - Treatment group survey
- `script.js` - Control group logic
- `script-treatment.js` - Treatment group logic
- `styles.css` - Shared styles
- `package.json` - Dependencies for Render
- `render.yaml` - Render deployment configuration

## Features

- Age eligibility check (18+)
- Demographics collection
- 12 rounds of betting simulation
- Control and treatment group variations


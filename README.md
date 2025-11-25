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

**Note**: The site uses `index.html` as the entry point which handles randomization and routing.

## Local Testing

To test the application locally:

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Start the local server**:
   ```bash
   npm start
   ```
   This will start a server on `http://localhost:10000`

3. **Open your browser** and navigate to:
   ```
   http://localhost:10000
   ```

### Alternative Local Server Options

If you prefer other methods:

**Python 3:**
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000`

**Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

**Node.js http-server:**
```bash
npx http-server -p 8000
```

**VS Code Live Server:**
- Install the "Live Server" extension
- Right-click on `index.html` and select "Open with Live Server"

### Testing Notes

- The randomization will assign you to either control or treatment group
- Your assignment is stored in `localStorage`, so to test both groups:
  - Open browser DevTools (F12)
  - Go to Application/Storage → Local Storage
  - Delete the `surveyGroup` key
  - Refresh the page to get a new random assignment
- To test the admin dashboard, navigate to `http://localhost:10000/admin.html`

## Project Structure

- `index.html` - Randomization page (entry point, assigns users to control or treatment)
- `index-control.html` - Control group survey
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


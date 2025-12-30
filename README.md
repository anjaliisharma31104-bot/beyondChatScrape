# BeyondChats Article Automation Project

This project is a full-stack application designed to automate the process of scraping, rewriting, and displaying blog articles. It consists of a Laravel backend, a Node.js scripting layer for automation, and a React frontend.

## Architecture Diagram

The following diagram illustrates the flow of data and the interaction between the different components of the system.

```mermaid
graph TD;
    subgraph User
        A[Browser]
    end

    subgraph Vercel
        B[React Frontend]
    end

    subgraph GitHub Actions
        C[Scheduler (cron)]
        D[Scraper Script: scrape.js]
        E[Rewriter Script: rewrite.js]
    end

    subgraph Render
        F[Laravel Backend API]
        G[PostgreSQL Database]
    end

    subgraph External Services
        H[BeyondChats Blog]
        I[Google Search]
        J[OpenAI API]
    end

    A --> B;
    B --> F;
    C --> D;
    D --> H;
    D --> F;
    C --> E;
    E --> F;
    E --> I;
    E --> J;
    F --> G;
```

## Local Setup Instructions

To run this project locally, you will need to have PHP, Composer, and Node.js installed on your machine.

### 1. Backend (Laravel)

The backend is a Laravel application that provides a CRUD API for articles.

```bash
# Navigate to the backend directory
cd backend

# Install PHP dependencies
composer install

# Copy the environment file
cp .env.example .env

# Generate an application key
php artisan key:generate

# Run the database migrations (this will use the default SQLite database for local testing)
php artisan migrate

# Start the local development server
php artisan serve
```
The backend will be running at `http://127.0.0.1:8000`.

### 2. Automation Scripts (Node.js)

These scripts handle the scraping and rewriting of articles.

```bash
# Navigate to the scripts directory
cd scripts

# Install Node.js dependencies
npm install

# Create a .env file from the example
cp .env.example .env
```

Before running the scripts, you need to add your OpenAI API key to the `.env` file:

**scripts/.env**
```
OPENAI_API_KEY=your_openai_api_key_here
API_ENDPOINT=http://127.0.0.1:8000/api/articles
```

**To run the scripts:**
```bash
# To scrape articles from the blog
node scrape.js

# To rewrite the scraped articles
node rewrite.js
```

### 3. Frontend (React)

The frontend is a React application that displays the articles.

```bash
# Navigate to the frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start the local development server
npm start
```
The frontend will be running at `http://localhost:3000` and will connect to the local backend server.

## Deployment

*   **Backend:** Deployed on **Render**.
*   **Frontend:** Deployed on **Vercel**.
*   **Automation Scripts:** Scheduled to run via **GitHub Actions**.

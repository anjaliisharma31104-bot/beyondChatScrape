import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api/articles';
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setArticles(data);
      } catch (err) {
        setError('Failed to fetch articles. Make sure the backend server is running and accessible.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>BeyondChats Article Dashboard</h1>
      </header>
      <main>
        {loading && <div className="loading-spinner"></div>}
        {error && <p className="error">{error}</p>}
        <div className="article-list">
          {articles.length > 0 ? (
            articles.map(article => (
              <div key={article.id} className="article-card">
                <h2>{article.title}</h2>
                <div className="content-container">
                  <div className="content-section">
                    <h3>Original Content</h3>
                    <p>{article.original_content}</p>
                  </div>
                  <div className="content-section">
                    <h3>Rewritten Content</h3>
                    <p className="rewritten">
                      {article.rewritten_content || 'Not yet rewritten.'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            !loading && !error && <p>No articles found. Please run the "Scrape and Rewrite Articles" workflow in your project's Actions tab on GitHub to populate the database.</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

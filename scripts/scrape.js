const puppeteer = require('puppeteer');
const axios = require('axios');

const blogListUrl = 'https://beyondchats.com/blogs/';
// This is a placeholder and will be replaced with our live backend URL later.
const API_ENDPOINT = 'http://localhost:8000/api/articles'; 

async function scrapeAndSaveArticles() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log(`Navigating to ${blogListUrl}...`);
  await page.goto(blogListUrl, { waitUntil: 'networkidle2' });

  console.log('Extracting article links...');
  const articleLinks = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('h2.entry-title a').forEach(anchor => {
      links.push(anchor.href);
    });
    return links;
  });

  console.log(`Found ${articleLinks.length} article links.`);

  for (const link of articleLinks) {
    try {
      console.log(`Scraping content from ${link}...`);
      await page.goto(link, { waitUntil: 'networkidle2' });

      const article = await page.evaluate(() => {
        const title = document.querySelector('h1.elementor-heading-title')?.innerText;
        const content = document.querySelector('div.elementor-widget-theme-post-content')?.innerText;
        return { title, content };
      });

      if (article.title && article.content) {
        console.log(`Saving article: "${article.title}"`);
        
        await axios.post(API_ENDPOINT, {
          title: article.title,
          original_content: article.content,
        });

        console.log(`Successfully saved article: "${article.title}"`);
      } else {
        console.log(`Could not extract title or content from ${link}`);
      }
    } catch (error) {
      console.error(`Failed to process article from ${link}:`, error.message);
    }
  }

  await browser.close();
  console.log('Scraping complete. Browser closed.');
}

scrapeAndSaveArticles();
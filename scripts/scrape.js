const puppeteer = require('puppeteer');

const url = 'https://beyondchats.com/blogs/';

async function scrapeArticleUrls() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle2' });

  console.log('Extracting article links...');
  const articleLinks = await page.evaluate(() => {
    const links = [];
    // This selector targets the article titles on the blog page
    document.querySelectorAll('h2.entry-title a').forEach(anchor => {
      links.push(anchor.href);
    });
    return links;
  });

  console.log('Found article links:');
  console.log(articleLinks);

  await browser.close();
  console.log('Browser closed.');
}

scrapeArticleUrls();

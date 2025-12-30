require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:8000/api/articles';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function searchGoogleAndGetLinks(query) {
  console.log(`Searching Google for: "${query}"`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`);

  const links = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('div.yuRUbf a').forEach(anchor => {
      if (anchor.href && !anchor.href.includes('google.com')) {
        results.push(anchor.href);
      }
    });
    return results;
  });

  await browser.close();
  return links.slice(0, 2);
}

async function scrapeReferenceArticle(url) {
  try {
    const response = await fetch(url, { timeout: 15000 });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url} with status ${response.status}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const content = $('article').text() || $('main').text() || $('body').text();
    return content.replace(/\s\s+/g, ' ').trim().slice(0, 2000);
  } catch (error) {
    console.error(`Failed to scrape reference article ${url}: ${error.message}`);
    return '';
  }
}

async function rewriteArticles() {
  try {
    console.log('Fetching articles from the API...');
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    const articlesToRewrite = (await response.json()).filter(article => !article.rewritten_content);

    if (articlesToRewrite.length === 0) {
      console.log('No articles to rewrite.');
      return;
    }

    console.log(`Found ${articlesToRewrite.length} articles to rewrite.`);

    for (const article of articlesToRewrite) {
      try {
        console.log(`Processing article: "${article.title}"`);
        
        const referenceLinks = await searchGoogleAndGetLinks(article.title);
        if (referenceLinks.length === 0) {
          console.log('Could not find any reference links. Skipping rewrite for this article.');
          continue;
        }
        console.log(`Found reference links: ${referenceLinks.join(', ')}`);

        let referenceContents = '';
        for (const link of referenceLinks) {
          const content = await scrapeReferenceArticle(link);
          referenceContents += `\n\n--- Reference from ${link} ---\n${content}`;
        }

        const prompt = `
          Please rewrite the following article with a professional and engaging tone.
          Use the provided reference articles to update the content and formatting to match what is currently ranking on Google.
          At the end of the article, you MUST cite the references under a "References:" heading.

          Original Article:
          ---
          ${article.original_content}
          ---

          Reference Articles:
          ---
          ${referenceContents}
          ---
        `;

        console.log('Calling Gemini to rewrite...');
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const geminiResponse = await result.response;
        const rewrittenContent = geminiResponse.text();

        if (rewrittenContent) {
          let finalContent = rewrittenContent;
          if (!finalContent.includes('References:')) {
            finalContent += `\n\nReferences:\n${referenceLinks.join('\n')}`;
          }

          console.log(`Updating article in the database: "${article.title}"`);
          const updateResponse = await fetch(`${API_ENDPOINT}/${article.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              rewritten_content: finalContent,
            }),
          });

          if (!updateResponse.ok) {
            const errorData = await updateResponse.text();
            throw new Error(`API responded with status ${updateResponse.status}: ${errorData}`);
          }

          console.log(`Successfully updated: "${article.title}"`);
        } else {
          console.log(`Could not generate rewritten content for: "${article.title}"`);
        }
      } catch (error) {
        console.error(`Failed to process article "${article.title}":`, error.message);
      }
    }
  } catch (error) {
    console.error('Failed to fetch articles from the API:', error.message);
  }
}

rewriteArticles();
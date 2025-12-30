require('dotenv').config();
const axios = require('axios');
const { OpenAI } = require('openai');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:8000/api/articles';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function searchGoogleAndGetLinks(query) {
  console.log(`Searching Google for: "${query}"`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`);

  const links = await page.evaluate(() => {
    const results = [];
    // This selector targets the main search result links.
    document.querySelectorAll('div.g a').forEach(anchor => {
      if (anchor.href && !anchor.href.includes('google.com')) {
        results.push(anchor.href);
      }
    });
    return results;
  });

  await browser.close();
  return links.slice(0, 2); // Return top 2 links
}

async function scrapeReferenceArticle(url) {
  try {
    const { data } = await axios.get(url, { timeout: 15000 });
    const $ = cheerio.load(data);
    // A "best effort" to get the main content by targeting common article tags.
    const content = $('article').text() || $('main').text() || $('body').text();
    // Clean up the text and limit its size to avoid overly long prompts.
    return content.replace(/\s\s+/g, ' ').trim().slice(0, 2000);
  } catch (error) {
    console.error(`Failed to scrape reference article ${url}: ${error.message}`);
    return '';
  }
}

async function rewriteArticles() {
  try {
    console.log('Fetching articles from the API...');
    const response = await axios.get(API_ENDPOINT);
    const articlesToRewrite = response.data.filter(article => !article.rewritten_content);

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

        console.log('Calling LLM to rewrite...');
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an expert content writer and SEO specialist.' },
            { role: 'user', content: prompt }
          ],
        });

        let rewrittenContent = completion.choices[0].message.content;

        if (rewrittenContent) {
          // Ensure references are included
          if (!rewrittenContent.includes('References:')) {
            rewrittenContent += `\n\nReferences:\n${referenceLinks.join('\n')}`;
          }

          console.log(`Updating article in the database: "${article.title}"`);
          await axios.put(`${API_ENDPOINT}/${article.id}`, {
            rewritten_content: rewrittenContent,
          });
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
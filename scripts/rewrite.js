require('dotenv').config();
const axios = require('axios');
const { OpenAI } = require('openai');

// This is a placeholder and will be replaced with our live backend URL later. 
const API_ENDPOINT = 'http://localhost:8000/api/articles'; 

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
        console.log(`Rewriting article: "${article.title}"`);

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that rewrites articles with a professional and engaging tone.'
            },
            {
              role: 'user',
              content: `Please rewrite the following article:\n\n${article.original_content}`
            }
          ],
        });

        const rewrittenContent = completion.choices[0].message.content;

        if (rewrittenContent) {
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

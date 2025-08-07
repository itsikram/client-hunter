const axios = require('axios');
const cheerio = require('cheerio');

class WordPressDetector {
  constructor() {
    this.indicators = [
      '/wp-content/',
      '/wp-includes/',
      '/wp-admin/',
      'wp-json',
      'wordpress',
      'wp_enqueue_script',
      'wp-embed.min.js',
      'generator.*wordpress',
      'wp-rocket',
      'elementor',
      'woocommerce'
    ];
  }

  async isWordPressSite(url) {
    try {
      // Ensure URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Check for WordPress indicators in HTML
      const htmlContent = html.toLowerCase();
      
      // Direct WordPress indicators
      for (const indicator of this.indicators) {
        if (htmlContent.includes(indicator.toLowerCase())) {
          return {
            isWordPress: true,
            indicator: indicator,
            confidence: 'high'
          };
        }
      }

      // Check meta generator tag
      const generator = $('meta[name="generator"]').attr('content');
      if (generator && generator.toLowerCase().includes('wordpress')) {
        return {
          isWordPress: true,
          indicator: 'meta generator tag',
          confidence: 'high'
        };
      }

      // Check for WordPress REST API
      try {
        const apiResponse = await axios.get(`${url}/wp-json/wp/v2/posts?per_page=1`, {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (apiResponse.status === 200) {
          return {
            isWordPress: true,
            indicator: 'WordPress REST API',
            confidence: 'high'
          };
        }
      } catch (apiError) {
        // API check failed, continue with other checks
      }

      // Check for common WordPress themes/plugins in link tags
      const links = $('link[href*="wp-"]');
      if (links.length > 0) {
        return {
          isWordPress: true,
          indicator: 'WordPress assets in link tags',
          confidence: 'medium'
        };
      }

      // Check for WordPress classes in body
      const bodyClasses = $('body').attr('class') || '';
      if (bodyClasses.includes('wp-') || bodyClasses.includes('wordpress')) {
        return {
          isWordPress: true,
          indicator: 'WordPress CSS classes',
          confidence: 'medium'
        };
      }

      return {
        isWordPress: false,
        indicator: null,
        confidence: 'high'
      };

    } catch (error) {
      throw new Error(`Failed to check WordPress status for ${url}: ${error.message}`);
    }
  }

  async checkWordPressBatch(urls) {
    const results = [];
    
    for (const url of urls) {
      try {
        console.log(`Checking ${url}...`);
        const result = await this.isWordPressSite(url);
        results.push({
          url: url,
          ...result
        });
        
        // Add delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          url: url,
          isWordPress: false,
          indicator: null,
          confidence: 'unknown',
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = WordPressDetector;
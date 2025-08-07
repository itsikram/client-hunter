const axios = require('axios');
const cheerio = require('cheerio');
const chalk = require('chalk');
const ora = require('ora');

class GoogleSearcher {
  constructor(options = {}) {
    this.options = {
      delay: options.delay || 2000, // Delay between searches to be respectful
      maxPages: options.maxPages || 5,
      resultsPerPage: options.resultsPerPage || 10,
      userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      language: options.language || 'en',
      ...options
    };

    // Predefined WordPress search queries
    this.wordpressQueries = [
      'site:*/wp-content/',
      'site:*/wp-includes/',
      'site:*/wp-admin/',
      '"powered by wordpress"',
      '"wordpress theme"',
      '"wp-content/themes"',
      '"wp-content/plugins"',
      'inurl:wp-content',
      'inurl:wp-includes',
      'filetype:xml "wordpress"',
      '"wp-json/wp/v2"'
    ];

    // Industry-specific WordPress queries
    this.industryQueries = {
      agencies: [
        '"web design agency" "powered by wordpress"',
        '"digital agency" inurl:wp-content',
        '"marketing agency" site:*/wp-admin/',
        '"creative agency" "wordpress theme"'
      ],
      ecommerce: [
        '"woocommerce" "powered by wordpress"',
        '"online store" inurl:wp-content',
        '"shop" "wp-content/plugins/woocommerce"',
        '"ecommerce" "wordpress"'
      ],
      blogs: [
        '"blog" "powered by wordpress"',
        '"personal blog" inurl:wp-content',
        '"news" "wordpress theme"',
        '"magazine" site:*/wp-content/'
      ],
      business: [
        '"company" "powered by wordpress"',
        '"business" inurl:wp-content',
        '"corporate" "wordpress theme"',
        '"services" site:*/wp-admin/'
      ],
      freelancers: [
        '"freelancer" "powered by wordpress"',
        '"portfolio" inurl:wp-content',
        '"designer" "wordpress theme"',
        '"developer" site:*/wp-content/'
      ]
    };
  }

  async searchGoogle(query, options = {}) {
    const searchOptions = { ...this.options, ...options };
    const results = [];

    try {
      for (let page = 0; page < searchOptions.maxPages; page++) {
        const spinner = ora(`Searching Google for: "${query}" (page ${page + 1})`).start();
        
        try {
          const start = page * searchOptions.resultsPerPage;
          const searchUrl = this.buildGoogleSearchUrl(query, start, searchOptions);
          
          const response = await axios.get(searchUrl, {
            headers: {
              'User-Agent': searchOptions.userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'DNT': '1',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            },
            timeout: 15000
          });

          const pageResults = this.parseGoogleResults(response.data);
          results.push(...pageResults);
          
          spinner.succeed(`Found ${pageResults.length} results on page ${page + 1}`);
          
          // Add delay between requests to be respectful
          if (page < searchOptions.maxPages - 1) {
            await new Promise(resolve => setTimeout(resolve, searchOptions.delay));
          }
          
        } catch (error) {
          spinner.fail(`Failed to search page ${page + 1}: ${error.message}`);
          break; // Stop if we get blocked or encounter errors
        }
      }
      
      return this.deduplicateResults(results);
      
    } catch (error) {
      throw new Error(`Google search failed: ${error.message}`);
    }
  }

  buildGoogleSearchUrl(query, start = 0, options = {}) {
    const baseUrl = 'https://www.google.com/search';
    const params = new URLSearchParams({
      q: query,
      start: start,
      num: options.resultsPerPage || 10,
      hl: options.language || 'en',
      safe: 'active',
      filter: '0' // Don't filter duplicate results
    });

    return `${baseUrl}?${params.toString()}`;
  }

  parseGoogleResults(html) {
    const $ = cheerio.load(html);
    const results = [];

    // Google search result selectors (these may need updates as Google changes)
    const resultSelectors = [
      'div.g',           // Standard results
      'div.tF2Cxc',      // Alternative result format
      'div.hlcw0c'       // Another format
    ];

    resultSelectors.forEach(selector => {
      $(selector).each((i, element) => {
        const $result = $(element);
        
        // Extract URL from various possible locations
        let url = null;
        const linkElement = $result.find('a[href]').first();
        
        if (linkElement.length) {
          const href = linkElement.attr('href');
          
          // Handle Google redirect URLs
          if (href && href.startsWith('/url?q=')) {
            const urlParams = new URLSearchParams(href.substring(6));
            url = urlParams.get('q');
          } else if (href && href.startsWith('http')) {
            url = href;
          }
        }

        if (url) {
          // Extract title and description
          const title = $result.find('h3').text().trim() || 
                       $result.find('[role="heading"]').text().trim() ||
                       'No title';
          
          const description = $result.find('span:contains("...")')
                                    .parent()
                                    .text()
                                    .trim() || 
                             $result.find('div[data-sncf]')
                                    .text()
                                    .trim() ||
                             'No description';

          // Clean up the URL
          const cleanUrl = this.cleanUrl(url);
          
          if (cleanUrl && this.isValidUrl(cleanUrl)) {
            results.push({
              url: cleanUrl,
              title: title,
              description: description,
              source: 'google_search'
            });
          }
        }
      });
    });

    return results;
  }

  cleanUrl(url) {
    try {
      // Remove Google tracking and clean up URL
      let cleanUrl = url;
      
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
      const urlObj = new URL(cleanUrl);
      
      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      // Get just the domain + path, remove fragments
      cleanUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
      
      // Remove trailing slash unless it's just the domain
      if (cleanUrl.endsWith('/') && urlObj.pathname !== '/') {
        cleanUrl = cleanUrl.slice(0, -1);
      }
      
      return cleanUrl;
    } catch (error) {
      return url; // Return original if cleaning fails
    }
  }

  isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Filter out unwanted domains
      const excludeDomains = [
        'google.com',
        'youtube.com',
        'facebook.com',
        'twitter.com',
        'linkedin.com',
        'instagram.com',
        'pinterest.com',
        'reddit.com',
        'wikipedia.org',
        'amazon.com',
        'ebay.com',
        'craigslist.org'
      ];
      
      // Check if hostname contains excluded domains
      const isExcluded = excludeDomains.some(domain => 
        hostname.includes(domain) || hostname.endsWith(domain)
      );
      
      return !isExcluded && 
             urlObj.protocol.startsWith('http') && 
             hostname.includes('.') && 
             !hostname.includes('localhost');
             
    } catch (error) {
      return false;
    }
  }

  deduplicateResults(results) {
    const seen = new Set();
    return results.filter(result => {
      const key = result.url.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async findWordPressSites(options = {}) {
    const { industry, customQueries, maxResults } = options;
    const allResults = [];
    
    console.log(chalk.blue('\n🔍 Searching Google for WordPress websites...\n'));
    
    let queriesToUse = [...this.wordpressQueries];
    
    // Add industry-specific queries if specified
    if (industry && this.industryQueries[industry]) {
      queriesToUse.push(...this.industryQueries[industry]);
      console.log(chalk.gray(`Adding ${industry} industry-specific queries...`));
    }
    
    // Add custom queries if provided
    if (customQueries && Array.isArray(customQueries)) {
      queriesToUse.push(...customQueries);
      console.log(chalk.gray(`Adding ${customQueries.length} custom queries...`));
    }

    // Search with each query
    for (let i = 0; i < queriesToUse.length; i++) {
      const query = queriesToUse[i];
      
      console.log(chalk.gray(`[${i + 1}/${queriesToUse.length}] Processing query: ${query}`));
      
      try {
        const results = await this.searchGoogle(query, options);
        allResults.push(...results);
        
        console.log(chalk.green(`✓ Found ${results.length} results for this query`));
        
        // Check if we've reached max results
        if (maxResults && allResults.length >= maxResults) {
          console.log(chalk.yellow(`\nReached maximum results limit (${maxResults})`));
          break;
        }
        
        // Add delay between different queries
        if (i < queriesToUse.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.options.delay));
        }
        
      } catch (error) {
        console.log(chalk.red(`✗ Query failed: ${error.message}`));
        continue;
      }
    }

    // Deduplicate all results
    const uniqueResults = this.deduplicateResults(allResults);
    
    // Limit results if maxResults is specified
    const finalResults = maxResults ? uniqueResults.slice(0, maxResults) : uniqueResults;
    
    console.log(chalk.blue(`\n📊 Search Summary:`));
    console.log(chalk.gray(`Total queries processed: ${queriesToUse.length}`));
    console.log(chalk.gray(`Total results found: ${allResults.length}`));
    console.log(chalk.gray(`Unique results: ${uniqueResults.length}`));
    console.log(chalk.gray(`Final results: ${finalResults.length}`));
    
    return finalResults;
  }

  async searchByKeywords(keywords, options = {}) {
    const queries = keywords.map(keyword => `"${keyword}" "powered by wordpress"`);
    
    console.log(chalk.blue(`\n🔍 Searching for WordPress sites with keywords: ${keywords.join(', ')}\n`));
    
    const allResults = [];
    
    for (const query of queries) {
      try {
        const results = await this.searchGoogle(query, options);
        allResults.push(...results);
        
        await new Promise(resolve => setTimeout(resolve, this.options.delay));
      } catch (error) {
        console.log(chalk.red(`Failed to search for "${query}": ${error.message}`));
      }
    }
    
    return this.deduplicateResults(allResults);
  }

  extractDomains(results) {
    return results.map(result => {
      try {
        const url = new URL(result.url);
        return url.hostname;
      } catch (error) {
        return result.url;
      }
    });
  }

  async saveResults(results, filename = null) {
    const fs = require('fs-extra');
    const path = require('path');
    
    const outputDir = path.join(process.cwd(), 'output');
    await fs.ensureDir(outputDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = filename || `google_search_results_${timestamp}.json`;
    const filePath = path.join(outputDir, fileName);
    
    const exportData = {
      searchDate: new Date().toISOString(),
      totalResults: results.length,
      results: results
    };
    
    await fs.writeJSON(filePath, exportData, { spaces: 2 });
    return filePath;
  }
}

module.exports = GoogleSearcher;
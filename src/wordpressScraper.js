const WordPressDetector = require('./wordpressDetector');
const EmailExtractor = require('./emailExtractor');
const DataExporter = require('./dataExporter');
const chalk = require('chalk');
const ora = require('ora');

class WordPressScraper {
  constructor(options = {}) {
    this.detector = new WordPressDetector();
    this.extractor = new EmailExtractor();
    this.exporter = new DataExporter();
    
    this.options = {
      respectful: true,
      delay: options.delay || 1000,
      timeout: options.timeout || 10000,
      maxRetries: options.maxRetries || 3,
      onlyWordPress: options.onlyWordPress || false,
      exportFormats: options.exportFormats || ['csv', 'json'],
      ...options
    };
  }

  async scrapeWebsite(url) {
    const spinner = ora(`Processing ${url}`).start();
    
    try {
      // Step 1: Detect if it's a WordPress site
      spinner.text = `Checking if ${url} is a WordPress site...`;
      const wpDetection = await this.detector.isWordPressSite(url);
      
      if (!wpDetection.isWordPress && this.options.onlyWordPress) {
        spinner.warn(`${url} is not a WordPress site - skipping`);
        return null;
      }

      // Step 2: Extract contact information
      spinner.text = `Extracting contact information from ${url}...`;
      const contactInfo = await this.extractor.extractFromWordPressSite(url);
      
      // Combine WordPress detection with contact info
      const result = {
        ...contactInfo,
        isWordPress: wpDetection.isWordPress,
        indicator: wpDetection.indicator,
        confidence: wpDetection.confidence
      };

      const emailCount = result.emails ? result.emails.length : 0;
      spinner.succeed(`${url} - WordPress: ${wpDetection.isWordPress ? '✓' : '✗'}, Emails found: ${emailCount}`);
      
      return result;
      
    } catch (error) {
      spinner.fail(`Failed to process ${url}: ${error.message}`);
      return {
        url: url,
        isWordPress: false,
        emails: [],
        phones: [],
        socialMedia: {},
        contactForms: [],
        error: error.message,
        extractedAt: new Date().toISOString()
      };
    }
  }

  async scrapeBatch(urls, options = {}) {
    const results = [];
    const batchOptions = { ...this.options, ...options };
    
    console.log(chalk.blue(`\n🚀 Starting WordPress email scraping for ${urls.length} URLs...\n`));
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      console.log(chalk.gray(`[${i + 1}/${urls.length}] Processing: ${url}`));
      
      try {
        const result = await this.scrapeWebsite(url);
        if (result) {
          results.push(result);
        }
        
        // Add delay between requests to be respectful
        if (batchOptions.respectful && i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, batchOptions.delay));
        }
        
      } catch (error) {
        console.log(chalk.red(`❌ Error processing ${url}: ${error.message}`));
        results.push({
          url: url,
          isWordPress: false,
          emails: [],
          phones: [],
          socialMedia: {},
          contactForms: [],
          error: error.message,
          extractedAt: new Date().toISOString()
        });
      }
    }

    return results;
  }

  async scrapeAndExport(urls, outputPrefix = 'wordpress_scrape') {
    console.log(chalk.blue('\n📊 WordPress Email Scraper\n'));
    console.log(chalk.gray('=' .repeat(50)));
    
    // Scrape all URLs
    const results = await this.scrapeBatch(urls);
    
    // Generate summary
    this.printSummary(results);
    
    // Export data
    console.log(chalk.blue('\n💾 Exporting data...'));
    const exportResults = await this.exporter.exportAll(results, outputPrefix);
    
    console.log(chalk.green('\n✅ Export completed:'));
    Object.entries(exportResults).forEach(([format, filePath]) => {
      console.log(chalk.gray(`   ${format.toUpperCase()}: ${filePath}`));
    });
    
    return {
      scraped: results,
      exported: exportResults
    };
  }

  printSummary(results) {
    const totalSites = results.length;
    const wordpressSites = results.filter(r => r.isWordPress).length;
    const sitesWithEmails = results.filter(r => r.emails && r.emails.length > 0).length;
    const totalEmails = results.reduce((sum, r) => sum + (r.emails ? r.emails.length : 0), 0);
    const uniqueEmails = new Set();
    
    results.forEach(r => {
      if (r.emails) {
        r.emails.forEach(email => uniqueEmails.add(email));
      }
    });

    console.log(chalk.blue('\n📈 Scraping Summary:'));
    console.log(chalk.gray('=' .repeat(50)));
    console.log(`${chalk.white('Total sites processed:')} ${chalk.yellow(totalSites)}`);
    console.log(`${chalk.white('WordPress sites:')} ${chalk.green(wordpressSites)} (${((wordpressSites / totalSites) * 100).toFixed(1)}%)`);
    console.log(`${chalk.white('Sites with emails:')} ${chalk.green(sitesWithEmails)} (${((sitesWithEmails / totalSites) * 100).toFixed(1)}%)`);
    console.log(`${chalk.white('Total emails found:')} ${chalk.yellow(totalEmails)}`);
    console.log(`${chalk.white('Unique emails:')} ${chalk.cyan(uniqueEmails.size)}`);
    
    if (wordpressSites > 0) {
      console.log(`\n${chalk.white('WordPress Detection Methods:')}`);
      const methods = {};
      results.filter(r => r.isWordPress).forEach(r => {
        const method = r.indicator || 'Unknown';
        methods[method] = (methods[method] || 0) + 1;
      });
      
      Object.entries(methods)
        .sort((a, b) => b[1] - a[1])
        .forEach(([method, count]) => {
          console.log(`  ${chalk.gray('•')} ${method}: ${chalk.yellow(count)}`);
        });
    }
  }

  async validateUrls(urls) {
    const validUrls = [];
    const invalidUrls = [];
    
    urls.forEach(url => {
      try {
        // Basic URL validation
        let testUrl = url;
        if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
          testUrl = 'https://' + testUrl;
        }
        
        new URL(testUrl);
        validUrls.push(url);
      } catch (error) {
        invalidUrls.push(url);
      }
    });
    
    if (invalidUrls.length > 0) {
      console.log(chalk.yellow('\n⚠️  Invalid URLs detected:'));
      invalidUrls.forEach(url => console.log(chalk.gray(`   • ${url}`)));
    }
    
    return {
      valid: validUrls,
      invalid: invalidUrls
    };
  }

  async readUrlsFromFile(filePath) {
    const fs = require('fs-extra');
    const path = require('path');
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const urls = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')); // Remove empty lines and comments
      
      return urls;
    } catch (error) {
      throw new Error(`Failed to read URLs from file ${filePath}: ${error.message}`);
    }
  }
}

module.exports = WordPressScraper;
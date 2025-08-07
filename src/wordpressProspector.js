const GoogleSearcher = require('./googleSearcher');
const WordPressScraper = require('./wordpressScraper');
const chalk = require('chalk');
const ora = require('ora');

class WordPressProspector {
  constructor(options = {}) {
    this.searcher = new GoogleSearcher(options);
    this.scraper = new WordPressScraper(options);
    
    this.options = {
      maxSearchResults: options.maxSearchResults || 100,
      validateWordPress: options.validateWordPress !== false, // Default to true
      extractEmails: options.extractEmails !== false, // Default to true
      ...options
    };
  }

  async findAndScrapeWordPressSites(searchOptions = {}) {
    console.log(chalk.blue('\n🎯 WordPress Prospecting Pipeline\n'));
    console.log(chalk.gray('=' .repeat(50)));
    
    const pipeline = {
      searchResults: [],
      wordpressSites: [],
      contactData: [],
      summary: {}
    };

    try {
      // Step 1: Search Google for WordPress sites
      console.log(chalk.blue('\n📍 Step 1: Searching Google for WordPress websites'));
      
      const searchResults = await this.searcher.findWordPressSites({
        ...searchOptions,
        maxResults: this.options.maxSearchResults
      });
      
      pipeline.searchResults = searchResults;
      console.log(chalk.green(`✓ Found ${searchResults.length} potential WordPress sites`));

      if (searchResults.length === 0) {
        console.log(chalk.yellow('No search results found. Try different search parameters.'));
        return pipeline;
      }

      // Step 2: Extract URLs and validate WordPress (if enabled)
      console.log(chalk.blue('\n🔍 Step 2: Extracting and validating URLs'));
      
      const urls = this.searcher.extractDomains(searchResults);
      let validatedSites = urls;

      if (this.options.validateWordPress) {
        console.log(chalk.gray('Validating WordPress installations...'));
        
        const wordpressDetection = await this.scraper.scrapeBatch(urls, {
          onlyWordPress: false, // We want to see all results for filtering
          delay: 1500
        });
        
        pipeline.wordpressSites = wordpressDetection.filter(site => site.isWordPress);
        validatedSites = pipeline.wordpressSites.map(site => site.url);
        
        console.log(chalk.green(`✓ Confirmed ${pipeline.wordpressSites.length} WordPress sites out of ${urls.length} checked`));
      } else {
        // If not validating, treat all as potential WordPress sites
        pipeline.wordpressSites = urls.map(url => ({ url, isWordPress: 'not_validated' }));
      }

      // Step 3: Extract contact information (if enabled)
      if (this.options.extractEmails && validatedSites.length > 0) {
        console.log(chalk.blue('\n📧 Step 3: Extracting contact information'));
        
        const contactResults = await this.scraper.scrapeBatch(validatedSites, {
          delay: 2000, // Be more respectful when extracting emails
          onlyWordPress: false // We already know these are WordPress sites
        });
        
        pipeline.contactData = contactResults;
        
        const sitesWithEmails = contactResults.filter(site => site.emails && site.emails.length > 0);
        const totalEmails = contactResults.reduce((sum, site) => sum + (site.emails ? site.emails.length : 0), 0);
        
        console.log(chalk.green(`✓ Extracted contact info from ${contactResults.length} sites`));
        console.log(chalk.gray(`   • ${sitesWithEmails.length} sites have email addresses`));
        console.log(chalk.gray(`   • ${totalEmails} total email addresses found`));
      }

      // Generate summary
      pipeline.summary = this.generateSummary(pipeline);
      
      // Print final summary
      this.printFinalSummary(pipeline);
      
      return pipeline;
      
    } catch (error) {
      console.log(chalk.red(`❌ Prospecting pipeline failed: ${error.message}`));
      throw error;
    }
  }

  async searchByIndustry(industry, options = {}) {
    console.log(chalk.blue(`\n🏢 Searching for WordPress sites in the ${industry} industry\n`));
    
    const searchOptions = {
      industry: industry,
      maxPages: options.maxPages || 3,
      ...options
    };
    
    return await this.findAndScrapeWordPressSites(searchOptions);
  }

  async searchByKeywords(keywords, options = {}) {
    console.log(chalk.blue(`\n🔍 Searching for WordPress sites with keywords: ${keywords.join(', ')}\n`));
    
    const searchResults = await this.searcher.searchByKeywords(keywords, options);
    
    if (searchResults.length === 0) {
      console.log(chalk.yellow('No results found for the given keywords.'));
      return { searchResults: [], wordpressSites: [], contactData: [] };
    }
    
    const urls = this.searcher.extractDomains(searchResults);
    
    if (this.options.extractEmails) {
      const contactResults = await this.scraper.scrapeBatch(urls);
      return {
        searchResults,
        wordpressSites: contactResults.filter(site => site.isWordPress),
        contactData: contactResults
      };
    }
    
    return {
      searchResults,
      wordpressSites: urls.map(url => ({ url, isWordPress: 'not_validated' })),
      contactData: []
    };
  }

  async exportResults(pipeline, outputPrefix = 'wordpress_prospects') {
    console.log(chalk.blue('\n💾 Exporting results...'));
    
    const exports = {};
    
    try {
      // Export search results
      if (pipeline.searchResults.length > 0) {
        const searchFile = await this.searcher.saveResults(
          pipeline.searchResults, 
          `${outputPrefix}_search_results.json`
        );
        exports.searchResults = searchFile;
        console.log(chalk.gray(`   Search results: ${searchFile}`));
      }
      
      // Export WordPress site data and contact info
      if (pipeline.contactData.length > 0) {
        const exportResults = await this.scraper.exporter.exportAll(
          pipeline.contactData, 
          outputPrefix
        );
        exports.contacts = exportResults;
        
        Object.entries(exportResults).forEach(([format, filePath]) => {
          console.log(chalk.gray(`   ${format.toUpperCase()}: ${filePath}`));
        });
      }
      
      // Export summary report
      const summaryFile = await this.exportSummaryReport(pipeline, outputPrefix);
      exports.summary = summaryFile;
      console.log(chalk.gray(`   Summary report: ${summaryFile}`));
      
      console.log(chalk.green('\n✅ All exports completed successfully!'));
      
      return exports;
      
    } catch (error) {
      console.log(chalk.red(`❌ Export failed: ${error.message}`));
      throw error;
    }
  }

  async exportSummaryReport(pipeline, outputPrefix) {
    const fs = require('fs-extra');
    const path = require('path');
    
    const outputDir = path.join(process.cwd(), 'output');
    await fs.ensureDir(outputDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${outputPrefix}_summary_${timestamp}.txt`;
    const filePath = path.join(outputDir, fileName);
    
    const summary = pipeline.summary;
    
    const report = `
WordPress Prospecting Summary Report
===================================

Date: ${new Date().toISOString()}

Search Results:
--------------
Total search results: ${summary.totalSearchResults}
Search queries used: ${summary.searchQueries || 'Multiple'}

WordPress Validation:
--------------------
Sites validated: ${summary.sitesValidated}
Confirmed WordPress sites: ${summary.confirmedWordPressSites}
WordPress detection rate: ${summary.wordpressDetectionRate}%

Contact Information:
-------------------
Sites with contact info: ${summary.sitesWithContactInfo}
Total email addresses: ${summary.totalEmails}
Unique email addresses: ${summary.uniqueEmails}
Average emails per site: ${summary.avgEmailsPerSite}

Top Level Domains:
-----------------
${summary.topDomains || 'No domain analysis available'}

Industry Insights:
-----------------
${summary.industryInsights || 'General WordPress prospecting'}

WordPress Detection Methods:
---------------------------
${summary.detectionMethods || 'Various detection methods used'}

Recommendations:
---------------
${this.generateRecommendations(summary)}
`;

    await fs.writeFile(filePath, report);
    return filePath;
  }

  generateSummary(pipeline) {
    const summary = {
      totalSearchResults: pipeline.searchResults.length,
      sitesValidated: pipeline.wordpressSites.length,
      confirmedWordPressSites: pipeline.wordpressSites.filter(site => site.isWordPress === true).length,
      sitesWithContactInfo: pipeline.contactData.filter(site => site.emails && site.emails.length > 0).length,
      totalEmails: pipeline.contactData.reduce((sum, site) => sum + (site.emails ? site.emails.length : 0), 0),
    };
    
    // Calculate derived metrics
    summary.wordpressDetectionRate = summary.sitesValidated > 0 ? 
      ((summary.confirmedWordPressSites / summary.sitesValidated) * 100).toFixed(1) : 0;
    
    summary.avgEmailsPerSite = summary.sitesWithContactInfo > 0 ? 
      (summary.totalEmails / summary.sitesWithContactInfo).toFixed(1) : 0;
    
    // Count unique emails
    const allEmails = new Set();
    pipeline.contactData.forEach(site => {
      if (site.emails) {
        site.emails.forEach(email => allEmails.add(email));
      }
    });
    summary.uniqueEmails = allEmails.size;
    
    return summary;
  }

  generateRecommendations(summary) {
    const recommendations = [];
    
    if (summary.wordpressDetectionRate < 50) {
      recommendations.push('• Consider refining search queries to target WordPress sites more specifically');
    }
    
    if (summary.sitesWithContactInfo < summary.confirmedWordPressSites * 0.3) {
      recommendations.push('• Many sites lack visible contact information - consider expanding search to more page types');
    }
    
    if (summary.avgEmailsPerSite < 1.5) {
      recommendations.push('• Low email extraction rate - sites may have limited public contact info');
    }
    
    if (summary.totalEmails > 0) {
      recommendations.push('• Verify email addresses before marketing campaigns');
      recommendations.push('• Ensure compliance with GDPR and CAN-SPAM regulations');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('• Great results! Consider expanding to additional industries or keywords');
    }
    
    return recommendations.join('\n');
  }

  printFinalSummary(pipeline) {
    const summary = pipeline.summary;
    
    console.log(chalk.blue('\n📊 Final Prospecting Summary'));
    console.log(chalk.gray('=' .repeat(50)));
    console.log(`${chalk.white('Search results found:')} ${chalk.yellow(summary.totalSearchResults)}`);
    console.log(`${chalk.white('WordPress sites confirmed:')} ${chalk.green(summary.confirmedWordPressSites)} (${summary.wordpressDetectionRate}%)`);
    console.log(`${chalk.white('Sites with contact info:')} ${chalk.cyan(summary.sitesWithContactInfo)}`);
    console.log(`${chalk.white('Total email addresses:')} ${chalk.yellow(summary.totalEmails)}`);
    console.log(`${chalk.white('Unique email addresses:')} ${chalk.cyan(summary.uniqueEmails)}`);
    
    if (summary.totalEmails > 0) {
      console.log(chalk.green('\n🎉 Success! You now have a list of WordPress prospects with contact information.'));
    } else {
      console.log(chalk.yellow('\n⚠️  No email addresses found. Consider different search terms or target industries.'));
    }
  }

  // Convenience methods for common prospecting scenarios
  async findAgencyProspects(options = {}) {
    return await this.searchByIndustry('agencies', options);
  }

  async findEcommerceProspects(options = {}) {
    return await this.searchByIndustry('ecommerce', options);
  }

  async findBlogProspects(options = {}) {
    return await this.searchByIndustry('blogs', options);
  }

  async findBusinessProspects(options = {}) {
    return await this.searchByIndustry('business', options);
  }

  async findFreelancerProspects(options = {}) {
    return await this.searchByIndustry('freelancers', options);
  }
}

module.exports = WordPressProspector;
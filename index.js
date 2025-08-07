#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const WordPressScraper = require('./src/wordpressScraper');
const path = require('path');
const fs = require('fs-extra');

const program = new Command();

// CLI Setup
program
  .name('wordpress-email-scraper')
  .description('A Node.js tool to scrape email addresses from WordPress websites for marketing purposes')
  .version('1.0.0');

// Command: Scrape URLs directly
program
  .command('scrape')
  .description('Scrape email addresses from WordPress websites')
  .option('-u, --urls <urls>', 'Comma-separated list of URLs to scrape')
  .option('-f, --file <file>', 'File containing URLs (one per line)')
  .option('-o, --output <prefix>', 'Output file prefix', 'wordpress_scrape')
  .option('--wp-only', 'Only process WordPress sites', false)
  .option('--delay <ms>', 'Delay between requests in milliseconds', '1000')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '10000')
  .action(async (options) => {
    try {
      let urls = [];
      
      // Get URLs from command line or file
      if (options.urls) {
        urls = options.urls.split(',').map(url => url.trim());
      } else if (options.file) {
        const scraper = new WordPressScraper();
        urls = await scraper.readUrlsFromFile(options.file);
      } else {
        console.log(chalk.red('❌ Please provide URLs using --urls or --file option'));
        process.exit(1);
      }

      if (urls.length === 0) {
        console.log(chalk.red('❌ No URLs provided'));
        process.exit(1);
      }

      // Initialize scraper with options
      const scraperOptions = {
        onlyWordPress: options.wpOnly,
        delay: parseInt(options.delay),
        timeout: parseInt(options.timeout)
      };

      const scraper = new WordPressScraper(scraperOptions);
      
      // Validate URLs
      const validation = await scraper.validateUrls(urls);
      if (validation.invalid.length > 0) {
        console.log(chalk.yellow(`⚠️  Found ${validation.invalid.length} invalid URLs`));
      }

      // Start scraping
      await scraper.scrapeAndExport(validation.valid, options.output);
      
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Command: Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Run the scraper in interactive mode')
  .action(async () => {
    try {
      console.log(chalk.blue('\n🎯 WordPress Email Scraper - Interactive Mode\n'));
      
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'inputMethod',
          message: 'How would you like to provide URLs?',
          choices: [
            { name: 'Enter URLs manually', value: 'manual' },
            { name: 'Load from file', value: 'file' },
            { name: 'Use sample WordPress sites', value: 'sample' }
          ]
        }
      ]);

      let urls = [];

      if (answers.inputMethod === 'manual') {
        const urlAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'urls',
            message: 'Enter URLs (comma-separated):',
            validate: (input) => input.trim().length > 0 || 'Please enter at least one URL'
          }
        ]);
        urls = urlAnswers.urls.split(',').map(url => url.trim());
        
      } else if (answers.inputMethod === 'file') {
        const fileAnswers = await inquirer.prompt([
          {
            type: 'input',
            name: 'filePath',
            message: 'Enter path to file containing URLs:',
            validate: async (input) => {
              const exists = await fs.pathExists(input);
              return exists || 'File does not exist';
            }
          }
        ]);
        
        const scraper = new WordPressScraper();
        urls = await scraper.readUrlsFromFile(fileAnswers.filePath);
        
      } else if (answers.inputMethod === 'sample') {
        urls = [
          'wordpress.org',
          'wordpress.com',
          'automattic.com',
          'wpengine.com',
          'kinsta.com'
        ];
        console.log(chalk.gray('Using sample WordPress-related sites for demonstration'));
      }

      const configAnswers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'wpOnly',
          message: 'Only process WordPress sites?',
          default: false
        },
        {
          type: 'input',
          name: 'output',
          message: 'Output file prefix:',
          default: 'wordpress_scrape'
        },
        {
          type: 'number',
          name: 'delay',
          message: 'Delay between requests (ms):',
          default: 1000
        }
      ]);

      const scraper = new WordPressScraper({
        onlyWordPress: configAnswers.wpOnly,
        delay: configAnswers.delay
      });

      await scraper.scrapeAndExport(urls, configAnswers.output);
      
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Command: Generate sample URL file
program
  .command('generate-sample')
  .description('Generate a sample URLs file')
  .option('-o, --output <file>', 'Output file path', 'sample-urls.txt')
  .action(async (options) => {
    const sampleUrls = [
      '# WordPress Email Scraper - Sample URLs',
      '# One URL per line, comments start with #',
      '',
      'example-wp-site1.com',
      'example-wp-site2.com',
      'another-wordpress-site.org',
      'myblog.wordpress.com',
      'company-website.net'
    ];

    try {
      await fs.writeFile(options.output, sampleUrls.join('\n'));
      console.log(chalk.green(`✅ Sample URL file created: ${options.output}`));
    } catch (error) {
      console.log(chalk.red(`❌ Failed to create sample file: ${error.message}`));
    }
  });

// Command: Validate URLs
program
  .command('validate')
  .description('Validate a list of URLs')
  .option('-u, --urls <urls>', 'Comma-separated list of URLs to validate')
  .option('-f, --file <file>', 'File containing URLs to validate')
  .action(async (options) => {
    try {
      let urls = [];
      
      if (options.urls) {
        urls = options.urls.split(',').map(url => url.trim());
      } else if (options.file) {
        const scraper = new WordPressScraper();
        urls = await scraper.readUrlsFromFile(options.file);
      } else {
        console.log(chalk.red('❌ Please provide URLs using --urls or --file option'));
        process.exit(1);
      }

      const scraper = new WordPressScraper();
      const validation = await scraper.validateUrls(urls);
      
      console.log(chalk.blue('\n📋 URL Validation Results:\n'));
      console.log(`${chalk.green('Valid URLs:')} ${validation.valid.length}`);
      console.log(`${chalk.red('Invalid URLs:')} ${validation.invalid.length}`);
      
      if (validation.valid.length > 0) {
        console.log(chalk.green('\n✅ Valid URLs:'));
        validation.valid.forEach(url => console.log(chalk.gray(`   • ${url}`)));
      }
      
      if (validation.invalid.length > 0) {
        console.log(chalk.red('\n❌ Invalid URLs:'));
        validation.invalid.forEach(url => console.log(chalk.gray(`   • ${url}`)));
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Default action - show help or run interactive
program
  .action(() => {
    console.log(chalk.blue('\n🎯 WordPress Email Scraper\n'));
    console.log('Welcome! This tool helps you identify WordPress websites and extract contact information for marketing purposes.\n');
    console.log(chalk.gray('Available commands:'));
    console.log(chalk.gray('  scrape          - Scrape URLs directly'));
    console.log(chalk.gray('  interactive     - Run in interactive mode'));
    console.log(chalk.gray('  validate        - Validate URLs'));
    console.log(chalk.gray('  generate-sample - Create sample URL file'));
    console.log(chalk.gray('\nUse --help with any command for more information.'));
    console.log(chalk.gray('\nExample usage:'));
    console.log(chalk.yellow('  npm start interactive'));
    console.log(chalk.yellow('  npm start scrape --urls "site1.com,site2.com"'));
    console.log(chalk.yellow('  npm start scrape --file urls.txt --wp-only\n'));
  });

// Parse command line arguments
program.parse();

// If no command was provided, show default action
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
# WordPress Email Scraper

A powerful Node.js application designed to identify WordPress websites and extract contact information for marketing purposes. This tool helps WordPress developers and marketing professionals build targeted email lists for outreach campaigns.

## ✨ Features

- **🔍 Google Search Integration**: Automatically find WordPress websites using targeted Google searches
- **🏢 Industry-Specific Targeting**: Built-in search queries for agencies, e-commerce, blogs, and more
- **🎯 WordPress Detection**: Automatically identifies WordPress-powered websites using multiple detection methods
- **📧 Email Extraction**: Finds email addresses from various page sources (contact pages, about pages, etc.)
- **📞 Contact Information**: Extracts additional contact details including phone numbers and social media links
- **📊 Data Export**: Exports results to CSV, JSON, and plain text formats
- **⏱️ Respectful Scraping**: Built-in rate limiting and respectful request handling
- **💻 Interactive CLI**: User-friendly command-line interface with multiple operation modes
- **📈 Batch Processing**: Process multiple URLs efficiently with progress tracking
- **📋 Detailed Reporting**: Comprehensive reports with statistics and insights

## 🚀 Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd wordpress-email-scraper
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Make the CLI executable:**
   ```bash
   chmod +x index.js
   ```

## 📖 Usage

### Interactive Mode (Recommended for beginners)

```bash
npm start interactive
```

This will guide you through the prospecting process with prompts for:
- Search method (Google search, manual URLs, file, or sample sites)
- Industry targeting or keyword searches
- Configuration options
- Output preferences

### Google Search Commands

#### Find WordPress sites by industry
```bash
npm start find --industry agencies
npm start find --industry ecommerce
npm start find --industry blogs
```

#### Search by keywords
```bash
npm start find --keywords "web design,marketing"
npm start find --keywords "restaurant,food"
```

#### Quick industry searches
```bash
npm start find-agencies --max-results 50
npm start find-ecommerce --max-results 30
```

#### Advanced Google search
```bash
npm start find --queries "site:*/wp-content/,inurl:wp-admin" --max-results 100
```

### Command Line Usage

#### Scrape URLs directly
```bash
npm start scrape --urls "site1.com,site2.com,site3.com"
```

#### Scrape from file
```bash
npm start scrape --file urls.txt --output my_results
```

#### WordPress-only mode
```bash
npm start scrape --urls "site1.com,site2.com" --wp-only
```

#### Custom settings
```bash
npm start scrape --file urls.txt --delay 2000 --timeout 15000 --wp-only
```

### Utility Commands

#### Generate sample URL file
```bash
npm start generate-sample --output my-urls.txt
```

#### Validate URLs
```bash
npm start validate --urls "site1.com,site2.com"
npm start validate --file urls.txt
```

## 📁 Input Formats

### URL File Format
Create a text file with one URL per line:
```
# WordPress Email Scraper - URLs to process
# Lines starting with # are comments

example-site.com
another-wordpress-site.org
myblog.wordpress.com
company-website.net
```

### Command Line URLs
Provide comma-separated URLs:
```bash
--urls "site1.com,site2.com,site3.com"
```

## 📊 Output Formats

The scraper generates multiple output files:

### CSV Export (`wordpress_scrape.csv`)
Structured data suitable for spreadsheet applications:
- Website URL
- Email Address
- Phone Numbers
- Social Media Links
- Contact Form Detection
- WordPress Detection Status

### JSON Export (`wordpress_scrape.json`)
Complete data with metadata:
```json
{
  "exportDate": "2024-01-15T10:30:00.000Z",
  "totalSites": 10,
  "totalEmailsFound": 25,
  "data": [
    {
      "url": "example.com",
      "emails": ["contact@example.com"],
      "phones": ["+1-555-123-4567"],
      "socialMedia": {
        "facebook": "https://facebook.com/example"
      },
      "isWordPress": true,
      "indicator": "/wp-content/",
      "extractedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Email List (`wordpress_scrape_emails.txt`)
Plain text list of unique email addresses:
```
contact@site1.com
info@site2.org
hello@site3.net
```

### Detailed Report (`scraping_report.txt`)
Comprehensive analysis including:
- Summary statistics
- WordPress detection methods used
- Top-level domain distribution
- Social media presence analysis

## 🔧 Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `--urls` | Comma-separated URLs | - |
| `--file` | File containing URLs | - |
| `--output` | Output file prefix | `wordpress_scrape` |
| `--wp-only` | Only process WordPress sites | `false` |
| `--delay` | Delay between requests (ms) | `1000` |
| `--timeout` | Request timeout (ms) | `10000` |

## 🔍 WordPress Detection Methods

The tool uses multiple methods to identify WordPress sites:

1. **URL Patterns**: `/wp-content/`, `/wp-includes/`, `/wp-admin/`
2. **Meta Generator Tags**: WordPress version information
3. **REST API Detection**: WordPress REST API endpoints
4. **Asset Detection**: WordPress-specific CSS/JS files
5. **CSS Classes**: WordPress-specific body classes
6. **Plugin Signatures**: Common WordPress plugins

## 🌐 Email Extraction Sources

Emails are extracted from multiple sources:

- **Contact Pages**: `/contact`, `/contact-us`, `/about`
- **Mailto Links**: Direct email links
- **Page Content**: Text content analysis
- **Data Attributes**: HTML data attributes
- **Obfuscated Emails**: Common obfuscation patterns

## 📞 Additional Contact Information

Beyond emails, the tool also extracts:

- **Phone Numbers**: Various international formats
- **Social Media**: Facebook, Twitter, LinkedIn, Instagram
- **Contact Forms**: Detection of contact form presence

## ⚖️ Ethical Usage

This tool is designed for legitimate marketing purposes. Please ensure you:

- ✅ Comply with applicable laws (GDPR, CAN-SPAM, etc.)
- ✅ Respect robots.txt and website terms of service
- ✅ Use extracted emails responsibly
- ✅ Provide clear opt-out mechanisms
- ✅ Only contact relevant prospects

## 🚫 Rate Limiting & Respectful Scraping

The tool includes built-in features for respectful scraping:

- **Request Delays**: Configurable delays between requests
- **Timeout Handling**: Prevents hanging requests
- **Error Handling**: Graceful handling of failed requests
- **User-Agent**: Identifies as a legitimate browser
- **Retry Logic**: Limited retry attempts for failed requests

## 🛠️ Development

### Project Structure
```
wordpress-email-scraper/
├── src/
│   ├── wordpressDetector.js    # WordPress detection logic
│   ├── emailExtractor.js       # Email extraction functionality
│   ├── dataExporter.js         # Data export utilities
│   └── wordpressScraper.js     # Main scraper orchestration
├── output/                     # Generated output files
├── index.js                    # CLI interface
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

### Adding New Detection Methods

To add new WordPress detection methods, modify `src/wordpressDetector.js`:

```javascript
// Add to indicators array
this.indicators = [
  // ... existing indicators
  'your-new-indicator'
];
```

### Extending Email Extraction

To extract from additional page types, modify `src/emailExtractor.js`:

```javascript
// Add to commonPages array
this.commonPages = [
  // ... existing pages
  '/your-new-page'
];
```

## 🐛 Troubleshooting

### Common Issues

**"Request timeout" errors:**
- Increase timeout value: `--timeout 20000`
- Check internet connection
- Verify target websites are accessible

**"Invalid URL" warnings:**
- Ensure URLs don't include protocols (http/https)
- Check for typos in domain names
- Use the validate command to check URLs

**Empty results:**
- Try increasing delay: `--delay 2000`
- Check if websites have contact information
- Verify WordPress detection is working

**Memory issues with large lists:**
- Process URLs in smaller batches
- Increase Node.js memory limit: `node --max-old-space-size=4096 index.js`

## 📋 Example Workflows

### 1. Quick Test with Sample Sites
```bash
npm start interactive
# Choose "Use sample WordPress sites"
# Review results in output/ directory
```

### 2. Process Company List
```bash
# Create companies.txt with target websites
npm start scrape --file companies.txt --wp-only --output company_contacts
```

### 3. Validate Before Scraping
```bash
npm start validate --file target-sites.txt
npm start scrape --file target-sites.txt --delay 1500
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the generated error messages
3. Ensure all dependencies are installed correctly

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This tool is provided for educational and legitimate marketing purposes only. Users are responsible for ensuring compliance with all applicable laws and website terms of service. The developers are not responsible for any misuse of this tool.
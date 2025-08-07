# WordPress Email Scraper - Usage Examples

This document provides practical examples of how to use the WordPress Email Scraper effectively.

## 🚀 Quick Start Examples

### 1. Test Run with Interactive Mode

The easiest way to get started:

```bash
npm start interactive
```

Select "Use sample WordPress sites" to test with known WordPress websites.

### 2. Scrape a Single Website

```bash
npm start scrape --urls "wordpress.org"
```

### 3. Scrape Multiple Websites

```bash
npm start scrape --urls "wordpress.org,wpengine.com,kinsta.com"
```

## 📁 File-Based Processing

### Create a URL List File

Create `my-targets.txt`:
```
# My WordPress marketing targets
# Updated: 2024-01-15

example-agency.com
wordpress-developer.net
web-design-company.org
freelancer-portfolio.com
```

### Process the File

```bash
npm start scrape --file my-targets.txt --output marketing_list
```

## 🎯 Advanced Usage Scenarios

### 1. WordPress Development Agency Outreach

Create `agencies.txt`:
```
# WordPress development agencies
wpmudev.com
elegant-themes.com
themeforest.net
wpbeginner.com
```

Run with WordPress-only filtering:
```bash
npm start scrape --file agencies.txt --wp-only --output wp_agencies --delay 2000
```

### 2. Local Business WordPress Sites

For targeting local businesses using WordPress:

```bash
npm start scrape --urls "localbusiness1.com,restaurant.com,lawfirm.net" --delay 1500 --output local_businesses
```

### 3. E-commerce WordPress Sites

Target WooCommerce and WordPress e-commerce sites:

```bash
npm start scrape --file ecommerce-sites.txt --wp-only --timeout 15000 --output ecommerce_contacts
```

## 🔧 Configuration Examples

### High-Volume Processing

For processing large lists (100+ sites):

```bash
npm start scrape --file large-list.txt --delay 2000 --timeout 20000 --output bulk_scrape
```

### Conservative Scraping

For being extra respectful to target servers:

```bash
npm start scrape --file targets.txt --delay 3000 --timeout 15000 --wp-only
```

## 📊 Output Examples

### Sample CSV Output

After running the scraper, you'll get a CSV file like:

| Website URL | Email Address | Phone Numbers | Facebook | WordPress Detected | Detection Method |
|-------------|---------------|---------------|----------|-------------------|------------------|
| example.com | info@example.com | +1-555-123-4567 | https://facebook.com/example | Yes | /wp-content/ |
| site2.org | contact@site2.org | | | Yes | WordPress REST API |

### Sample JSON Output

```json
{
  "exportDate": "2024-01-15T10:30:00.000Z",
  "totalSites": 5,
  "totalEmailsFound": 8,
  "data": [
    {
      "url": "wordpress-agency.com",
      "emails": ["hello@wordpress-agency.com", "contact@wordpress-agency.com"],
      "phones": ["+1-555-123-4567"],
      "socialMedia": {
        "facebook": "https://facebook.com/wpagency",
        "twitter": "https://twitter.com/wpagency"
      },
      "contactForms": [
        {
          "url": "https://wordpress-agency.com/contact",
          "action": "/contact-form",
          "method": "POST"
        }
      ],
      "isWordPress": true,
      "indicator": "/wp-content/",
      "confidence": "high",
      "extractedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## 📈 Marketing Campaign Examples

### 1. WordPress Plugin Developer Outreach

Target WordPress sites that might need custom plugins:

```bash
# Create plugin-prospects.txt with WordPress sites in your niche
npm start scrape --file plugin-prospects.txt --wp-only --output plugin_leads
```

Use the extracted emails to reach out with your plugin development services.

### 2. WordPress Theme Designer Marketing

Target sites with outdated themes:

```bash
npm start scrape --urls "outdated-theme-site1.com,needs-redesign.net" --output theme_prospects
```

### 3. WordPress Maintenance Service

Target WordPress sites for maintenance services:

```bash
npm start scrape --file maintenance-prospects.txt --wp-only --delay 2000 --output maintenance_leads
```

## 🔍 Validation and Quality Control

### Pre-Scraping Validation

Always validate your URL list first:

```bash
npm start validate --file my-targets.txt
```

Fix any invalid URLs before scraping.

### Test Run

Test with a small subset first:

```bash
# Create test-urls.txt with 3-5 URLs
npm start scrape --file test-urls.txt --output test_run
```

Review the results before processing larger lists.

## 📋 Workflow Templates

### Complete Marketing Research Workflow

1. **Prepare URL list:**
   ```bash
   # Create your target list in targets.txt
   npm start validate --file targets.txt
   ```

2. **Test run:**
   ```bash
   npm start scrape --urls "test-site1.com,test-site2.com" --output test
   ```

3. **Full scrape:**
   ```bash
   npm start scrape --file targets.txt --wp-only --delay 1500 --output final_results
   ```

4. **Review outputs:**
   - Check `output/final_results.csv` for spreadsheet analysis
   - Use `output/final_results_emails.txt` for email marketing tools
   - Review `output/scraping_report.txt` for insights

### Competitor Analysis Workflow

1. **Identify competitors:**
   ```bash
   # Create competitors.txt with competitor websites
   ```

2. **Analyze their WordPress usage:**
   ```bash
   npm start scrape --file competitors.txt --delay 2000 --output competitor_analysis
   ```

3. **Review the report for insights about WordPress adoption in your industry**

## ⚠️ Best Practices

### Respectful Scraping

- Use delays of at least 1000ms between requests
- Process during off-peak hours
- Respect robots.txt files
- Don't overwhelm small websites

### Data Quality

- Validate URLs before scraping
- Filter out generic email addresses
- Verify email addresses before marketing campaigns
- Keep your prospect lists updated

### Legal Compliance

- Check GDPR requirements for EU contacts
- Follow CAN-SPAM Act for US contacts
- Provide clear opt-out mechanisms
- Only contact relevant prospects

## 🛠️ Troubleshooting Examples

### Timeout Issues

If you're getting timeouts:

```bash
npm start scrape --file targets.txt --timeout 20000 --delay 2000
```

### Memory Issues with Large Lists

For very large lists (500+ URLs):

```bash
# Split large lists into smaller files and process separately
split -l 100 large-list.txt batch_
npm start scrape --file batch_aa --output batch_1
npm start scrape --file batch_ab --output batch_2
```

### Rate Limiting

If you're being rate limited:

```bash
npm start scrape --file targets.txt --delay 5000 --timeout 25000
```

## 📞 Support Examples

For common issues, refer to these examples:

1. **No emails found:** Check if the websites actually have contact information publicly available
2. **All sites showing as non-WordPress:** Verify your internet connection and try with known WordPress sites
3. **Process hanging:** Use smaller batches and increase timeouts

Remember: This tool is for legitimate marketing purposes only. Always respect website terms of service and applicable laws.
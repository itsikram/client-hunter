const fs = require('fs-extra');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class DataExporter {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'output');
    this.ensureOutputDirectory();
  }

  async ensureOutputDirectory() {
    await fs.ensureDir(this.outputDir);
  }

  generateFileName(prefix, extension) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}_${timestamp}.${extension}`;
  }

  async exportToJSON(data, filename = null) {
    try {
      const fileName = filename || this.generateFileName('wordpress_contacts', 'json');
      const filePath = path.join(this.outputDir, fileName);
      
      const exportData = {
        exportDate: new Date().toISOString(),
        totalSites: data.length,
        totalEmailsFound: data.reduce((total, site) => total + site.emails.length, 0),
        data: data
      };

      await fs.writeJSON(filePath, exportData, { spaces: 2 });
      return filePath;
    } catch (error) {
      throw new Error(`Failed to export to JSON: ${error.message}`);
    }
  }

  async exportToCSV(data, filename = null) {
    try {
      const fileName = filename || this.generateFileName('wordpress_contacts', 'csv');
      const filePath = path.join(this.outputDir, fileName);

      // Flatten data for CSV export
      const csvData = [];
      
      data.forEach(site => {
        if (site.emails && site.emails.length > 0) {
          site.emails.forEach(email => {
            csvData.push({
              url: site.url,
              email: email,
              phones: site.phones ? site.phones.join('; ') : '',
              facebook: site.socialMedia?.facebook || '',
              twitter: site.socialMedia?.twitter || '',
              linkedin: site.socialMedia?.linkedin || '',
              instagram: site.socialMedia?.instagram || '',
              hasContactForm: site.contactForms && site.contactForms.length > 0 ? 'Yes' : 'No',
              wordpressDetected: site.isWordPress ? 'Yes' : 'No',
              detectionMethod: site.indicator || '',
              extractedAt: site.extractedAt || ''
            });
          });
        } else {
          // Include sites without emails for completeness
          csvData.push({
            url: site.url,
            email: '',
            phones: site.phones ? site.phones.join('; ') : '',
            facebook: site.socialMedia?.facebook || '',
            twitter: site.socialMedia?.twitter || '',
            linkedin: site.socialMedia?.linkedin || '',
            instagram: site.socialMedia?.instagram || '',
            hasContactForm: site.contactForms && site.contactForms.length > 0 ? 'Yes' : 'No',
            wordpressDetected: site.isWordPress ? 'Yes' : 'No',
            detectionMethod: site.indicator || '',
            extractedAt: site.extractedAt || ''
          });
        }
      });

      const csvWriter = createCsvWriter({
        path: filePath,
        header: [
          { id: 'url', title: 'Website URL' },
          { id: 'email', title: 'Email Address' },
          { id: 'phones', title: 'Phone Numbers' },
          { id: 'facebook', title: 'Facebook' },
          { id: 'twitter', title: 'Twitter' },
          { id: 'linkedin', title: 'LinkedIn' },
          { id: 'instagram', title: 'Instagram' },
          { id: 'hasContactForm', title: 'Has Contact Form' },
          { id: 'wordpressDetected', title: 'WordPress Detected' },
          { id: 'detectionMethod', title: 'Detection Method' },
          { id: 'extractedAt', title: 'Extracted At' }
        ]
      });

      await csvWriter.writeRecords(csvData);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to export to CSV: ${error.message}`);
    }
  }

  async exportEmailList(data, filename = null) {
    try {
      const fileName = filename || this.generateFileName('email_list', 'txt');
      const filePath = path.join(this.outputDir, fileName);

      const emails = new Set();
      data.forEach(site => {
        if (site.emails) {
          site.emails.forEach(email => emails.add(email));
        }
      });

      const emailList = Array.from(emails).sort().join('\n');
      await fs.writeFile(filePath, emailList);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to export email list: ${error.message}`);
    }
  }

  async exportReport(data) {
    try {
      const fileName = this.generateFileName('scraping_report', 'txt');
      const filePath = path.join(this.outputDir, fileName);

      const totalSites = data.length;
      const wordpressSites = data.filter(site => site.isWordPress).length;
      const sitesWithEmails = data.filter(site => site.emails && site.emails.length > 0).length;
      const totalEmails = data.reduce((total, site) => total + (site.emails ? site.emails.length : 0), 0);
      const uniqueEmails = new Set();
      
      data.forEach(site => {
        if (site.emails) {
          site.emails.forEach(email => uniqueEmails.add(email));
        }
      });

      const report = `
WordPress Email Scraping Report
===============================

Scan Date: ${new Date().toISOString()}

Summary:
--------
Total sites processed: ${totalSites}
WordPress sites detected: ${wordpressSites} (${((wordpressSites / totalSites) * 100).toFixed(1)}%)
Sites with emails found: ${sitesWithEmails} (${((sitesWithEmails / totalSites) * 100).toFixed(1)}%)
Total email addresses found: ${totalEmails}
Unique email addresses: ${uniqueEmails.size}

WordPress Detection Methods:
----------------------------
${this.getDetectionMethodStats(data)}

Top Level Domains:
------------------
${this.getTLDStats(data)}

Sites with Contact Forms:
-------------------------
${data.filter(site => site.contactForms && site.contactForms.length > 0).length} sites have contact forms

Social Media Presence:
---------------------
Facebook: ${data.filter(site => site.socialMedia?.facebook).length} sites
Twitter: ${data.filter(site => site.socialMedia?.twitter).length} sites
LinkedIn: ${data.filter(site => site.socialMedia?.linkedin).length} sites
Instagram: ${data.filter(site => site.socialMedia?.instagram).length} sites
`;

      await fs.writeFile(filePath, report);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to export report: ${error.message}`);
    }
  }

  getDetectionMethodStats(data) {
    const methods = {};
    data.filter(site => site.isWordPress).forEach(site => {
      const method = site.indicator || 'Unknown';
      methods[method] = (methods[method] || 0) + 1;
    });

    return Object.entries(methods)
      .sort((a, b) => b[1] - a[1])
      .map(([method, count]) => `${method}: ${count}`)
      .join('\n');
  }

  getTLDStats(data) {
    const tlds = {};
    data.forEach(site => {
      try {
        const url = new URL(site.url.startsWith('http') ? site.url : `https://${site.url}`);
        const hostname = url.hostname;
        const tld = hostname.split('.').pop();
        tlds[tld] = (tlds[tld] || 0) + 1;
      } catch (error) {
        // Invalid URL, skip
      }
    });

    return Object.entries(tlds)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tld, count]) => `.${tld}: ${count}`)
      .join('\n');
  }

  async exportAll(data, prefix = 'wordpress_scrape') {
    const results = {};
    
    try {
      results.json = await this.exportToJSON(data, `${prefix}.json`);
      results.csv = await this.exportToCSV(data, `${prefix}.csv`);
      results.emailList = await this.exportEmailList(data, `${prefix}_emails.txt`);
      results.report = await this.exportReport(data);
      
      return results;
    } catch (error) {
      throw new Error(`Failed to export data: ${error.message}`);
    }
  }
}

module.exports = DataExporter;
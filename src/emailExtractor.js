const axios = require('axios');
const cheerio = require('cheerio');
const validator = require('validator');

class EmailExtractor {
  constructor() {
    this.emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    this.commonPages = [
      '',
      '/contact',
      '/contact-us',
      '/about',
      '/about-us',
      '/team',
      '/staff',
      '/privacy',
      '/privacy-policy',
      '/terms',
      '/legal',
      '/imprint',
      '/impressum'
    ];
  }

  extractEmailsFromText(text) {
    const emails = text.match(this.emailRegex) || [];
    return [...new Set(emails.filter(email => validator.isEmail(email)))];
  }

  async extractEmailsFromPage(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const emails = new Set();

      // Extract emails from page text
      const pageText = $.text();
      const textEmails = this.extractEmailsFromText(pageText);
      textEmails.forEach(email => emails.add(email));

      // Extract emails from mailto links
      $('a[href^="mailto:"]').each((i, element) => {
        const href = $(element).attr('href');
        const email = href.replace('mailto:', '').split('?')[0];
        if (validator.isEmail(email)) {
          emails.add(email);
        }
      });

      // Extract emails from data attributes
      $('[data-email]').each((i, element) => {
        const email = $(element).attr('data-email');
        if (validator.isEmail(email)) {
          emails.add(email);
        }
      });

      // Look for obfuscated emails (common patterns)
      const obfuscatedEmails = pageText.match(/[a-zA-Z0-9._%+-]+\s*\[\s*at\s*\]\s*[a-zA-Z0-9.-]+\s*\[\s*dot\s*\]\s*[a-zA-Z]{2,}/g) || [];
      obfuscatedEmails.forEach(obfuscated => {
        const email = obfuscated
          .replace(/\s*\[\s*at\s*\]\s*/g, '@')
          .replace(/\s*\[\s*dot\s*\]\s*/g, '.')
          .replace(/\s/g, '');
        if (validator.isEmail(email)) {
          emails.add(email);
        }
      });

      return Array.from(emails);
    } catch (error) {
      console.warn(`Failed to extract emails from ${url}: ${error.message}`);
      return [];
    }
  }

  async extractContactInfo(baseUrl) {
    const contactInfo = {
      emails: new Set(),
      phones: new Set(),
      socialMedia: {},
      contactForms: []
    };

    // Ensure URL has protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }

    const urlsToCheck = this.commonPages.map(page => `${baseUrl}${page}`);

    for (const url of urlsToCheck) {
      try {
        console.log(`Extracting from: ${url}`);
        
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const $ = cheerio.load(response.data);

        // Extract emails
        const emails = await this.extractEmailsFromPage(url);
        emails.forEach(email => contactInfo.emails.add(email));

        // Extract phone numbers
        const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
        const pageText = $.text();
        const phones = pageText.match(phoneRegex) || [];
        phones.forEach(phone => {
          const cleanPhone = phone.replace(/[^\d+]/g, '');
          if (cleanPhone.length >= 7) {
            contactInfo.phones.add(phone.trim());
          }
        });

        // Extract social media links
        $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="instagram.com"]').each((i, element) => {
          const href = $(element).attr('href');
          const platform = href.includes('facebook') ? 'facebook' :
                          href.includes('twitter') ? 'twitter' :
                          href.includes('linkedin') ? 'linkedin' :
                          href.includes('instagram') ? 'instagram' : 'other';
          contactInfo.socialMedia[platform] = href;
        });

        // Look for contact forms
        $('form').each((i, element) => {
          const form = $(element);
          const action = form.attr('action') || '';
          const hasEmailField = form.find('input[type="email"], input[name*="email"]').length > 0;
          const hasMessageField = form.find('textarea, input[name*="message"]').length > 0;
          
          if (hasEmailField && hasMessageField) {
            contactInfo.contactForms.push({
              url: url,
              action: action,
              method: form.attr('method') || 'POST'
            });
          }
        });

        // Add delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.warn(`Failed to process ${url}: ${error.message}`);
        continue;
      }
    }

    return {
      emails: Array.from(contactInfo.emails),
      phones: Array.from(contactInfo.phones),
      socialMedia: contactInfo.socialMedia,
      contactForms: contactInfo.contactForms
    };
  }

  filterEmails(emails) {
    // Filter out common non-personal emails
    const excludePatterns = [
      /^no-?reply/i,
      /^donotreply/i,
      /^noreply/i,
      /^support/i,
      /^help/i,
      /^info@example/i,
      /^test@/i,
      /^admin@example/i,
      /^example@/i,
      /^@example/i
    ];

    return emails.filter(email => {
      return !excludePatterns.some(pattern => pattern.test(email));
    });
  }

  async extractFromWordPressSite(url) {
    try {
      const contactInfo = await this.extractContactInfo(url);
      const filteredEmails = this.filterEmails(contactInfo.emails);
      
      return {
        url: url,
        emails: filteredEmails,
        phones: contactInfo.phones,
        socialMedia: contactInfo.socialMedia,
        contactForms: contactInfo.contactForms,
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to extract contact info from ${url}: ${error.message}`);
    }
  }
}

module.exports = EmailExtractor;
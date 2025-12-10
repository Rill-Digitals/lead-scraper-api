// Automated Lead Scraper API
// Scrapes websites automatically and stores leads with industry/location metadata

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database (use MongoDB/PostgreSQL in production)
let leadsDatabase = [];

// Scraping targets - websites to scrape for leads
const scrapingTargets = [
  // Add your target websites here
  { url: 'https://example.com/companies', industry: 'Technology', location: 'USA' },
  { url: 'https://business-directory.com', industry: 'Various', location: 'Various' }
];

// ==================== SCRAPING FUNCTIONS ====================

// Extract emails from HTML
function extractEmails(html) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = html.match(emailRegex) || [];
  return [...new Set(emails)].filter(email => 
    !email.includes('example.com') && 
    !email.includes('test.com') &&
    !email.includes('placeholder')
  );
}

// Extract phone numbers
function extractPhones(html) {
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = html.match(phoneRegex) || [];
  return [...new Set(phones)];
}

// Extract company names using common patterns
function extractCompanyNames(html) {
  const $ = cheerio.load(html);
  const companies = [];
  
  // Look for common company name patterns
  $('h1, h2, h3, .company-name, .business-name, [itemprop="name"]').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 100 && text.length > 3) {
      companies.push(text);
    }
  });
  
  return [...new Set(companies)].slice(0, 10);
}

// Scrape a single URL
async function scrapeURL(url, industry, location) {
  try {
    console.log(`Scraping ${url}...`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    });
    
    const html = response.data;
    const emails = extractEmails(html);
    const phones = extractPhones(html);
    const companies = extractCompanyNames(html);
    
    const leads = [];
    
    emails.forEach((email, index) => {
      const lead = {
        id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: email,
        name: '', // Can be enhanced with ML/AI to extract names
        company: companies[index] || '',
        phone: phones[index] || '',
        industry: industry,
        location: location,
        source: url,
        scrapedAt: new Date().toISOString(),
        verified: false
      };
      leads.push(lead);
    });
    
    return leads;
    
  } catch (error) {
    console.error(`Error scraping ${url}:`, error.message);
    return [];
  }
}

// Automated scraping job (runs periodically)
async function runScrapingJob() {
  console.log('Starting automated scraping job...');
  
  for (const target of scrapingTargets) {
    const leads = await scrapeURL(target.url, target.industry, target.location);
    
    // Add to database, avoiding duplicates
    leads.forEach(lead => {
      const exists = leadsDatabase.find(l => l.email === lead.email);
      if (!exists) {
        leadsDatabase.push(lead);
      }
    });
    
    // Wait between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`Scraping complete. Total leads: ${leadsDatabase.length}`);
}

// Schedule scraping job (every 6 hours)
setInterval(runScrapingJob, 6 * 60 * 60 * 1000);

// Run once on startup
setTimeout(runScrapingJob, 5000);

// ==================== API ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    totalLeads: leadsDatabase.length,
    timestamp: new Date().toISOString() 
  });
});

// Search leads by industry and location
app.post('/api/leads/search', (req, res) => {
  try {
    const { industry, location, leadCount } = req.body;
    
    if (!industry || !location) {
      return res.status(400).json({
        success: false,
        error: 'Industry and location are required'
      });
    }
    
    // Filter leads by industry and location
    let filteredLeads = leadsDatabase.filter(lead => {
      const industryMatch = industry === 'All' || 
                           lead.industry.toLowerCase().includes(industry.toLowerCase());
      const locationMatch = lead.location.toLowerCase().includes(location.toLowerCase());
      return industryMatch && locationMatch;
    });
    
    // Limit results
    const limit = parseInt(leadCount) || 50;
    filteredLeads = filteredLeads.slice(0, limit);
    
    res.json({
      success: true,
      count: filteredLeads.length,
      data: filteredLeads
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all leads (admin)
app.get('/api/leads', (req, res) => {
  res.json({
    success: true,
    count: leadsDatabase.length,
    data: leadsDatabase
  });
});

// Get leads statistics
app.get('/api/stats', (req, res) => {
  const stats = {
    total: leadsDatabase.length,
    byIndustry: {},
    byLocation: {},
    verified: leadsDatabase.filter(l => l.verified).length,
    recent: leadsDatabase.filter(l => {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return new Date(l.scrapedAt) > dayAgo;
    }).length
  };
  
  // Count by industry
  leadsDatabase.forEach(lead => {
    stats.byIndustry[lead.industry] = (stats.byIndustry[lead.industry] || 0) + 1;
    stats.byLocation[lead.location] = (stats.byLocation[lead.location] || 0) + 1;
  });
  
  res.json({
    success: true,
    data: stats
  });
});

// Manual scraping trigger
app.post('/api/scrape/trigger', async (req, res) => {
  try {
    const { url, industry, location } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    const leads = await scrapeURL(
      url, 
      industry || 'Unknown', 
      location || 'Unknown'
    );
    
    // Add to database
    leads.forEach(lead => {
      const exists = leadsDatabase.find(l => l.email === lead.email);
      if (!exists) {
        leadsDatabase.push(lead);
      }
    });
    
    res.json({
      success: true,
      scraped: leads.length,
      data: leads
    });
    
  } catch (error) {
    console.error('Manual scrape error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk scrape multiple URLs
app.post('/api/scrape/bulk', async (req, res) => {
  try {
    const { targets } = req.body; // Array of {url, industry, location}
    
    if (!Array.isArray(targets)) {
      return res.status(400).json({
        success: false,
        error: 'Targets must be an array'
      });
    }
    
    let totalScraped = 0;
    
    for (const target of targets) {
      const leads = await scrapeURL(target.url, target.industry, target.location);
      
      leads.forEach(lead => {
        const exists = leadsDatabase.find(l => l.email === lead.email);
        if (!exists) {
          leadsDatabase.push(lead);
          totalScraped++;
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    res.json({
      success: true,
      scraped: totalScraped,
      totalLeads: leadsDatabase.length
    });
    
  } catch (error) {
    console.error('Bulk scrape error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add scraping target
app.post('/api/scrape/targets', (req, res) => {
  const { url, industry, location } = req.body;
  
  if (!url || !industry || !location) {
    return res.status(400).json({
      success: false,
      error: 'URL, industry, and location are required'
    });
  }
  
  scrapingTargets.push({ url, industry, location });
  
  res.json({
    success: true,
    message: 'Target added',
    targets: scrapingTargets
  });
});

// Get scraping targets
app.get('/api/scrape/targets', (req, res) => {
  res.json({
    success: true,
    data: scrapingTargets
  });
});

// Export leads
app.get('/api/leads/export/csv', (req, res) => {
  if (leadsDatabase.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No leads to export'
    });
  }
  
  const headers = ['Email', 'Name', 'Company', 'Phone', 'Industry', 'Location', 'Source', 'Scraped At'];
  const rows = leadsDatabase.map(lead => [
    lead.email,
    lead.name || '',
    lead.company || '',
    lead.phone || '',
    lead.industry,
    lead.location,
    lead.source,
    lead.scrapedAt
  ].map(val => `"${val}"`).join(','));
  
  const csv = [headers.join(','), ...rows].join('\n');
  
  res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

// Delete duplicate leads
app.post('/api/leads/deduplicate', (req, res) => {
  const uniqueEmails = new Set();
  const deduplicatedLeads = [];
  
  leadsDatabase.forEach(lead => {
    if (!uniqueEmails.has(lead.email)) {
      uniqueEmails.add(lead.email);
      deduplicatedLeads.push(lead);
    }
  });
  
  const removed = leadsDatabase.length - deduplicatedLeads.length;
  leadsDatabase = deduplicatedLeads;
  
  res.json({
    success: true,
    removed: removed,
    remaining: leadsDatabase.length
  });
});

// Clear all leads (admin)
app.delete('/api/leads/clear', (req, res) => {
  const count = leadsDatabase.length;
  leadsDatabase = [];
  
  res.json({
    success: true,
    message: `Cleared ${count} leads`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Lead Scraper API running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
  console.log(`🔍 Automated scraping will run every 6 hours`);
});

module.exports = app;
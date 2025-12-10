// Automated Lead Scraper API - Google Sheets Version
// Uses n8n + Google Sheets instead of database

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// n8n Webhook URLs (set these in Render environment variables)
const N8N_SAVE_LEAD_WEBHOOK = process.env.N8N_SAVE_LEAD_WEBHOOK || 'https://n8n.rilldigitals.com/webhook/save-leads';
const N8N_SEARCH_WEBHOOK = process.env.N8N_SEARCH_WEBHOOK || 'https://n8n.rilldigitals.com/webhook/search-leads';

// ==================== SCRAPING TARGETS ====================
// Comprehensive list of free business directories and sources

const scrapingTargets = [
  // ============================================
  // YELLOWPAGES.COM - Multiple Industries
  // ============================================
  {
    url: 'https://www.yellowpages.com/search?search_terms=restaurants&geo_location_terms=New+York',
    industry: 'Hospitality',
    location: 'New York',
    source: 'YellowPages'
  },
  {
    url: 'https://www.yellowpages.com/search?search_terms=technology+companies&geo_location_terms=San+Francisco',
    industry: 'Technology',
    location: 'San Francisco',
    source: 'YellowPages'
  },
  {
    url: 'https://www.yellowpages.com/search?search_terms=healthcare&geo_location_terms=Los+Angeles',
    industry: 'Healthcare',
    location: 'Los Angeles',
    source: 'YellowPages'
  },
  {
    url: 'https://www.yellowpages.com/search?search_terms=real+estate&geo_location_terms=Miami',
    industry: 'Real Estate',
    location: 'Miami',
    source: 'YellowPages'
  },
  {
    url: 'https://www.yellowpages.com/search?search_terms=manufacturing&geo_location_terms=Chicago',
    industry: 'Manufacturing',
    location: 'Chicago',
    source: 'YellowPages'
  },
  {
    url: 'https://www.yellowpages.com/search?search_terms=marketing+agencies&geo_location_terms=Austin',
    industry: 'Marketing',
    location: 'Austin',
    source: 'YellowPages'
  },
  {
    url: 'https://www.yellowpages.com/search?search_terms=consulting&geo_location_terms=Boston',
    industry: 'Consulting',
    location: 'Boston',
    source: 'YellowPages'
  },
  {
    url: 'https://www.yellowpages.com/search?search_terms=retail+stores&geo_location_terms=Seattle',
    industry: 'Retail',
    location: 'Seattle',
    source: 'YellowPages'
  },
  {
    url: 'https://www.yellowpages.com/search?search_terms=construction&geo_location_terms=Dallas',
    industry: 'Construction',
    location: 'Dallas',
    source: 'YellowPages'
  },
  {
    url: 'https://www.yellowpages.com/search?search_terms=law+firms&geo_location_terms=Washington+DC',
    industry: 'Legal',
    location: 'Washington DC',
    source: 'YellowPages'
  },

  // ============================================
  // YELP - Multiple Industries & Locations
  // ============================================
  {
    url: 'https://www.yelp.com/search?find_desc=restaurants&find_loc=New+York,+NY',
    industry: 'Hospitality',
    location: 'New York',
    source: 'Yelp'
  },
  {
    url: 'https://www.yelp.com/search?find_desc=contractors&find_loc=Los+Angeles,+CA',
    industry: 'Construction',
    location: 'Los Angeles',
    source: 'Yelp'
  },
  {
    url: 'https://www.yelp.com/search?find_desc=healthcare&find_loc=Houston,+TX',
    industry: 'Healthcare',
    location: 'Houston',
    source: 'Yelp'
  },
  {
    url: 'https://www.yelp.com/search?find_desc=retail&find_loc=Chicago,+IL',
    industry: 'Retail',
    location: 'Chicago',
    source: 'Yelp'
  },
  {
    url: 'https://www.yelp.com/search?find_desc=real+estate&find_loc=Miami,+FL',
    industry: 'Real Estate',
    location: 'Miami',
    source: 'Yelp'
  },
  {
    url: 'https://www.yelp.com/search?find_desc=marketing&find_loc=San+Francisco,+CA',
    industry: 'Marketing',
    location: 'San Francisco',
    source: 'Yelp'
  },
  {
    url: 'https://www.yelp.com/search?find_desc=consulting&find_loc=Boston,+MA',
    industry: 'Consulting',
    location: 'Boston',
    source: 'Yelp'
  },
  {
    url: 'https://www.yelp.com/search?find_desc=transportation&find_loc=Atlanta,+GA',
    industry: 'Transportation',
    location: 'Atlanta',
    source: 'Yelp'
  },

  // ============================================
  // LINKEDIN COMPANY PAGES
  // Note: LinkedIn has strict scraping policies. Use API instead.
  // ============================================
  {
    url: 'https://www.linkedin.com/search/results/companies/?keywords=technology&location=San%20Francisco',
    industry: 'Technology',
    location: 'San Francisco',
    source: 'LinkedIn',
    requiresAuth: true
  },
  {
    url: 'https://www.linkedin.com/search/results/companies/?keywords=healthcare&location=Boston',
    industry: 'Healthcare',
    location: 'Boston',
    source: 'LinkedIn',
    requiresAuth: true
  },
  {
    url: 'https://www.linkedin.com/search/results/companies/?keywords=finance&location=New%20York',
    industry: 'Finance',
    location: 'New York',
    source: 'LinkedIn',
    requiresAuth: true
  },

  // ============================================
  // CRUNCHBASE - Startups & Tech
  // Note: Free tier has limited access
  // ============================================
  {
    url: 'https://www.crunchbase.com/discover/organization.companies/field/categories/technology',
    industry: 'Technology',
    location: 'USA',
    source: 'Crunchbase'
  },
  {
    url: 'https://www.crunchbase.com/discover/organization.companies/field/categories/healthcare',
    industry: 'Healthcare',
    location: 'USA',
    source: 'Crunchbase'
  },
  {
    url: 'https://www.crunchbase.com/discover/organization.companies/field/categories/fintech',
    industry: 'Finance',
    location: 'USA',
    source: 'Crunchbase'
  },
  {
    url: 'https://www.crunchbase.com/discover/organization.companies/field/categories/e-commerce',
    industry: 'E-commerce',
    location: 'USA',
    source: 'Crunchbase'
  },

  // ============================================
  // ANGELLIST - Startups
  // ============================================
  {
    url: 'https://angel.co/companies?locations=2-San%20Francisco',
    industry: 'Technology',
    location: 'San Francisco',
    source: 'AngelList'
  },
  {
    url: 'https://angel.co/companies?locations=1-New%20York',
    industry: 'Technology',
    location: 'New York',
    source: 'AngelList'
  },

  // ============================================
  // PRODUCT HUNT - Tech Products & Startups
  // ============================================
  {
    url: 'https://www.producthunt.com/topics/developer-tools',
    industry: 'Technology',
    location: 'Various',
    source: 'Product Hunt'
  },
  {
    url: 'https://www.producthunt.com/topics/saas',
    industry: 'Technology',
    location: 'Various',
    source: 'Product Hunt'
  },
  {
    url: 'https://www.producthunt.com/topics/marketing',
    industry: 'Marketing',
    location: 'Various',
    source: 'Product Hunt'
  },

  // ============================================
  // INDUSTRY-SPECIFIC DIRECTORIES
  // ============================================
  
  // Healthcare
  {
    url: 'https://www.healthgrades.com/find-a-doctor',
    industry: 'Healthcare',
    location: 'Various',
    source: 'HealthGrades'
  },

  // Legal
  {
    url: 'https://www.lawyers.com/find-a-lawyer/',
    industry: 'Legal',
    location: 'Various',
    source: 'Lawyers.com'
  },
  {
    url: 'https://www.martindale.com',
    industry: 'Legal',
    location: 'USA',
    source: 'Martindale'
  },

  // Real Estate
  {
    url: 'https://www.realtor.com/realestateagents',
    industry: 'Real Estate',
    location: 'Various',
    source: 'Realtor.com'
  },
  {
    url: 'https://www.zillow.com/professionals/',
    industry: 'Real Estate',
    location: 'Various',
    source: 'Zillow'
  },

  // Construction
  {
    url: 'https://www.houzz.com/professionals',
    industry: 'Construction',
    location: 'Various',
    source: 'Houzz'
  },
  {
    url: 'https://www.homeadvisor.com/c.Contractors',
    industry: 'Construction',
    location: 'Various',
    source: 'HomeAdvisor'
  },

  // Technology
  {
    url: 'https://www.g2.com/categories',
    industry: 'Technology',
    location: 'Various',
    source: 'G2'
  },
  {
    url: 'https://www.capterra.com',
    industry: 'Technology',
    location: 'Various',
    source: 'Capterra'
  },

  // Marketing
  {
    url: 'https://clutch.co/agencies',
    industry: 'Marketing',
    location: 'Various',
    source: 'Clutch'
  },

  // Manufacturing
  {
    url: 'https://www.thomasnet.com/browse/',
    industry: 'Manufacturing',
    location: 'USA',
    source: 'ThomasNet'
  },

  // Hospitality
  {
    url: 'https://www.tripadvisor.com/Restaurants',
    industry: 'Hospitality',
    location: 'Various',
    source: 'TripAdvisor'
  },
  {
    url: 'https://www.opentable.com/discover/restaurants',
    industry: 'Hospitality',
    location: 'Various',
    source: 'OpenTable'
  },

  // Education
  {
    url: 'https://www.niche.com/k12/search/best-schools/',
    industry: 'Education',
    location: 'Various',
    source: 'Niche'
  },

  // Finance
  {
    url: 'https://www.investopedia.com/financial-advisor-directory/',
    industry: 'Finance',
    location: 'Various',
    source: 'Investopedia'
  }
];

// ==================== SCRAPING FUNCTIONS ====================

function extractEmails(html) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = html.match(emailRegex) || [];
  return [...new Set(emails)].filter(email => 
    !email.includes('example.com') && 
    !email.includes('test.com') &&
    !email.includes('placeholder')
  );
}

function extractPhones(html) {
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = html.match(phoneRegex) || [];
  return [...new Set(phones)];
}

function extractCompanyNames(html) {
  const $ = cheerio.load(html);
  const companies = [];
  
  $('h1, h2, h3, .company-name, .business-name, [itemprop="name"]').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 100 && text.length > 3) {
      companies.push(text);
    }
  });
  
  return [...new Set(companies)].slice(0, 10);
}

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
        name: '',
        company: companies[index] || '',
        phone: phones[index] || '',
        industry: industry,
        location: location,
        source: url,
        scraped_at: new Date().toISOString(),
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

// Save leads to Google Sheets via n8n
async function saveLeadsToSheet(leads) {
  if (!N8N_SAVE_LEAD_WEBHOOK) {
    console.warn('N8N_SAVE_LEAD_WEBHOOK not configured');
    return { success: false, saved: 0 };
  }

  try {
    console.log(`Saving ${leads.length} leads to Google Sheets...`);
    
    // Send to n8n webhook
    const response = await axios.post(N8N_SAVE_LEAD_WEBHOOK, {
      leads: leads
    });
    
    console.log(`✅ Saved ${leads.length} leads to Google Sheets`);
    return { success: true, saved: leads.length };
    
  } catch (error) {
    console.error('Error saving to sheets:', error.message);
    return { success: false, saved: 0 };
  }
}

// Automated scraping job
async function runScrapingJob() {
  console.log('🔍 Starting automated scraping job...');
  
  let totalLeads = 0;
  
  for (const target of scrapingTargets) {
    const leads = await scrapeURL(target.url, target.industry, target.location);
    
    if (leads.length > 0) {
      const result = await saveLeadsToSheet(leads);
      totalLeads += result.saved;
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log(`✅ Scraping complete. Saved ${totalLeads} new leads`);
}

// Schedule scraping job (every 6 hours)
setInterval(runScrapingJob, 6 * 60 * 60 * 1000);

// Run once on startup (after 10 seconds)
setTimeout(runScrapingJob, 10000);

// ==================== API ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Lead Scraper API is running',
    n8nConfigured: {
      saveWebhook: !!N8N_SAVE_LEAD_WEBHOOK,
      searchWebhook: !!N8N_SEARCH_WEBHOOK
    },
    timestamp: new Date().toISOString() 
  });
});

// Search leads (proxies to n8n which reads from Google Sheets)
app.post('/api/leads/search', async (req, res) => {
  try {
    const { industry, location, leadCount } = req.body;
    
    if (!industry || !location) {
      return res.status(400).json({
        success: false,
        error: 'Industry and location are required'
      });
    }

    if (!N8N_SEARCH_WEBHOOK) {
      return res.status(503).json({
        success: false,
        error: 'Search service not configured'
      });
    }
    
    // Forward request to n8n workflow
    const response = await axios.post(N8N_SEARCH_WEBHOOK, {
      industry,
      location,
      leadCount: parseInt(leadCount) || 50
    });
    
    res.json({
      success: true,
      count: response.data.length || 0,
      data: response.data || []
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed. Please try again.'
    });
  }
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
    
    const result = await saveLeadsToSheet(leads);
    
    res.json({
      success: result.success,
      scraped: leads.length,
      saved: result.saved,
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
    const { targets } = req.body;
    
    if (!Array.isArray(targets)) {
      return res.status(400).json({
        success: false,
        error: 'Targets must be an array'
      });
    }
    
    let totalScraped = 0;
    let totalSaved = 0;
    
    for (const target of targets) {
      const leads = await scrapeURL(target.url, target.industry, target.location);
      const result = await saveLeadsToSheet(leads);
      
      totalScraped += leads.length;
      totalSaved += result.saved;
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    res.json({
      success: true,
      scraped: totalScraped,
      saved: totalSaved
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
    message: 'Target added successfully',
    totalTargets: scrapingTargets.length
  });
});

// Get scraping targets
app.get('/api/scrape/targets', (req, res) => {
  res.json({
    success: true,
    count: scrapingTargets.length,
    data: scrapingTargets
  });
});

// Test n8n connection
app.get('/api/test-n8n', async (req, res) => {
  const tests = {
    saveWebhook: false,
    searchWebhook: false
  };
  
  try {
    if (N8N_SAVE_LEAD_WEBHOOK) {
      const testLead = {
        id: 'test_' + Date.now(),
        email: 'test@example.com',
        name: 'Test Lead',
        company: 'Test Company',
        industry: 'Technology',
        location: 'Test Location',
        scraped_at: new Date().toISOString()
      };
      
      await axios.post(N8N_SAVE_LEAD_WEBHOOK, { leads: [testLead] });
      tests.saveWebhook = true;
    }
  } catch (error) {
    console.error('Save webhook test failed:', error.message);
  }
  
  try {
    if (N8N_SEARCH_WEBHOOK) {
      await axios.post(N8N_SEARCH_WEBHOOK, {
        industry: 'Technology',
        location: 'USA',
        leadCount: 5
      });
      tests.searchWebhook = true;
    }
  } catch (error) {
    console.error('Search webhook test failed:', error.message);
  }
  
  res.json({
    success: true,
    webhooksConfigured: {
      save: !!N8N_SAVE_LEAD_WEBHOOK,
      search: !!N8N_SEARCH_WEBHOOK
    },
    connectionTests: tests
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Lead Scraper API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 n8n Save Webhook: ${N8N_SAVE_LEAD_WEBHOOK ? 'Configured ✅' : 'Not configured ⚠️'}`);
  console.log(`🔍 n8n Search Webhook: ${N8N_SEARCH_WEBHOOK ? 'Configured ✅' : 'Not configured ⚠️'}`);
  console.log(`⏰ Automated scraping will run every 6 hours`);
});

module.exports = app;

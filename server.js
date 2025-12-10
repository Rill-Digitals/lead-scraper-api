// Automated Lead Scraper API
// Scrapes websites automatically and stores leads with industry/location metadata

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database (use MongoDB/PostgreSQL in production)
let leadsDatabase = [];

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

// Extract emails from HTML
function extractEmails(html) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = html.match(emailRegex) || [];
  return [...new Set(emails)].filter(email => 
    !email.includes('example.com') && 
    !email.includes('test.com') &&
    !email.includes('placeholder') &&
    !email.includes('noreply') &&
    !email.includes('privacy') &&
    !email.includes('support@')
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
  $('h1, h2, h3, .company-name, .business-name, [itemprop="name"], .org, .organization').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 100 && text.length > 3) {
      companies.push(text);
    }
  });
  
  return [...new Set(companies)].slice(0, 10);
}

// Extract names from HTML
function extractNames(html) {
  const $ = cheerio.load(html);
  const names = [];
  
  $('[itemprop="author"], .author, .name, .contact-name').each((i, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 50 && text.length > 3) {
      names.push(text);
    }
  });
  
  return [...new Set(names)];
}

// Scrape a single URL
async function scrapeURL(url, industry, location, sourceName = 'Unknown') {
  try {
    console.log(`Scraping ${url}...`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000,
      maxRedirects: 5
    });
    
    const html = response.data;
    const emails = extractEmails(html);
    const phones = extractPhones(html);
    const companies = extractCompanyNames(html);
    const names = extractNames(html);
    
    const leads = [];
    
    // Create leads from emails
    emails.forEach((email, index) => {
      const lead = {
        id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: email,
        name: names[index] || '',
        company: companies[index] || '',
        phone: phones[index] || '',
        industry: industry,
        location: location,
        source: url,
        sourceName: sourceName,
        scrapedAt: new Date().toISOString(),
        verified: false
      };
      leads.push(lead);
    });
    
    console.log(`✓ Found ${leads.length} leads from ${url}`);
    return leads;
    
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 429) {
      console.error(`⚠️  Access denied for ${url} - May require authentication or rate limited`);
    } else {
      console.error(`✗ Error scraping ${url}:`, error.message);
    }
    return [];
  }
}

// Automated scraping job (runs periodically)
async function runScrapingJob() {
  console.log('🚀 Starting automated scraping job...');
  console.log(`📋 Total targets: ${scrapingTargets.length}`);
  
  let scrapedCount = 0;
  let successCount = 0;
  let failedCount = 0;
  
  for (const target of scrapingTargets) {
    // Skip targets that require authentication
    if (target.requiresAuth) {
      console.log(`⏭️  Skipping ${target.source} - requires authentication`);
      continue;
    }
    
    const leads = await scrapeURL(
      target.url, 
      target.industry, 
      target.location,
      target.source
    );
    
    if (leads.length > 0) {
      successCount++;
      scrapedCount += leads.length;
      
      // Add to database, avoiding duplicates
      leads.forEach(lead => {
        const exists = leadsDatabase.find(l => l.email === lead.email);
        if (!exists) {
          leadsDatabase.push(lead);
        }
      });
    } else {
      failedCount++;
    }
    
    // Wait between requests to be respectful (2-5 seconds random delay)
    const delay = 2000 + Math.random() * 3000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  console.log('✅ Scraping complete!');
  console.log(`📊 Stats:`);
  console.log(`   - Leads scraped: ${scrapedCount}`);
  console.log(`   - Total leads in DB: ${leadsDatabase.length}`);
  console.log(`   - Successful sources: ${successCount}`);
  console.log(`   - Failed sources: ${failedCount}`);
}

// Schedule scraping job (every 6 hours)
const SCRAPE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
setInterval(runScrapingJob, SCRAPE_INTERVAL);

// Run once on startup after 5 seconds
setTimeout(runScrapingJob, 5000);

// ==================== HELPER FUNCTIONS ====================

function getTargetsByIndustry(industry) {
  return scrapingTargets.filter(target => 
    target.industry.toLowerCase() === industry.toLowerCase()
  );
}

function getTargetsByLocation(location) {
  return scrapingTargets.filter(target => 
    target.location.toLowerCase().includes(location.toLowerCase())
  );
}

function getTargetsBySource(source) {
  return scrapingTargets.filter(target => 
    target.source?.toLowerCase() === source.toLowerCase()
  );
}

// ==================== API ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    totalLeads: leadsDatabase.length,
    totalTargets: scrapingTargets.length,
    timestamp: new Date().toISOString() 
  });
});

// Welcome/Documentation endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Lead Scraper API',
    version: '2.0.0',
    description: 'Automated lead generation from 50+ free business directories',
    endpoints: {
      'POST /api/leads/search': 'Search leads by industry and location',
      'GET /api/leads': 'Get all leads',
      'GET /api/stats': 'Get database statistics',
      'POST /api/scrape/trigger': 'Manually trigger scraping for a URL',
      'POST /api/scrape/bulk': 'Bulk scrape multiple URLs',
      'GET /api/scrape/targets': 'Get all scraping targets',
      'POST /api/scrape/targets': 'Add a new scraping target',
      'GET /api/leads/export/csv': 'Export leads as CSV',
      'POST /api/leads/deduplicate': 'Remove duplicate leads',
      'DELETE /api/leads/clear': 'Clear all leads (admin)'
    },
    sources: {
      yellowPages: scrapingTargets.filter(t => t.source === 'YellowPages').length,
      yelp: scrapingTargets.filter(t => t.source === 'Yelp').length,
      linkedin: scrapingTargets.filter(t => t.source === 'LinkedIn').length,
      crunchbase: scrapingTargets.filter(t => t.source === 'Crunchbase').length,
      angelList: scrapingTargets.filter(t => t.source === 'AngelList').length,
      productHunt: scrapingTargets.filter(t => t.source === 'Product Hunt').length,
      industrySpecific: scrapingTargets.filter(t => 
        !['YellowPages', 'Yelp', 'LinkedIn', 'Crunchbase', 'AngelList', 'Product Hunt'].includes(t.source)
      ).length
    }
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
      query: { industry, location, limit },
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
  const { limit, offset } = req.query;
  const limitNum = parseInt(limit) || 100;
  const offsetNum = parseInt(offset) || 0;
  
  const paginatedLeads = leadsDatabase.slice(offsetNum, offsetNum + limitNum);
  
  res.json({
    success: true,
    total: leadsDatabase.length,
    count: paginatedLeads.length,
    limit: limitNum,
    offset: offsetNum,
    data: paginatedLeads
  });
});

// Get leads statistics
app.get('/api/stats', (req, res) => {
  const stats = {
    total: leadsDatabase.length,
    byIndustry: {},
    byLocation: {},
    bySource: {},
    verified: leadsDatabase.filter(l => l.verified).length,
    recent: leadsDatabase.filter(l => {
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return new Date(l.scrapedAt) > dayAgo;
    }).length,
    withPhone: leadsDatabase.filter(l => l.phone).length,
    withCompany: leadsDatabase.filter(l => l.company).length,
    withName: leadsDatabase.filter(l => l.name).length
  };
  
  // Count by industry
  leadsDatabase.forEach(lead => {
    stats.byIndustry[lead.industry] = (stats.byIndustry[lead.industry] || 0) + 1;
    stats.byLocation[lead.location] = (stats.byLocation[lead.location] || 0) + 1;
    stats.bySource[lead.sourceName || 'Unknown'] = (stats.bySource[lead.sourceName || 'Unknown'] || 0) + 1;
  });
  
  res.json({
    success: true,
    data: stats
  });
});

// Manual scraping trigger
app.post('/api/scrape/trigger', async (req, res) => {
  try {
    const { url, industry, location, source } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    const leads = await scrapeURL(
      url, 
      industry || 'Unknown', 
      location || 'Unknown',
      source || 'Manual'
    );
    
    // Add to database
    let addedCount = 0;
    leads.forEach(lead => {
      const exists = leadsDatabase.find(l => l.email === lead.email);
      if (!exists) {
        leadsDatabase.push(lead);
        addedCount++;
      }
    });
    
    res.json({
      success: true,
      scraped: leads.length,
      added: addedCount,
      duplicates: leads.length - addedCount,
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
    const { targets } = req.body; // Array of {url, industry, location, source}
    
    if (!Array.isArray(targets)) {
      return res.status(400).json({
        success: false,
        error: 'Targets must be an array'
      });
    }
    
    let totalScraped = 0;
    let totalAdded = 0;
    
    for (const target of targets) {
      const leads = await scrapeURL(
        target.url, 
        target.industry, 
        target.location,
        target.source || 'Bulk'
      );
      
      totalScraped += leads.length;
      
      leads.forEach(lead => {
        const exists = leadsDatabase.find(l => l.email === lead.email);
        if (!exists) {
          leadsDatabase.push(lead);
          totalAdded++;
        }
      });
      
      // Random delay between 2-5 seconds
      const delay = 2000 + Math.random() * 3000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    res.json({
      success: true,
      scraped: totalScraped,
      added: totalAdded,
      duplicates: totalScraped - totalAdded,
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
  const { url, industry, location, source } = req.body;
  
  if (!url || !industry || !location) {
    return res.status(400).json({
      success: false,
      error: 'URL, industry, and location are required'
    });
  }
  
  const newTarget = { 
    url, 
    industry, 
    location, 
    source: source || 'Custom',
    addedAt: new Date().toISOString()
  };
  
  scrapingTargets.push(newTarget);
  
  res.json({
    success: true,
    message: 'Target added successfully',
    target: newTarget,
    totalTargets: scrapingTargets.length
  });
});

// Get scraping targets
app.get('/api/scrape/targets', (req, res) => {
  const { industry, location, source } = req.query;
  
  let filtered = scrapingTargets;
  
  if (industry) {
    filtered = filtered.filter(t => 
      t.industry.toLowerCase().includes(industry.toLowerCase())
    );
  }
  
  if (location) {
    filtered = filtered.filter(t => 
      t.location.toLowerCase().includes(location.toLowerCase())
    );
  }
  
  if (source) {
    filtered = filtered.filter(t => 
      t.source?.toLowerCase().includes(source.toLowerCase())
    );
  }
  
  res.json({
    success: true,
    total: scrapingTargets.length,
    filtered: filtered.length,
    data: filtered
  });
});

// Export leads as CSV
app.get('/api/leads/export/csv', (req, res) => {
  if (leadsDatabase.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No leads to export'
    });
  }
  
  const headers = ['Email', 'Name', 'Company', 'Phone', 'Industry', 'Location', 'Source', 'Source Name', 'Scraped At', 'Verified'];
  const rows = leadsDatabase.map(lead => [
    lead.email,
    lead.name || '',
    lead.company || '',
    lead.phone || '',
    lead.industry,
    lead.location,
    lead.source,
    lead.sourceName || '',
    lead.scrapedAt,
    lead.verified ? 'Yes' : 'No'
  ].map(val => `"${val}"`).join(','));
  
  const csv = [headers.join(','), ...rows].join('\n');
  
  res.setHeader('Content-Disposition', `attachment; filename=leads_${Date.now()}.csv`);
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
  console.log('═══════════════════════════════════════════════════');
  console.log('🚀 Lead Scraper API v2.0');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
  console.log(`🎯 Total scraping targets: ${scrapingTargets.length}`);
  console.log('');
  console.log('Sources breakdown:');
  console.log(`  - YellowPages: ${scrapingTargets.filter(t => t.source === 'YellowPages').length}`);
  console.log(`  - Yelp: ${scrapingTargets.filter(t => t.source === 'Yelp').length}`);
  console.log(`  - Crunchbase: ${scrapingTargets.filter(t => t.source === 'Crunchbase').length}`);
  console.log(`  - AngelList: ${scrapingTargets.filter(t => t.source === 'AngelList').length}`);
  console.log(`  - Product Hunt: ${scrapingTargets.filter(t => t.source === 'Product Hunt').length}`);
  console.log(`  - Industry Directories: ${scrapingTargets.filter(t => !['YellowPages', 'Yelp', 'Crunchbase', 'AngelList', 'Product Hunt', 'LinkedIn'].includes(t.source)).length}`);
  console.log('');
  console.log('🔍 Automated scraping will run every 6 hours');
  console.log('⏰ First scrape starts in 5 seconds...');
  console.log('═══════════════════════════════════════════════════');
});

module.exports = app;

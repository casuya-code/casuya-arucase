const crawlPattern = /bot|crawl|scrape|scanner|curl|wget|nikto|sqlmap|python|go-http/i;

function isCrawlerUserAgent(userAgent = '') {
  return crawlPattern.test(userAgent);
}

module.exports = { isCrawlerUserAgent };

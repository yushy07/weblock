import { describe, it, expect } from 'vitest';
import {
  getCandidateFaviconUrls,
  generateFallbackIcon,
} from '../src/utils/favicons.js';

describe('Favicon Engine & Fallback Generator', () => {
  it('builds prioritized candidate favicon URLs in correct order', () => {
    const urls = getCandidateFaviconUrls('github.com');
    expect(urls.length).toBe(3);
    // 1. Google S2
    expect(urls[0]).toContain('google.com/s2/favicons');
    expect(urls[0]).toContain('github.com');
    // 2. DuckDuckGo
    expect(urls[1]).toContain('icons.duckduckgo.com/ip3');
    expect(urls[1]).toContain('github.com.ico');
    // 3. Direct origin
    expect(urls[2]).toBe('https://github.com/favicon.ico');
  });

  it('generates deterministic SVG fallback data URIs based on domain', () => {
    const svg1 = generateFallbackIcon('youtube.com');
    const svg2 = generateFallbackIcon('youtube.com');
    const svgReddit = generateFallbackIcon('reddit.com');

    // Deterministic: same domain always generates identical SVG
    expect(svg1).toBe(svg2);

    // Starts with data:image/svg+xml;utf8,
    expect(svg1.startsWith('data:image/svg+xml;utf8,')).toBe(true);

    // Contains initial letter
    const decodedYt = decodeURIComponent(svg1);
    expect(decodedYt).toContain('>Y<');
    const decodedReddit = decodeURIComponent(svgReddit);
    expect(decodedReddit).toContain('>R<');

    // Different domains with different hashes produce different gradient hues
    expect(svg1).not.toBe(svgReddit);
  });

  it('handles edge case domains gracefully', () => {
    const svgEmpty = generateFallbackIcon('');
    expect(svgEmpty.startsWith('data:image/svg+xml')).toBe(true);
    const decodedEmpty = decodeURIComponent(svgEmpty);
    expect(decodedEmpty).toContain('>🔒<'); // Default lock emoji for empty domain

    const svgSpecial = generateFallbackIcon('123movies.net');
    const decodedSpecial = decodeURIComponent(svgSpecial);
    expect(decodedSpecial).toContain('>1<');
  });
});

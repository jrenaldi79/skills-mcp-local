import { MarketplaceSkill, SkillSource, SkillUpdateStatus } from '../types/index.js';
import { parseSkillFrontmatter } from '../utils/yaml-parser.js';
import logger from '../utils/logger.js';

/**
 * Parsed GitHub URL components
 */
export interface GitHubUrlParts {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

/** GitHub API base URL */
const GITHUB_API_BASE = 'https://api.github.com';

/** Raw GitHub content base URL */
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

/** Cache duration in milliseconds (1 hour) */
const CACHE_DURATION_MS = 60 * 60 * 1000;

/**
 * Simple in-memory cache for marketplace data
 */
interface CacheEntry {
  skills: MarketplaceSkill[];
  timestamp: number;
}

const marketplaceCache = new Map<string, CacheEntry>();

/**
 * Parse a GitHub tree URL into its components
 *
 * @param url - GitHub URL like https://github.com/owner/repo/tree/branch/path
 * @returns Parsed components or null if invalid
 */
export function parseGitHubUrl(url: string): GitHubUrlParts | null {
  try {
    const urlObj = new URL(url);

    // Must be github.com
    if (urlObj.hostname !== 'github.com') {
      return null;
    }

    // Parse path: /owner/repo/tree/branch/path
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Need at least owner/repo/tree/branch
    if (pathParts.length < 4 || pathParts[2] !== 'tree') {
      return null;
    }

    const [owner, repo, , branch, ...restPath] = pathParts;

    return {
      owner,
      repo,
      branch,
      path: restPath.join('/'),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch directory contents from GitHub API
 */
async function fetchGitHubDirectory(
  owner: string,
  repo: string,
  path: string
): Promise<Array<{ name: string; type: string }>> {
  const apiUrl = path
    ? `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`
    : `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'skills-mcp-local',
      },
    });

    if (!response.ok) {
      logger.warn('GitHub API request failed', {
        url: apiUrl,
        status: response.status,
      });
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: { name: string; type: string }) => ({
      name: item.name,
      type: item.type,
    }));
  } catch (err) {
    logger.error('Error fetching GitHub directory', {
      url: apiUrl,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Fetch raw file content from GitHub
 */
async function fetchGitHubRawFile(
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<string | null> {
  const rawUrl = `${GITHUB_RAW_BASE}/${owner}/${repo}/${branch}/${path}`;

  try {
    const response = await fetch(rawUrl);

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Manager for fetching skills from marketplace(s)
 */
export class MarketplaceManager {
  /**
   * Fetch skills from a single marketplace URL
   *
   * @param marketplaceUrl - GitHub tree URL pointing to skills directory
   * @returns Array of marketplace skills
   */
  async fetchSkillsFromMarketplace(marketplaceUrl: string): Promise<MarketplaceSkill[]> {
    // Check cache first
    const cached = marketplaceCache.get(marketplaceUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      logger.debug('Using cached marketplace data', { url: marketplaceUrl });
      return cached.skills;
    }

    // Parse GitHub URL
    const parsed = parseGitHubUrl(marketplaceUrl);
    if (!parsed) {
      logger.warn('Invalid marketplace URL', { url: marketplaceUrl });
      return [];
    }

    const { owner, repo, branch, path } = parsed;

    // Fetch directory listing
    const entries = await fetchGitHubDirectory(owner, repo, path);
    const directories = entries.filter(e => e.type === 'dir');

    const skills: MarketplaceSkill[] = [];

    // Fetch SKILL.md for each skill directory
    for (const dir of directories) {
      const skillPath = path ? `${path}/${dir.name}/SKILL.md` : `${dir.name}/SKILL.md`;
      const content = await fetchGitHubRawFile(owner, repo, branch, skillPath);

      if (!content) {
        continue;
      }

      const parseResult = parseSkillFrontmatter(content);

      if (parseResult.success && parseResult.data) {
        skills.push({
          metadata: parseResult.data,
          marketplaceUrl,
          installCommand: `skills_install ${parseResult.data.name}`,
        });
      }
    }

    // Cache results
    marketplaceCache.set(marketplaceUrl, {
      skills,
      timestamp: Date.now(),
    });

    logger.info('Fetched skills from marketplace', {
      url: marketplaceUrl,
      count: skills.length,
    });

    return skills;
  }

  /**
   * Fetch skills from multiple marketplaces
   *
   * @param marketplaceUrls - Array of marketplace URLs
   * @returns Combined array of skills (deduplicated by name)
   */
  async fetchAllSkills(marketplaceUrls: string[]): Promise<MarketplaceSkill[]> {
    if (marketplaceUrls.length === 0) {
      return [];
    }

    const skillMap = new Map<string, MarketplaceSkill>();

    for (const url of marketplaceUrls) {
      const skills = await this.fetchSkillsFromMarketplace(url);

      for (const skill of skills) {
        // First occurrence wins (earlier marketplaces take priority)
        if (!skillMap.has(skill.metadata.name)) {
          skillMap.set(skill.metadata.name, skill);
        }
      }
    }

    return Array.from(skillMap.values());
  }

  /**
   * Filter skills by search query
   *
   * @param skills - Skills to filter
   * @param filter - Search query (matches name or description)
   * @returns Filtered skills
   */
  filterSkills(skills: MarketplaceSkill[], filter: string): MarketplaceSkill[] {
    if (!filter || filter.trim() === '') {
      return skills;
    }

    const query = filter.toLowerCase();

    return skills.filter(skill => {
      const nameMatch = skill.metadata.name.toLowerCase().includes(query);
      const descMatch = skill.metadata.description.toLowerCase().includes(query);
      return nameMatch || descMatch;
    });
  }

  /**
   * Get the latest commit hash for a skill in a marketplace
   *
   * @param marketplaceUrl - GitHub tree URL of the marketplace
   * @param skillName - Name of the skill directory
   * @returns Latest commit hash or null if not found
   */
  async getLatestCommit(
    marketplaceUrl: string,
    skillName: string
  ): Promise<string | null> {
    const parsed = parseGitHubUrl(marketplaceUrl);
    if (!parsed) {
      logger.warn('Invalid marketplace URL for commit check', { url: marketplaceUrl });
      return null;
    }

    const { owner, repo, branch, path } = parsed;
    const skillPath = path ? `${path}/${skillName}` : skillName;

    // Use GitHub API to get commits for the skill path
    const apiUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?path=${encodeURIComponent(skillPath)}&sha=${branch}&per_page=1`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'skills-mcp-local',
        },
      });

      if (!response.ok) {
        logger.warn('GitHub commits API request failed', {
          url: apiUrl,
          status: response.status,
        });
        return null;
      }

      const commits = await response.json();

      if (!Array.isArray(commits) || commits.length === 0) {
        return null;
      }

      const latestCommit = commits[0].sha as string;
      logger.debug('Got latest commit for skill', { skillName, commit: latestCommit });
      return latestCommit;
    } catch (err) {
      logger.error('Error fetching latest commit', {
        skillName,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Check if a skill has updates available
   *
   * @param source - Skill source tracking information
   * @returns Update status with hasUpdate flag
   */
  async checkForUpdates(source: SkillSource): Promise<SkillUpdateStatus> {
    const remoteCommit = await this.getLatestCommit(
      source.marketplaceUrl,
      source.skillPath
    );

    if (!remoteCommit) {
      return {
        hasUpdate: false,
        localCommit: source.commitHash,
        error: 'Could not fetch latest commit from marketplace',
      };
    }

    const hasUpdate = remoteCommit !== source.commitHash;

    return {
      hasUpdate,
      localCommit: source.commitHash,
      remoteCommit,
    };
  }
}

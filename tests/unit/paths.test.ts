import os from 'os';
import path from 'path';
import { getSkillSearchPaths, expandPath, getConfigPath, getDefaultInstallPath } from '../../src/utils/paths.js';

describe('Path Utilities', () => {
  const homeDir = os.homedir();

  describe('expandPath', () => {
    it('should expand ~ to home directory', () => {
      const result = expandPath('~/skills');
      expect(result).toBe(path.join(homeDir, 'skills'));
    });

    it('should expand ~ at start of path only', () => {
      const result = expandPath('~/foo/bar~baz');
      expect(result).toBe(path.join(homeDir, 'foo', 'bar~baz'));
    });

    it('should not modify absolute paths', () => {
      const result = expandPath('/usr/local/share/skills');
      expect(result).toBe('/usr/local/share/skills');
    });

    it('should handle relative paths', () => {
      const result = expandPath('.claude/skills');
      expect(result).toBe(path.resolve('.claude/skills'));
    });

    it('should handle empty string', () => {
      const result = expandPath('');
      expect(result).toBe(process.cwd());
    });
  });

  describe('getSkillSearchPaths', () => {
    it('should return all skill search paths in priority order', () => {
      const paths = getSkillSearchPaths();

      expect(paths.length).toBe(6);
      expect(paths[0]).toBe(path.join(homeDir, 'skills'));
      expect(paths[1]).toBe(path.join(homeDir, '.claude', 'skills'));
      expect(paths[2]).toBe(path.resolve('.claude', 'skills'));
      expect(paths[3]).toBe(path.join(homeDir, 'Documents', 'skills'));
      expect(paths[4]).toBe(path.join(homeDir, '.local', 'share', 'skills'));
      expect(paths[5]).toBe('/usr/local/share/skills');
    });

    it('should return paths as absolute paths', () => {
      const paths = getSkillSearchPaths();

      for (const p of paths) {
        expect(path.isAbsolute(p)).toBe(true);
      }
    });
  });

  describe('getConfigPath', () => {
    it('should return config path in ~/.config/skills-mcp/', () => {
      const configPath = getConfigPath();

      expect(configPath).toBe(path.join(homeDir, '.config', 'skills-mcp', 'config.json'));
    });
  });

  describe('getDefaultInstallPath', () => {
    it('should return ~/skills as default install path', () => {
      const installPath = getDefaultInstallPath();

      expect(installPath).toBe(path.join(homeDir, 'skills'));
    });
  });
});

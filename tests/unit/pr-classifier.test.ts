import { isBotPR } from '../../src/utils/pr-classifier';

describe('pr-classifier', () => {
  describe('isBotPR', () => {
    it('should detect Dependabot by author name "dependabot[bot]"', () => {
      expect(isBotPR('dependabot[bot]', 'Bump axios from 1.6.0 to 1.7.0')).toBe(true);
    });

    it('should detect Renovate by author name "renovate[bot]"', () => {
      expect(isBotPR('renovate[bot]', 'Update dependency typescript to v5.4')).toBe(true);
    });

    it('should detect bot by commit message pattern "Bump X from Y to Z"', () => {
      expect(isBotPR('someuser', 'Bump lodash from 4.17.20 to 4.17.21')).toBe(true);
    });

    it('should detect bot by commit message pattern "Update dependency X"', () => {
      expect(isBotPR('someuser', 'Update dependency jest to v30')).toBe(true);
    });

    it('should detect bot by commit message pattern "chore(deps): ..."', () => {
      expect(isBotPR('someuser', 'chore(deps): bump eslint from 8.0.0 to 9.0.0')).toBe(true);
    });

    it('should classify human PR correctly as not bot', () => {
      expect(isBotPR('developer', 'Add new feature for login page')).toBe(false);
    });

    it('should classify human PR with non-bot conventional commit as not bot', () => {
      expect(isBotPR('developer', 'feat: implement user dashboard')).toBe(false);
    });

    it('should detect bot by commit message pattern "build(deps): ..."', () => {
      expect(isBotPR('someuser', 'build(deps): bump webpack from 5.0.0 to 5.1.0')).toBe(true);
    });

    it('should be case-insensitive for author matching', () => {
      expect(isBotPR('Dependabot[bot]', 'Some title')).toBe(true);
    });

    it('should be case-insensitive for message pattern matching', () => {
      expect(isBotPR('someuser', 'BUMP lodash from 4.0.0 to 5.0.0')).toBe(true);
    });
  });
});

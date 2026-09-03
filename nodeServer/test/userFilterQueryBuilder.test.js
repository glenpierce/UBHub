import {describe, it, expect} from 'vitest';
import {buildUserEmailFilterQuery} from '../services/userFilterQueryBuilder.js';

describe('userFilterQueryBuilder', () => {
  describe('buildUserEmailFilterQuery', () => {
    it('throws INVALID_FILTER_CRITERIA when filterCriteria is missing', () => {
      expect(() => buildUserEmailFilterQuery(undefined)).toThrowError('At least one filter is required');
      try {
        buildUserEmailFilterQuery(undefined);
      } catch (error) {
        expect(error.code).toBe('INVALID_FILTER_CRITERIA');
      }
    });

    it('throws INVALID_FILTER_CRITERIA when filterCriteria is an empty object', () => {
      expect(() => buildUserEmailFilterQuery({})).toThrowError('At least one filter is required');
    });

    it('throws INVALID_FILTER_FIELD when an unknown field name is supplied', () => {
      expect(() => buildUserEmailFilterQuery({unknownField: 'value'})).toThrowError('Unknown filter field');
      try {
        buildUserEmailFilterQuery({unknownField: 'value'});
      } catch (error) {
        expect(error.code).toBe('INVALID_FILTER_FIELD');
      }
    });

    it('throws INVALID_FILTER_CRITERIA when every supplied value is empty', () => {
      expect(() => buildUserEmailFilterQuery({region: '', institution: '   '}))
        .toThrowError('At least one non-empty filter value is required');
    });

    it('builds a single FIND_IN_SET condition for a single region code', () => {
      const result = buildUserEmailFilterQuery({region: 'EU'});
      expect(result.sql).toContain('SELECT DISTINCT email FROM users WHERE');
      expect(result.sql).toContain('FIND_IN_SET(?, `region`)');
      expect(result.sql).toContain("email IS NOT NULL AND TRIM(email) <> ''");
      expect(result.parameters).toEqual(['EU']);
    });

    it('builds OR-joined FIND_IN_SET conditions for multiple comma-separated region codes', () => {
      const result = buildUserEmailFilterQuery({region: 'EU,NA, LA'});
      const findInSetMatches = result.sql.match(/FIND_IN_SET/g);
      expect(findInSetMatches.length).toBe(3);
      expect(result.sql).toContain('OR');
      expect(result.parameters).toEqual(['EU', 'NA', 'LA']);
    });

    it('builds a LIKE condition for a containsSubstring field (institution)', () => {
      const result = buildUserEmailFilterQuery({institution: 'Zoo'});
      expect(result.sql).toContain('`institution` LIKE ?');
      expect(result.parameters).toEqual(['%Zoo%']);
    });

    it('builds an exact-match condition for an exactMatch field (level)', () => {
      const result = buildUserEmailFilterQuery({level: 'Associate'});
      expect(result.sql).toContain('`level` = ?');
      expect(result.parameters).toEqual(['Associate']);
    });

    it('builds an exact-match condition for the privileges field', () => {
      const result = buildUserEmailFilterQuery({privileges: 3});
      expect(result.sql).toContain('`privileges` = ?');
      expect(result.parameters).toEqual(['3']);
    });

    it('combines multiple filter fields with AND', () => {
      const result = buildUserEmailFilterQuery({region: 'EU', institution: 'Zoo', level: 'Senior'});
      expect(result.sql).toContain('AND');
      expect(result.sql).toContain('FIND_IN_SET(?, `region`)');
      expect(result.sql).toContain('`institution` LIKE ?');
      expect(result.sql).toContain('`level` = ?');
      expect(result.parameters).toEqual(['EU', '%Zoo%', 'Senior']);
    });

    it('skips fields whose value is empty while still using other populated fields', () => {
      const result = buildUserEmailFilterQuery({region: '', institution: 'Zoo'});
      expect(result.sql).not.toContain('region');
      expect(result.sql).toContain('`institution` LIKE ?');
      expect(result.parameters).toEqual(['%Zoo%']);
    });
  });
});


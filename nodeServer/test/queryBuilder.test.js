import { describe, it, expect } from 'vitest';
import { buildTableDataQuery } from '../services/queryBuilder.js';

describe('queryBuilder', () => {
  describe('buildTableDataQuery', () => {
    it('throws INVALID_QUERY_SPEC when tableName is missing', () => {
      expect(() => buildTableDataQuery({ serverMeta: { columns: [] } }))
        .toThrowError('Invalid query specification');
    });

    it('throws INVALID_QUERY_SPEC when serverMeta is missing', () => {
      expect(() => buildTableDataQuery({ tableName: 'locations' }))
        .toThrowError('Invalid query specification');
    });

    it('throws INVALID_QUERY_SPEC when columns is not an array', () => {
      expect(() => buildTableDataQuery({ tableName: 'locations', serverMeta: {} }))
        .toThrowError('Invalid query specification');
    });

    it('returns null sql when there are no selectable columns', () => {
      const result = buildTableDataQuery({
        tableName: 'test',
        serverMeta: {
          columns: [
            { button: 'edit', label: 'Edit', visible: true },
          ],
        },
      });
      expect(result.sql).toBe(null);
      expect(result.parameters).toEqual([]);
    });

    it('builds a simple SELECT for a table with plain columns', () => {
      const result = buildTableDataQuery({
        tableName: 'locations',
        serverMeta: {
          columns: [
            { name: 'id', visible: false },
            { name: 'inst_title', label: 'Location Name', visible: true },
            { name: 'country', label: 'Country', visible: true },
          ],
        },
      });

      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('`locations`.`id` AS `id`');
      expect(result.sql).toContain('`locations`.`inst_title` AS `inst_title`');
      expect(result.sql).toContain('`locations`.`country` AS `country`');
      expect(result.sql).toContain('FROM `locations`');
      expect(result.sql).toContain('LIMIT 2000');
      expect(result.parameters).toEqual([]);
    });

    it('builds a LEFT JOIN for a cross-reference column with plain lookup', () => {
      const result = buildTableDataQuery({
        tableName: 'documents',
        serverMeta: {
          columns: [
            { name: 'id', visible: false },
            { name: 'inst_id', visible: false },
            {
              crossReferenceTable: 'locations',
              lookupColumn: 'inst_id',
              joinedColumn: 'inst_title',
              label: 'Institution Title',
              visible: true,
            },
            { name: 'doc_type', label: 'Document Type', visible: true },
          ],
        },
      });

      expect(result.sql).toContain('LEFT JOIN `locations` AS `locations_x`');
      expect(result.sql).toContain('ON `documents`.`inst_id` = `locations_x`.`id`');
      expect(result.sql).toContain('`locations_x`.`inst_title` AS `inst_title`');
      expect(result.sql).toContain('`documents`.`doc_type` AS `doc_type`');
    });

    it('builds a JSON-extracted LEFT JOIN for a json: lookup part', () => {
      const result = buildTableDataQuery({
        tableName: 'row_versions',
        serverMeta: {
          columns: [
            { name: 'id', visible: false },
            {
              crossReferenceTable: 'locations',
              lookupColumn: 'json:$.inst_id|json:$.inst_title',
              joinedColumn: 'inst_title',
              label: 'Institution Title',
              visible: true,
            },
          ],
        },
      });

      expect(result.sql).toContain('LEFT JOIN `locations`');
      expect(result.sql).toContain("JSON_EXTRACT(`row_versions`.`data`, '$.inst_id')");
      expect(result.sql).toContain('CAST(');
      expect(result.sql).toContain('AS UNSIGNED)');
      // should have COALESCE fallback to inst_title json path
      expect(result.sql).toContain('COALESCE(');
      expect(result.sql).toContain("'$.inst_title'");
    });

    it('reuses join alias when the same cross-reference appears twice', () => {
      const result = buildTableDataQuery({
        tableName: 'documents',
        serverMeta: {
          columns: [
            {
              crossReferenceTable: 'locations',
              lookupColumn: 'inst_id',
              joinedColumn: 'inst_title',
              visible: true,
            },
            {
              crossReferenceTable: 'locations',
              lookupColumn: 'inst_id',
              joinedColumn: 'country',
              visible: true,
            },
          ],
        },
      });

      // Only one LEFT JOIN should be present
      const joinMatches = result.sql.match(/LEFT JOIN/g);
      expect(joinMatches.length).toBe(1);
    });

    it('respects a custom limit', () => {
      const result = buildTableDataQuery({
        tableName: 'locations',
        serverMeta: {
          columns: [{ name: 'id', visible: false }],
        },
        limit: 500,
      });

      expect(result.sql).toContain('LIMIT 500');
    });

    it('skips button-only columns', () => {
      const result = buildTableDataQuery({
        tableName: 'locations',
        serverMeta: {
          columns: [
            { name: 'id', visible: false },
            { button: 'edit', label: 'Edit', visible: true, onClickFunction: 'openEditLocationModal' },
          ],
        },
      });

      expect(result.sql).toContain('`locations`.`id`');
      expect(result.sql).not.toContain('edit');
    });

    it('falls back to JSON extraction when no joinable part exists', () => {
      const result = buildTableDataQuery({
        tableName: 'test_table',
        serverMeta: {
          columns: [
            {
              crossReferenceTable: 'locations',
              lookupColumn: 'json:$.some_name',
              joinedColumn: 'inst_title',
              visible: true,
            },
          ],
        },
      });

      // json:$.some_name does not contain 'id' so no join should be created
      expect(result.sql).not.toContain('LEFT JOIN');
      expect(result.sql).toContain("JSON_EXTRACT(`test_table`.`data`, '$.some_name')");
      expect(result.sql).toContain('AS `inst_title`');
    });
  });
});


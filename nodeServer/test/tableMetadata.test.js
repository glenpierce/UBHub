import { describe, it, expect } from 'vitest';
import {
  getTableDisplayMetadata,
  getServerTableMetadata,
  listAvailableTables,
  getEditableTableMetadata,
  assertTableAllowed,
  transformTableForClient,
  getTablesForUser,
  getNavigationMenuForUser,
} from '../services/tableMetadata.js';

describe('tableMetadata', () => {
  describe('listAvailableTables', () => {
    it('returns an array of known table names', () => {
      const tableNames = listAvailableTables();
      expect(Array.isArray(tableNames)).toBe(true);
      expect(tableNames).toContain('locations');
      expect(tableNames).toContain('documents');
      expect(tableNames).toContain('participation');
      expect(tableNames).toContain('mapButtons');
      expect(tableNames).toContain('row_versions');
      expect(tableNames).toContain('users');
    });
  });

  describe('getTableDisplayMetadata', () => {
    it('returns metadata for a known table', () => {
      const metadata = getTableDisplayMetadata('locations');
      expect(metadata).toBeDefined();
      expect(metadata.displayName).toBe('Locations');
      expect(Array.isArray(metadata.columns)).toBe(true);
    });

    it('throws with code UNKNOWN_TABLE for an unknown table', () => {
      expect(() => getTableDisplayMetadata('nonexistent')).toThrowError('Unknown table');
      try {
        getTableDisplayMetadata('nonexistent');
      } catch (error) {
        expect(error.code).toBe('UNKNOWN_TABLE');
      }
    });
  });

  describe('getServerTableMetadata', () => {
    it('returns the same metadata as getTableDisplayMetadata', () => {
      const displayMetadata = getTableDisplayMetadata('documents');
      const serverMetadata = getServerTableMetadata('documents');
      expect(serverMetadata).toEqual(displayMetadata);
    });
  });

  describe('getEditableTableMetadata', () => {
    it('returns editable metadata for an editable table', () => {
      const metadata = getEditableTableMetadata('locations');
      expect(metadata).toBeDefined();
      expect(metadata.primaryKey).toEqual(['id']);
      expect(Array.isArray(metadata.columns)).toBe(true);
      expect(metadata.columns).toContain('inst_title');
    });

    it('returns editable metadata for the users table', () => {
      const metadata = getEditableTableMetadata('users');
      expect(metadata).toBeDefined();
      expect(metadata.primaryKey).toEqual(['email']);
      expect(Array.isArray(metadata.columns)).toBe(true);
      expect(metadata.columns).toContain('email');
      expect(metadata.columns).toContain('alias');
    });

    it('returns undefined for a non-editable table', () => {
      expect(getEditableTableMetadata('nonexistent')).toBeUndefined();
    });
  });

  describe('assertTableAllowed', () => {
    it('does not throw for approval-workflow tables', () => {
      expect(() => assertTableAllowed('locations')).not.toThrow();
      expect(() => assertTableAllowed('documents')).not.toThrow();
      expect(() => assertTableAllowed('participation')).not.toThrow();
      expect(() => assertTableAllowed('mapButtons')).not.toThrow();
    });

    it('throws with code INVALID_TABLE for users (direct endpoint, not approval workflow)', () => {
      expect(() => assertTableAllowed('users')).toThrowError('Invalid table name');
      try {
        assertTableAllowed('users');
      } catch (error) {
        expect(error.code).toBe('INVALID_TABLE');
      }
    });

    it('throws with code INVALID_TABLE for unknown tables', () => {
      expect(() => assertTableAllowed('nonexistent')).toThrowError('Invalid table name');
    });
  });

  describe('transformTableForClient', () => {
    it('returns undefined/null for falsy input', () => {
      expect(transformTableForClient(null)).toBe(null);
      expect(transformTableForClient(undefined)).toBe(undefined);
    });

    it('clones the table definition (does not mutate original)', () => {
      const original = getTableDisplayMetadata('documents');
      const transformed = transformTableForClient(original);
      expect(transformed).not.toBe(original);
      expect(transformed.displayName).toBe(original.displayName);
    });

    it('normalizes cross-reference columns to have a name property', () => {
      const original = getTableDisplayMetadata('documents');
      const transformed = transformTableForClient(original);

      const crossReferenceColumn = transformed.columns.find(
        column => column.crossReferenceTable === 'locations',
      );
      expect(crossReferenceColumn).toBeDefined();
      expect(crossReferenceColumn.name).toBe('inst_title');
    });
  });

  describe('getTablesForUser', () => {
    it('returns no data tables for unauthenticated user', () => {
      const request = { session: {} };
      const tables = getTablesForUser(request);
      expect(Object.keys(tables).length).toBe(0);
    });

    it('returns contributor tables for privilege level 2', () => {
      const request = { session: { user: 'alice', privileges: 2 } };
      const tables = getTablesForUser(request);
      expect(tables.locations).toBeDefined();
      expect(tables.documents).toBeDefined();
      expect(tables.participation).toBeDefined();
      expect(tables.mapButtons).toBeDefined();
      expect(tables.row_versions).toBeDefined();
      expect(tables.users).toBeUndefined();
    });

    it('includes users table for privilege level 3', () => {
      const request = { session: { user: 'charlie', privileges: 3 } };
      const tables = getTablesForUser(request);
      expect(tables.users).toBeDefined();
      expect(tables.locations).toBeDefined();
    });

    it('adds executive columns to users for privilege level 4', () => {
      const request = { session: { user: 'admin', privileges: 4 } };
      const tables = getTablesForUser(request);
      expect(tables.users).toBeDefined();

      const emailColumn = tables.users.columns.find(column => column.name === 'email');
      expect(emailColumn).toBeDefined();
      expect(emailColumn.label).toBe('Email');

      const editButton = tables.users.columns.find(
        column => column.button === 'edit' && column.onClickFunction === 'openEditUserModal',
      );
      expect(editButton).toBeDefined();
    });
  });

  describe('getNavigationMenuForUser', () => {
    it('always includes the Map item', () => {
      const request = { session: {} };
      const menu = getNavigationMenuForUser(request);
      const mapItem = menu.find(item => item.label === 'Map');
      expect(mapItem).toBeDefined();
    });

    it('always includes the Resources item', () => {
      const request = { session: {} };
      const menu = getNavigationMenuForUser(request);
      const resourcesItem = menu.find(item => item.label === 'Resources');
      expect(resourcesItem).toBeDefined();
    });

    it('includes contributor items for privilege level 2', () => {
      const request = { session: { user: 'alice', privileges: 2 } };
      const menu = getNavigationMenuForUser(request);
      const labels = menu.map(item => item.label);
      expect(labels).toContain('Programs');
      expect(labels).toContain('Locations');
      expect(labels).toContain('Documents');
      expect(labels).toContain('Participations');
      expect(labels).toContain('Submissions');
      expect(labels).not.toContain('Users');
    });

    it('includes approver items for privilege level 3', () => {
      const request = { session: { user: 'charlie', privileges: 3 } };
      const menu = getNavigationMenuForUser(request);
      const labels = menu.map(item => item.label);
      expect(labels).toContain('Users');
      expect(labels).toContain('Approvals');
    });

    it('includes executive items for privilege level 4', () => {
      const request = { session: { user: 'admin', privileges: 4 } };
      const menu = getNavigationMenuForUser(request);
      const labels = menu.map(item => item.label);
      expect(labels).toContain('Manage Users');
    });

    it('includes My Profile and UBHubber Resources for authenticated users', () => {
      const request = { session: { user: 'alice', privileges: 1 } };
      const menu = getNavigationMenuForUser(request);
      const labels = menu.map(item => item.label);
      expect(labels).toContain('My Profile');
      expect(labels).toContain('UBHubber Resources');
    });
  });
});


const { sortByName, selectRoster, classKey, termRank } = require('../../utils/studentPhotoBackfill');

describe('studentPhotoBackfill', () => {
  describe('sortByName', () => {
    it('orders by first name, then middle, then surname (case-insensitive)', () => {
      const roster = sortByName([
        { first_name: 'Zawadi', middle_name: 'A', surname: 'Mushi' },
        { first_name: 'Baraka', middle_name: 'A', surname: 'Kimaro' },
        { first_name: 'Baraka', middle_name: 'B', surname: 'Otieno' },
        { first_name: 'baraka', middle_name: 'a', surname: 'Adolf' },
      ]);

      expect(roster.map((s) => `${s.first_name} ${s.middle_name} ${s.surname}`)).toEqual([
        'baraka a Adolf',
        'Baraka A Kimaro',
        'Baraka B Otieno',
        'Zawadi A Mushi',
      ]);
    });
  });

  describe('selectRoster', () => {
    it('uses the single roster for FORM I-IV (no term duplication)', () => {
      const students = [
        { adm_no: 'S2', first_name: 'Neema', term: 'First Term' },
        { adm_no: 'S1', first_name: 'Aaron', term: 'First Term' },
      ];

      const { roster, term, ambiguous } = selectRoster(students, 1);

      expect(ambiguous).toBe(false);
      expect(term).toBe('First Term');
      expect(roster.map((s) => s.adm_no)).toEqual(['S1', 'S2']);
    });

    it('picks the smallest term roster that can hold the deepest photo index', () => {
      // FORM V-style: First Term has 10 students, Second Term only 6, and the
      // deepest photo sits at index 5 — so only the Second Term list fits.
      const firstTerm = Array.from({ length: 10 }, (_, i) => ({
        adm_no: `F${i}`, first_name: `First${String(i).padStart(2, '0')}`, term: 'First Term',
      }));
      const secondTerm = Array.from({ length: 6 }, (_, i) => ({
        adm_no: `S${i}`, first_name: `Second${String(i).padStart(2, '0')}`, term: 'Second Term',
      }));

      const { roster, term } = selectRoster([...firstTerm, ...secondTerm], 5);

      expect(term).toBe('Second Term');
      expect(roster).toHaveLength(6);
      expect(roster.every((s) => s.term === 'Second Term')).toBe(true);
    });

    it('prefers the latest term when two rosters are equally large', () => {
      const students = [
        { adm_no: 'A1', first_name: 'Alpha', term: 'First Term' },
        { adm_no: 'A2', first_name: 'Beta', term: 'First Term' },
        { adm_no: 'B1', first_name: 'Alpha', term: 'Second Term' },
        { adm_no: 'B2', first_name: 'Gamma', term: 'Second Term' },
      ];

      const { term } = selectRoster(students, 1);

      expect(term).toBe('Second Term');
    });

    it('flags the class ambiguous when several rosters fit', () => {
      const students = [
        { adm_no: 'A1', first_name: 'Alpha', term: 'First Term' },
        { adm_no: 'A2', first_name: 'Beta', term: 'First Term' },
        { adm_no: 'B1', first_name: 'Alpha', term: 'Second Term' },
        { adm_no: 'B2', first_name: 'Gamma', term: 'Second Term' },
      ];

      const { ambiguous } = selectRoster(students, 0);

      expect(ambiguous).toBe(true);
    });

    it('returns no roster when every term list is smaller than the deepest photo', () => {
      const students = [
        { adm_no: 'A1', first_name: 'Alpha', term: 'First Term' },
        { adm_no: 'B1', first_name: 'Alpha', term: 'Second Term' },
      ];

      const { roster, ambiguous } = selectRoster(students, 5);

      expect(roster).toBeNull();
      expect(ambiguous).toBe(true);
    });
  });

  describe('classKey / termRank', () => {
    it('builds a stable per-class key', () => {
      expect(classKey({ level: 'FORM I', stream: 'A', year: 2026 })).toBe('FORM I|A|2026');
    });

    it('orders known terms and treats unknown terms as lowest priority', () => {
      expect(termRank('First Term')).toBe(1);
      expect(termRank('Second Term')).toBe(2);
      expect(termRank('Third Term')).toBe(3);
      expect(termRank('')).toBe(0);
      expect(termRank(undefined)).toBe(0);
    });
  });
});

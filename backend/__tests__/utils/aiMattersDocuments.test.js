const {
  ensureAiMattersTable,
  buildAiMattersDocumentsSection,
} = require('../../utils/aiMattersDocuments');

describe('AI Matters document visibility', () => {
  test('ensures a fail-closed publication flag exists', async () => {
    const statements = [];
    const query = jest.fn(async (sql) => {
      statements.push(sql);
      return { rows: [] };
    });

    await ensureAiMattersTable(query);

    const schema = statements.join('\n');
    expect(schema).toContain('is_public BOOLEAN NOT NULL DEFAULT FALSE');
    expect(schema).toContain('ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE');
  });

  test('public context only selects approved documents', async () => {
    const query = jest.fn(async (sql) => {
      if (sql.includes('SELECT name, extracted_text')) {
        return { rows: [{ name: 'Approved fees', extracted_text: 'Tuition TZS 250000' }] };
      }
      return { rows: [] };
    });

    const text = await buildAiMattersDocumentsSection(query, {
      publicOnly: true,
      docLimit: 5,
    });

    const select = query.mock.calls.find(([sql]) => sql.includes('SELECT name, extracted_text'))[0];
    expect(select).toContain('is_public = TRUE');
    expect(text).toContain('Approved fees');
  });

  test('admin context is not restricted to approved documents', async () => {
    const query = jest.fn(async (sql) => {
      if (sql.includes('SELECT name, extracted_text')) {
        return { rows: [{ name: 'Internal notes', extracted_text: 'Confidential draft' }] };
      }
      return { rows: [] };
    });

    const text = await buildAiMattersDocumentsSection(query, {
      heading: 'Admin documents',
    });

    const select = query.mock.calls.find(([sql]) => sql.includes('SELECT name, extracted_text'))[0];
    expect(select).not.toContain('is_public = TRUE');
    expect(text).toContain('Internal notes');
  });
});

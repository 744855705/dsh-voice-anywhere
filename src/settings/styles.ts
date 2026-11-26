/**
 * Inline spacing for the settings page.
 *
 * The component describes behaviour; the numbers live here so the layout can be
 * read (and changed) without scanning the render tree.
 */
export const STYLE = {
  page: { display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' },
  hint: { margin: 0, opacity: 0.72 },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
} as const

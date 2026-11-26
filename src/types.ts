/**
 * Vocabulary shared by the rule and the classifier.
 *
 * It lives here so neither has to import the other: `policy` decides about a
 * kind, `surfaces` produces one, and neither owns the word.
 */

/** Surface families the plugin knows how to place a control on. */
export type SurfaceKind = 'question-card' | 'dialog' | 'shortcuts' | 'plain'

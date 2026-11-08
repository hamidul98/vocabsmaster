import type { Skill } from './progress';
import sources from './driveSources.json';

/**
 * Drive folders linked to Admin Features the first time the admin opens it (the list lives in driveSources.json,
 * which `npm run sync:drive` also reads). Each can be renamed or unlinked afterwards.
 */
export const DRIVE_SOURCES = sources as { skill: Skill; name: string; id: string }[];

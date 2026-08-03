/** Entity constants shared by the world and the stats layer. */
export const HERO_RADIUS = 12;
export const HERO_HP = 5;
export const ENEMY_RADIUS = 11;
/**
 * Hero top speed in pixels per second. Lives here, not in move.ts, because
 * the stats layer needs it for BASE_STATS and move.ts needs statsOf from the
 * stats layer for steerHero — putting the constant in move.ts would make the
 * two modules import each other, and move.ts's own body (which the cycle
 * would still be mid-evaluating) declares this value after that import.
 */
export const HERO_SPEED = 132;

/**
 * Swing timing and base combat numbers, in ticks at 120Hz. Live here, not in
 * combat.ts, for the identical reason HERO_SPEED lives here rather than in
 * move.ts: the stats layer needs these for BASE_STATS, and combat.ts needs
 * statsOf from the stats layer for reachOf/updateAttack. Keeping them in
 * combat.ts would leave stats.ts reading plain consts back out of a module
 * that is still mid-evaluation whenever anything imports combat.ts before
 * stats.ts — the same class of bug HERO_SPEED's relocation fixed, just
 * triggered by a different import order.
 */
export const WINDUP_TICKS = 14;
export const ACTIVE_TICKS = 7;
export const RECOVER_TICKS = 20;
/** Invulnerability after taking a hit, so a crowd cannot chain-delete you. */
export const IFRAME_TICKS = 42;
export const SWING_REACH = 46;
/** Total arc width in radians — generous, because aiming is automatic. */
export const SWING_ARC = Math.PI * 0.7;
export const SWING_DAMAGE = 10;
export const KNOCKBACK = 210;

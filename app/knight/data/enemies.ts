export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  /** Top speed in pixels per second. Slower than the hero, so spacing works. */
  speed: number;
  color: string;
  /** Hearts lost when this enemy touches the hero. */
  touchDamage: number;
}

/** Slice 1 ships exactly one archetype; more arrive with rooms in Slice 2. */
export const GRUNT: EnemyDef = {
  id: "grunt",
  name: "Grunt",
  hp: 30,
  speed: 74,
  color: "#8d5fa0",
  touchDamage: 1,
};

export const ENEMIES: Record<string, EnemyDef> = {
  [GRUNT.id]: GRUNT,
};

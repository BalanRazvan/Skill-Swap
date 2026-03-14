export interface Skill {
  id: string;
  name: string;
  category: string;
}

export type SkillDirection = 'teaching' | 'learning';

export interface UserSkill {
  id: string;
  skill: Skill;
  direction: SkillDirection;
  proficiency_level: number;
  description: string;
  created_at: string;
}

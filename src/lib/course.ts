export type Hole = { n: number; par: number; yards: number; si: number };

export type Course = {
  key: string;
  name: string;
  tee: string;
  rating: number;
  slope: number;
  holes: Hole[];
};

/**
 * The Quarry at Crystal Springs, Gold tees. Pars, yardage and stroke index come
 * from the 18Birdies hole screens. Rating and slope (69.8 / 125) are the
 * published Gold values; change them here if the club updates its ratings.
 */
export const CRYSTAL_SPRINGS_GOLD: Course = {
  key: "crystal-springs-gold",
  name: "The Quarry at Crystal Springs",
  tee: "Gold",
  rating: 69.8,
  slope: 125,
  holes: [
    { n: 1, par: 4, yards: 415, si: 9 },
    { n: 2, par: 3, yards: 170, si: 15 },
    { n: 3, par: 4, yards: 380, si: 7 },
    { n: 4, par: 3, yards: 210, si: 11 },
    { n: 5, par: 4, yards: 397, si: 13 },
    { n: 6, par: 3, yards: 127, si: 17 },
    { n: 7, par: 4, yards: 350, si: 5 },
    { n: 8, par: 5, yards: 497, si: 3 },
    { n: 9, par: 4, yards: 386, si: 1 },
    { n: 10, par: 5, yards: 509, si: 6 },
    { n: 11, par: 4, yards: 410, si: 4 },
    { n: 12, par: 3, yards: 129, si: 18 },
    { n: 13, par: 4, yards: 336, si: 16 },
    { n: 14, par: 3, yards: 186, si: 14 },
    { n: 15, par: 4, yards: 414, si: 2 },
    { n: 16, par: 4, yards: 401, si: 8 },
    { n: 17, par: 5, yards: 500, si: 10 },
    { n: 18, par: 4, yards: 360, si: 12 },
  ],
};

export const COURSES: Record<string, Course> = {
  [CRYSTAL_SPRINGS_GOLD.key]: CRYSTAL_SPRINGS_GOLD,
};

export function getCourse(key: string): Course {
  return COURSES[key] ?? CRYSTAL_SPRINGS_GOLD;
}

export function coursePar(course: Course, holes?: number[]): number {
  return course.holes
    .filter((h) => !holes || holes.includes(h.n))
    .reduce((sum, h) => sum + h.par, 0);
}

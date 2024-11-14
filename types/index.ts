export type Experience = {
    title: string;
    timelineTitle?: string;
    role: string;
    startDate: string;
    endDate: string;
    details: string[];
    link?: string;
};

export type Project = {
    title: string;
    description: string;
    year: string;
    details: string;
    link?: string;
    image: string;
    techStack: string[];
};

export type SkillCategory = {
    [key: string]: string[];
}; 
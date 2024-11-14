export const getTimelinePosition = (date: string): number => {
    const startYear = 2015;
    const now = new Date();
    const targetDate = date === "Present" ? now : new Date(date + "-01");
    const yearDiff = targetDate.getFullYear() - startYear;
    const monthDiff = targetDate.getMonth();
    const totalMonths = (new Date().getFullYear() - startYear) * 12 + new Date().getMonth();
    const dateMonths = yearDiff * 12 + monthDiff;
    return (totalMonths - dateMonths) * 10;
};

export const timelineColors = [
    "border-blue-500",
    "border-green-500",
    "border-purple-500",
    "border-orange-500",
    "border-pink-500"
]; 
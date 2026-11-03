import { assignments, courses, dateFromOffset, events } from '@teddy/shared/data';
import type { CampusEvent, Language, UpcomingItem } from '@teddy/shared';

/** Sample assignments and exams due within `days`, soonest first. */
export function getSampleUpcoming(language: Language, days: number): UpcomingItem[] {
  const fromAssignments = assignments
    .filter((item) => item.offsetDays >= 0 && item.offsetDays <= days)
    .map((item) => ({
      id: item.id,
      type: 'assignment' as const,
      title: item.title[language],
      courseCode: item.courseCode,
      date: dateFromOffset(item.offsetDays),
    }));

  const fromExams = courses.flatMap((course) =>
    course.exams
      .filter((exam) => exam.offsetDays >= 0 && exam.offsetDays <= days)
      .map((exam) => ({
        id: exam.id,
        type: 'exam' as const,
        title: exam.name[language],
        courseCode: course.code,
        date: dateFromOffset(exam.offsetDays),
      })),
  );

  return [...fromAssignments, ...fromExams].sort((a, b) => a.date.localeCompare(b.date));
}

export function getSampleEvents(days: number): CampusEvent[] {
  return events.filter((event) => event.offsetDays >= 0 && event.offsetDays <= days);
}

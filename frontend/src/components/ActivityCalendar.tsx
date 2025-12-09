import type { CSSProperties, ReactElement } from "react";
import { cloneElement } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import type { ActivityMap } from "../hooks/useActivity";

type ActivityTheme = {
  activeColor: string;
  inactiveColor: string;
  emptyColor: string;
  hoverColor: string;
  borderColor: string;
  textColor: string;
  monthLabelColor: string;
  gutter: number;
  squareSize: number;
  radius: number;
  fontFamily: string;
};

const DEFAULT_THEME: ActivityTheme = {
  activeColor: "var(--accent)",
  inactiveColor: "rgba(255, 255, 255, 0.08)",
  emptyColor: "rgba(255, 255, 255, 0.02)",
  hoverColor: "rgba(255, 255, 255, 0.12)",
  borderColor: "rgba(255, 255, 255, 0.08)",
  textColor: "var(--text)",
  monthLabelColor: "var(--text)",
  squareSize: 5,
  gutter: 2,
  radius: 1,
  fontFamily: "var(--sans)",
};

type ActivityCalendarProps = {
  activity: ActivityMap;
  months?: number;
  themeOverrides?: Partial<ActivityTheme>;
  onToggleDay?: (date: string, nextActive: boolean) => void;
};

const MONTH_LABELS: [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type CalendarValue = {
  date: string;
  count: number;
  active: boolean;
};

const clampMonths = (months?: number) => {
  if (!months || Number.isNaN(months)) return 6;
  return Math.max(1, Math.min(12, Math.floor(months)));
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfRange = (monthsBack: number) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
};

const buildValues = (activity: ActivityMap, months: number) => {
  const end = new Date();
  const start = startOfRange(months);
  const values: CalendarValue[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = formatDate(cursor);
    values.push({
      date: iso,
      count: activity[iso] ? 1 : 0,
      active: Boolean(activity[iso]),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return { values, start, end };
};

const isMonthStart = (iso: string) => {
  const parts = iso.split("-");
  const day = Number(parts[2]);
  return day === 1;
};

const LIBRARY_SQUARE_SIZE = 10; // react-calendar-heatmap uses a fixed 10px square internally

export function ActivityCalendar({
  activity,
  months = 6,
  themeOverrides,
  onToggleDay,
}: ActivityCalendarProps) {
  const monthsToRender = clampMonths(months);
  const theme = { ...DEFAULT_THEME, ...(themeOverrides || {}) };
  const { values, start, end } = buildValues(activity, monthsToRender);
  const squareSize = theme.squareSize;
  const desiredGutter = theme.gutter;
  const calendarGutter = desiredGutter + (squareSize - LIBRARY_SQUARE_SIZE);

  const style = {
    "--activity-active": theme.activeColor,
    "--activity-inactive": theme.inactiveColor,
    "--activity-empty": theme.emptyColor,
    "--activity-border": theme.borderColor,
    "--activity-hover": theme.hoverColor,
    "--activity-text": theme.textColor,
    "--activity-month-label": theme.monthLabelColor,
    "--activity-radius": `${theme.radius}px`,
    "--activity-font": theme.fontFamily,
    "--activity-size": `${theme.squareSize}px`,
  } as CSSProperties;

  return (
    <div className="activity-calendar" style={style}>
      <CalendarHeatmap
        startDate={start}
        endDate={end}
        values={values}
        showWeekdayLabels
        showMonthLabels
        horizontal
        gutterSize={calendarGutter}
        monthLabels={MONTH_LABELS}
        classForValue={(value) => {
          if (!value || !value.date) return "activity-cell empty";
          const active = Boolean((value as CalendarValue).active);
          const monthBoundary = isMonthStart(value.date) ? " month-start" : "";
          return `activity-cell ${active ? "active" : "inactive"}${monthBoundary}`;
        }}
        titleForValue={(value) => {
          if (!value || !value.date) return "No activity";
          const active = Boolean((value as CalendarValue).active);
          return `${active ? "Active" : "Inactive"} on ${value.date}`;
        }}
        onClick={(value) => {
          if (!value?.date || !onToggleDay) return;
          const nextActive = !activity[value.date];
          onToggleDay(value.date, nextActive);
        }}
        transformDayElement={(rect: ReactElement<SVGRectElement>) => {
          // Adjust the internal 10px square to match our theme size and gutter.
          const x = (rect.props.x || 0) + (LIBRARY_SQUARE_SIZE - squareSize) / 2;
          const y = (rect.props.y || 0) + (LIBRARY_SQUARE_SIZE - squareSize) / 2;
          return cloneElement(rect, {
            width: squareSize,
            height: squareSize,
            x,
            y,
          });
        }}
      />
    </div>
  );
}

import { DailyRecord, GoalSettings } from '../types';

const STORAGE_KEY = 'profit_master_records';
const GOALS_KEY = 'profit_master_goals';

export const saveRecord = (record: DailyRecord): void => {
  const existing = getRecords();
  const index = existing.findIndex((r) => r.date === record.date);
  
  if (index >= 0) {
    existing[index] = record;
  } else {
    existing.push(record);
  }
  
  // Sort by date descending
  existing.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
};

export const getRecords = (): DailyRecord[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getRecordByDate = (date: string): DailyRecord | undefined => {
  const records = getRecords();
  return records.find((r) => r.date === date);
};

export const saveGoals = (goals: GoalSettings): void => {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
};

export const getGoals = (): GoalSettings => {
  const data = localStorage.getItem(GOALS_KEY);
  return data ? JSON.parse(data) : { weekly: 5000, monthly: 20000, yearly: 240000 };
};

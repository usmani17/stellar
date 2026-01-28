import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { toLocalDateString } from '../utils/dateHelpers';

interface DateRangeContextType {
  startDate: Date;
  endDate: Date;
  /** YYYY-MM-DD in local time – use for API start_date so selected date is preserved */
  startDateStr: string;
  /** YYYY-MM-DD in local time – use for API end_date so selected date is preserved */
  endDateStr: string;
  setDateRange: (startDate: Date, endDate: Date) => void;
  formatDateRange: () => string;
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export const DateRangeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default to last 30 days
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  };

  const [startDate, setStartDate] = useState<Date>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const setDateRange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const formatDateRange = () => {
    const formatDate = (date: Date) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const startDateStr = useMemo(() => toLocalDateString(startDate), [startDate]);
  const endDateStr = useMemo(() => toLocalDateString(endDate), [endDate]);

  const value = useMemo(
    () => ({ startDate, endDate, startDateStr, endDateStr, setDateRange, formatDateRange }),
    [startDate, endDate, startDateStr, endDateStr]
  );

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
};

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
};


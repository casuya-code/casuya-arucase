/**
 * Year and Month Filter Component
 * Reusable component for filtering results by year and month
 */
import React, { useState, useEffect, useMemo } from 'react';
import './YearMonthFilter.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PRE_FORM_ONE_MONTHS = [
  'February', 'March', 'April', 'May', 'June', 'July', 
  'August', 'September', 'October', 'November'
];

const YearMonthFilter = ({ 
  onFilterChange, 
  initialYear = '', 
  initialMonth = 'all',
  showAllMonthsOption = true,
  availableYears = [],
  usePreFormOneMonths = false,
  disabled = false
}) => {
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  const monthsToUse = usePreFormOneMonths ? PRE_FORM_ONE_MONTHS : MONTHS;

  // Generate year options if not provided
  const yearOptions = useMemo(() => {
    if (availableYears.length > 0) {
      return availableYears;
    }
    
    // Generate years from current year back to 5 years ago
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i.toString());
    }
    return years;
  }, [availableYears]);

  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({
        year: selectedYear,
        month: selectedMonth
      });
    }
  }, [selectedYear, selectedMonth]);

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  return (
    <div className="year-month-filter">
      <div className="year-month-filter__group">
        <label htmlFor="year-select" className="year-month-filter__label">
          <i className="fas fa-calendar-alt" aria-hidden="true"></i> Year:
        </label>
        <select
          id="year-select"
          value={selectedYear}
          onChange={handleYearChange}
          className="year-month-filter__select"
          disabled={disabled}
        >
          <option value="">Select Year</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="year-month-filter__group">
        <label htmlFor="month-select" className="year-month-filter__label">
          <i className="fas fa-calendar" aria-hidden="true"></i> Month:
        </label>
        <select
          id="month-select"
          value={selectedMonth}
          onChange={handleMonthChange}
          className="year-month-filter__select"
          disabled={disabled}
        >
          {showAllMonthsOption && <option value="all">All Months</option>}
          {monthsToUse.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default YearMonthFilter;

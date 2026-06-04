import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSchoolYearOptions } from '../../utils/academicYearUtils';
import './Performance.css';

const Performance = () => {
  const years = [...getSchoolYearOptions()].reverse();

  return (
    <div className="performance-page">
      <div className="performance-header">
        <h1>Performance Management</h1>
        <p>Select a year to view and manage performance data</p>
      </div>

      <div className="years-grid">
        {years.map((year) => (
          <Link 
            key={year} 
            to={`/admin/performance/${year}`}
            className="year-card"
          >
            <div className="year-card-content">
              <div className="year-icon">
                <i className="fas fa-calendar-alt"></i>
              </div>
              <div className="year-info">
                <h3>{year}</h3>
                <p>View performance data</p>
              </div>
              <div className="year-arrow">
                <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Performance;

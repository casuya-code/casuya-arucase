/**
 * Shared year picker grid for Form V / Form VI (combinations).
 */
import { Link } from 'react-router-dom';
import { useFormVVIYearOptions } from '../../hooks/useFormVVIYearOptions';
import '../../pages/students/YearSelection.css';

const FormVVIYearGrid = ({
  formLevel,
  stream,
  title,
  backPath,
  getYearLink,
  moduleId,
  actionLabel,
}) => {
  const { years, helpText } = useFormVVIYearOptions(formLevel, stream, { moduleId });

  return (
    <div className="year-selection-page-container">
      <div className="year-selection-card">
        <div className="year-selection-card-header">
          <i className="fas fa-calendar-alt"></i>
          <span>{title}</span>
        </div>
        <div className="year-selection-card-body">
          <p className="form-vvi-year-help">{helpText}</p>
          {years.length === 0 ? (
            <p className="year-selection-empty">
              You do not have access to any years for this class. Contact an administrator.
            </p>
          ) : (
            <div
              className="year-selection-grid"
              style={{ '--year-card-count': years.length }}
            >
              {years.map((yearObj) => (
                <Link
                  key={`${yearObj.year}-${yearObj.role}`}
                  to={getYearLink(yearObj.year)}
                  className="year-selection-card-item"
                  aria-label={`${yearObj.displayRange} ${actionLabel || ''}`}
                  title={yearObj.fullDisplay}
                >
                  <div className="year-selection-number">{yearObj.year}</div>
                  <div className="year-selection-label">
                    {yearObj.displayLabel || `(${yearObj.displayRange})`}
                  </div>
                  {actionLabel ? (
                    <div className="year-selection-sublabel">{actionLabel}</div>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
          {backPath ? (
            <Link to={backPath} className="year-selection-back-btn">
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FormVVIYearGrid;

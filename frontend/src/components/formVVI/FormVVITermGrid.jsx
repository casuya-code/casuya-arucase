/**
 * Term picker for Form V / Form VI after year selection.
 */
import { Link } from 'react-router-dom';
import { getFormVVICardByYear, getFormVVITermChoices } from '../../utils/academicYearUtils';
import '../../pages/academic/MarksConfigTermSelection.css';

const FormVVITermGrid = ({
  displayYear,
  stream,
  formLevel,
  backPath,
  getTermLink,
  _moduleActionLabel = 'Continue',
}) => {
  const yearNum = parseInt(displayYear, 10);
  const card = getFormVVICardByYear(yearNum);
  const termChoices = getFormVVITermChoices(yearNum);

  return (
    <>
      <p className="form-vvi-year-help">
        {formLevel} {stream} · Year <strong>{yearNum}</strong>
        {card ? ` (${card.displayRange})` : ''}. Pick the term that matches when students attend class.
      </p>
      <div className="term-selection-grid">
        {termChoices.map((choice) =>
          choice.valid !== false ? (
            <Link
              key={choice.term}
              to={getTermLink(choice.term)}
              className="term-selection-card-item"
            >
              <div className="term-selection-name">{choice.title}</div>
              <div className="term-selection-subtitle">{choice.subtitle}</div>
              <div className="term-selection-subtitle" style={{ marginTop: 6, fontSize: 12 }}>
                {choice.description}
              </div>
              {choice.recommended ? (
                <span className="form-vvi-term-recommended">Recommended for this year</span>
              ) : null}
            </Link>
          ) : (
            <div
              key={choice.term}
              className="term-selection-card-item form-vvi-term-disabled"
              title={choice.invalidReason}
              aria-disabled="true"
            >
              <div className="term-selection-name">{choice.title}</div>
              <div className="term-selection-subtitle">{choice.subtitle}</div>
              <div className="term-selection-subtitle" style={{ marginTop: 6, fontSize: 12 }}>
                {choice.description}
              </div>
              <span className="form-vvi-term-invalid-label">Not valid for this year</span>
            </div>
          )
        )}
      </div>
      {backPath ? (
        <Link to={backPath} className="excel-btn small secondary" style={{ marginTop: 16 }}>
          <i className="fas fa-arrow-left"></i> Back
        </Link>
      ) : null}
    </>
  );
};

export default FormVVITermGrid;

import PropTypes from 'prop-types';

/**
 * Top-of-page progress bar while a deferred route transition is in flight.
 */
const RouteNavigationProgress = ({ active }) => {
  if (!active) return null;

  return (
    <div
      className="route-navigation-progress"
      role="progressbar"
      aria-label="Loading page"
      aria-busy="true"
    >
      <div className="route-progress-bar" />
    </div>
  );
};

RouteNavigationProgress.propTypes = {
  active: PropTypes.bool.isRequired,
};

export default RouteNavigationProgress;

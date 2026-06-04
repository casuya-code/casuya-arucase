import PropTypes from 'prop-types';

/**
 * Button / link-styled control with a visible busy state (spinner + disabled).
 */
const LoadingButton = ({
  loading = false,
  children,
  className = '',
  icon,
  iconPosition = 'start',
  loadingLabel,
  ...rest
}) => {
  const busy = Boolean(loading);
  const classes = ['excel-btn', className, busy ? 'is-busy' : ''].filter(Boolean).join(' ');

  const spinner = busy ? (
    <i className="fas fa-spinner fa-spin" aria-hidden="true" />
  ) : icon ? (
    <i className={icon} aria-hidden="true" />
  ) : null;

  const label = busy && loadingLabel ? loadingLabel : children;

  return (
    <button
      type="button"
      className={classes}
      disabled={busy || rest.disabled}
      aria-busy={busy || undefined}
      {...rest}
    >
      {iconPosition === 'start' && spinner}
      {label}
      {iconPosition === 'end' && spinner}
    </button>
  );
};

LoadingButton.propTypes = {
  loading: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
  icon: PropTypes.string,
  iconPosition: PropTypes.oneOf(['start', 'end']),
  loadingLabel: PropTypes.node,
};

export default LoadingButton;

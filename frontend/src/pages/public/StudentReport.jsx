import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import './StudentReport.css';

const REPORT_ITEMS = [
  'Alama za masomo na nafasi/utendaji wa mwanafunzi',
  'Taarifa ya nafasi ya muhula na utendaji wa jumla',
  'Maoni ya walimu kwa kila somo',
  'Maoni ya darasa kuhusu maendeleo ya mwanafunzi',
  'Ushauri wa walezi juu ya mwanafunzi',
  'Maoni ya Mkuu wa Shule',
  'Tathmini ya kiroho',
  'Tathmini ya kazi za mikono',
  'Tathmini ya Michezo na mahusiano mema na wengine',
  'Taarifa za tabia na mwenendo wa nidhamu',
];

const SCHEDULE_ITEMS = [
  'Ripoti za kila mwezi',
  'Ripoti za katikati ya muhula',
  'Ripoti za mwisho wa muhula',
  'Ripoti ya mwaka',
];

const ACCESS_ITEMS = [
  'Nakala zinazosambazwa mwisho wa muhula',
  'Mikutano ya wazazi na walimu',
  'Mfumo wa mtandao',
];

const StudentReport = () => (
  <PublicLayout>
    <div className="sr-page-static">
      <div className="sr-page-static__inner">

        <header className="sr-hero">
          <h1 className="sr-hero__title">Ripoti za Wanafunzi</h1>
          <p className="sr-hero__lead">
            Ingia kwa akaunti yako kuona ripoti za masomo, matokeo, na taarifa za mwanafunzi.
          </p>
          <div className="sr-hero__actions">
            <Link to="/student-login" className="sr-hero__btn sr-hero__btn--primary">
              <i className="fas fa-sign-in-alt"></i>
              Ingia kuona ripoti
            </Link>
          </div>
        </header>

        <section className="sr-section">
          <h2 className="sr-section__title">Muundo wa Ripoti</h2>
          <p className="sr-section__intro">Ripoti za wanafunzi hujumuisha:</p>
          <ul className="sr-list">
            {REPORT_ITEMS.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <div className="sr-cards-grid">
          <article className="sr-card-static">
            <div className="sr-card-static__icon-box">
              <i className="fas fa-calendar-alt"></i>
            </div>
            <h3 className="sr-card-static__title">Ratiba ya Kupata Ripoti</h3>
            <ul className="sr-card-static__list">
              {SCHEDULE_ITEMS.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="sr-card-static">
            <div className="sr-card-static__icon-box">
              <i className="fas fa-download"></i>
            </div>
            <h3 className="sr-card-static__title">Upatikanaji wa Ripoti</h3>
            <ul className="sr-card-static__list">
              {ACCESS_ITEMS.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="sr-card-static sr-card-static--contact">
            <div className="sr-card-static__icon-box">
              <i className="fas fa-question-circle"></i>
            </div>
            <h3 className="sr-card-static__title">Maswali Kuhusu Ripoti</h3>
            <p className="sr-card-static__text">
              Kwa maswali kuhusu ripoti, wasiliana na ofisi ya shule:
            </p>
            <div className="sr-contact-links">
              <a href="mailto:arucase@gmail.com" className="sr-contact-link">
                <i className="fas fa-envelope"></i>
                arucase@gmail.com
              </a>
              <a href="tel:+255765394802" className="sr-contact-link">
                <i className="fas fa-phone"></i>
                +255 765 394 802
              </a>
            </div>
          </article>
        </div>

      </div>
    </div>
  </PublicLayout>
);

export default StudentReport;

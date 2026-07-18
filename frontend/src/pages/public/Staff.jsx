import PublicLayout from '../../components/layout/PublicLayout';
import StaffDirectory from './StaffDirectory';
import './Staff.css';

const Staff = () => (
  <PublicLayout>
    <div className="staff-page-static">
      <div className="staff-page-static__inner">

        <header className="staff-hero">
          <div className="staff-hero__inner">
            <h1 className="staff-hero__title">Watumishi</h1>
            <p className="staff-hero__lead">
              Walimu, mapadre, na watumishi wanaoleta malezi ya kiroho na mafundisho bora.
            </p>
          </div>
        </header>

        <div className="staff-grid-cards">
          <article className="staff-card-static">
            <div className="staff-card-static__icon-box">
              <i className="fas fa-user-tie"></i>
            </div>
            <h3 className="staff-card-static__title">Uongozi</h3>
            <p className="staff-card-static__text">
              Seminari inaongozwa na timu ya Mapadre na Watumishi walei waliobobea katika malezi
              ya jumla ya wanafunzi.
            </p>
          </article>

          <article className="staff-card-static">
            <div className="staff-card-static__icon-box">
              <i className="fas fa-chalkboard-user"></i>
            </div>
            <h3 className="staff-card-static__title">Watumishi wa Taaluma</h3>
            <p className="staff-card-static__text">
              Walimu wetu ni wenye sifa na uzoefu katika taaluma zao, wakijitoa kukuza ubora wa
              masomo na malezi ya kiroho.
            </p>
          </article>

          <article className="staff-card-static">
            <div className="staff-card-static__icon-box">
              <i className="fas fa-heart"></i>
            </div>
            <h3 className="staff-card-static__title">Timu ya Malezi</h3>
            <p className="staff-card-static__text">
              Timu ya malezi huwasaidia wanafunzi kukua katika maisha ya imani, maadili, na
              utambuzi wa wito wao.
            </p>
          </article>
        </div>

        <section className="staff-support-section">
          <h2 className="staff-support-section__title">Watumishi Wasaidizi</h2>
          <ul className="staff-support-list">
            <li className="staff-support-list__item">
              <i className="fas fa-wrench"></i>
              <span>Matengenezo na usimamizi wa miundombinu</span>
            </li>
            <li className="staff-support-list__item">
              <i className="fas fa-utensils"></i>
              <span>Jikoni na huduma za chakula</span>
            </li>
            <li className="staff-support-list__item">
              <i className="fas fa-book"></i>
              <span>Maktaba na kituo cha rasilimali</span>
            </li>
            <li className="staff-support-list__item">
              <i className="fas fa-file-pen"></i>
              <span>Huduma za utawala</span>
            </li>
            <li className="staff-support-list__item">
              <i className="fas fa-stethoscope"></i>
              <span>Huduma za afya</span>
            </li>
          </ul>
        </section>

        <section className="staff-dev-card">
          <div className="staff-dev-card__icon">
            <i className="fas fa-arrow-trend-up"></i>
          </div>
          <div className="staff-dev-card__text">
            <h3 className="staff-dev-card__title">Maendeleo ya Watumishi</h3>
            <p className="staff-dev-card__body">
              Seminari inaendeleza mafunzo endelevu kwa watumishi wote ili kuimarisha ubora wa
              elimu na malezi.
            </p>
          </div>
        </section>

        <StaffDirectory />
      </div>
    </div>
  </PublicLayout>
);

export default Staff;

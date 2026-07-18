import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import './Admissions.css';

const Admissions = () => (
  <PublicLayout>
    <div className="admissions-page-static">
      <div className="admissions-page-static__inner">

        <header className="admissions-hero">
          <div className="admissions-hero__inner">
            <p className="admissions-hero__eyebrow">ARUCASE</p>
            <h1 className="admissions-hero__title">Udahili</h1>
            <p className="admissions-hero__lead">
              Vigezo, utaratibu wa maombi, na taarifa za kuwasiliana — yote hapa chini.
            </p>
            <div className="admissions-hero__actions">
              <Link to="/admissions/apply" className="admissions-hero__btn admissions-hero__btn--primary">
                <i className="fas fa-file-signature"></i>
                Omba Udahili / Apply Online
              </Link>
              <a href="tel:+255765394802" className="admissions-hero__btn">
                <i className="fas fa-phone"></i>
                +255 765 394 802
              </a>
            </div>
          </div>
        </header>

        <section className="admissions-requirements">
          <h2 className="admissions-requirements__title">Vigezo vya Udahili</h2>
          <p className="admissions-requirements__intro">
            Arusha Catholic Seminary-Oldonyosambu inapokea vijana wa kiume wenye nia ya kweli ya
            malezi ya wito wa Upadre. Hivi ni vigezo vya msingi vya udahili:
          </p>
          <ul className="admissions-checklist">
            <li>Cheti cha ubatizo na Kipaimara.</li>
            <li>Nakala ya matokeo ya masomo kutoka shule aliyosoma.</li>
            <li>Barua ya utambulisho kutoka kwa Padre wa Parokia.</li>
            <li>Cheti cha uchunguzi wa afya.</li>
            <li>Cheti cha kuzaliwa.</li>
            <li>Picha ndogo za pasipoti (nakala 4).</li>
          </ul>
        </section>

        <section className="admissions-steps-section">
          <h2 className="admissions-steps-section__title">Utaratibu wa Kutuma Maombi</h2>
          <p className="admissions-steps-section__intro">
            Ili kuomba kujiunga na Seminari yetu, fuata hatua hizi 6:
          </p>
          <div className="admissions-steps-grid">
            <div className="admissions-step-card">
              <span className="admissions-step-card__num">1</span>
              <div className="admissions-step-card__body">
                <strong>Pata Fomu ya Maombi:</strong> Pakua mtandaoni au chukua ofisini
                seminari-Oldonyosambu.
              </div>
            </div>
            <div className="admissions-step-card">
              <span className="admissions-step-card__num">2</span>
              <div className="admissions-step-card__body">
                <strong>Jaza Fomu ya Maombi:</strong> Jaza taarifa zote zinazohitajika kwa usahihi.
              </div>
            </div>
            <div className="admissions-step-card">
              <span className="admissions-step-card__num">3</span>
              <div className="admissions-step-card__body">
                <strong>Wasilisha Nyaraka:</strong> Wasilisha nyaraka zote zinazotakiwa pamoja na
                fomu yako.
              </div>
            </div>
            <div className="admissions-step-card">
              <span className="admissions-step-card__num">4</span>
              <div className="admissions-step-card__body">
                <strong>Mtihani wa Kuingia:</strong> Hudhuria mtihani wa kuingia uliopangwa.
              </div>
            </div>
            <div className="admissions-step-card">
              <span className="admissions-step-card__num">5</span>
              <div className="admissions-step-card__body">
                <strong>Mahojiano:</strong> Shiriki mahojiano na kamati ya udahili.
              </div>
            </div>
            <div className="admissions-step-card">
              <span className="admissions-step-card__num">6</span>
              <div className="admissions-step-card__body">
                <strong>Uamuzi wa Udahili:</strong> Pokea taarifa ya matokeo ya maombi yako.
              </div>
            </div>
          </div>
        </section>

        <section className="admissions-dates">
          <h2 className="admissions-dates__title">Tarehe Muhimu</h2>
          <div className="admissions-dates-grid">
            <div className="admissions-date-item">
              <span className="admissions-date-item__label">Kipindi cha Maombi</span>
              <span className="admissions-date-item__value">Januari - Machi</span>
            </div>
            <div className="admissions-date-item">
              <span className="admissions-date-item__label">Mitihani ya Kuingia</span>
              <span className="admissions-date-item__value">Aprili</span>
            </div>
            <div className="admissions-date-item">
              <span className="admissions-date-item__label">Mahojiano</span>
              <span className="admissions-date-item__value">Mei</span>
            </div>
            <div className="admissions-date-item">
              <span className="admissions-date-item__label">Barua za Udahili</span>
              <span className="admissions-date-item__value">Juni</span>
            </div>
            <div className="admissions-date-item">
              <span className="admissions-date-item__label">Mafunzo ya Utangulizi</span>
              <span className="admissions-date-item__value">Mwishoni mwa Juni</span>
            </div>
            <div className="admissions-date-item">
              <span className="admissions-date-item__label">Mwaka wa Masomo Unaaza</span>
              <span className="admissions-date-item__value">Julai</span>
            </div>
          </div>
        </section>

        <section className="admissions-contact">
          <div className="admissions-contact__icon">
            <i className="fas fa-address-card"></i>
          </div>
          <div className="admissions-contact__text">
            <h2 className="admissions-contact__title">Wasiliana na Ofisi ya Udahili</h2>
            <p className="admissions-contact__body">
              Kwa maelezo zaidi kuhusu udahili, tafadhali wasiliana nasi:
            </p>
            <div className="admissions-contact__details">
              <a href="mailto:arucase@gmail.com" className="admissions-contact__link">
                <i className="fas fa-envelope"></i>
                arucase@gmail.com
              </a>
              <a href="tel:+255765394802" className="admissions-contact__link">
                <i className="fas fa-phone"></i>
                +255 765 394 802
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  </PublicLayout>
);

export default Admissions;

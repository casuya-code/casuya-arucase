import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import './About.css';

const About = () => (
  <PublicLayout>
    <div className="about-page-static">
      <div className="about-page-static__inner">

        <header className="about-hero">
          <div className="about-hero__inner">
            <h1 className="about-hero__title">Kuhusu Sisi</h1>
            <p className="about-hero__lead">
              Historia, dhamira, maono, na tunu za msingi za Seminari ya Kikatoliki Arusha.
            </p>
          </div>
        </header>

        <section className="about-intro-card">
          <div className="about-intro-card__inner">
            <h2 className="about-intro-card__title">Kuhusu Seminari ya Kikatoliki Arusha</h2>
            <p className="about-intro-card__text">
              Seminari ya Kikatoliki Arusha ni shule ya sekondari ya Kikatoliki iliyoanzishwa mwaka 1967
              Oldonyosambu, Tanzania. Tunatoa elimu bora ya Kikatoliki na malezi ya kiroho kwa vijana
              wa kiume wanaotamani kulitumikia Kanisa na jamii.
            </p>
          </div>
        </section>

        <div className="about-grid-cards">
          <article className="about-card-static">
            <div className="about-card-static__icon-box">
              <i className="fas fa-book-open"></i>
            </div>
            <h3 className="about-card-static__title">Historia Yetu</h3>
            <p className="about-card-static__text">
              Seminari ya Kikatoliki Arusha ilianzishwa mwaka 1967 ikiwa na dhamira ya kutoa elimu
              bora ya Kikatoliki na malezi ya kiroho kwa vijana wa kiume wanaotamani kulitumikia
              Kanisa na jamii. Kwa zaidi ya miongo mitano, tumekuwa tukilea akili na roho katikati
              ya Tanzania.
            </p>
          </article>

          <article className="about-card-static">
            <div className="about-card-static__icon-box">
              <i className="fas fa-bullseye"></i>
            </div>
            <h3 className="about-card-static__title">Dhamira Yetu</h3>
            <p className="about-card-static__text">
              Kuwajenga vijana wa kiume wawe wakomavu kiroho, wabora kitaaluma, na wenye maadili
              mema ili wawe viongozi wa baadaye katika Kanisa Katoliki na jamii kwa ujumla.
            </p>
          </article>

          <article className="about-card-static">
            <div className="about-card-static__icon-box">
              <i className="fas fa-eye"></i>
            </div>
            <h3 className="about-card-static__title">Maono Yetu</h3>
            <p className="about-card-static__text">
              Kuwa kituo bora cha elimu ya seminari ya Kikatoliki kinachozalisha watu waliokamilika
              wanaoishi tunu za imani, maarifa, na utumishi.
            </p>
          </article>
        </div>

        <section className="about-values-section">
          <h2 className="about-values-section__title">Tunu za Msingi</h2>
          <div className="about-values-grid">
            <div className="about-value-item">
              <div className="about-value-item__icon">
                <i className="fas fa-cross"></i>
              </div>
              <h4 className="about-value-item__title">Imani</h4>
              <p className="about-value-item__text">Kukuza uhusiano na Mungu kupitia sala na sakramenti</p>
            </div>
            <div className="about-value-item">
              <div className="about-value-item__icon">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <h4 className="about-value-item__title">Ubora wa Kitaaluma</h4>
              <p className="about-value-item__text">Kutafuta maarifa kwa bidii na uadilifu</p>
            </div>
            <div className="about-value-item">
              <div className="about-value-item__icon">
                <i className="fas fa-hand-fist"></i>
              </div>
              <h4 className="about-value-item__title">Nidhamu</h4>
              <p className="about-value-item__text">Kukuza kujitawala na kuwajibika</p>
            </div>
            <div className="about-value-item">
              <div className="about-value-item__icon">
                <i className="fas fa-hands-helping"></i>
              </div>
              <h4 className="about-value-item__title">Utumishi</h4>
              <p className="about-value-item__text">Kumtumikia Mungu na wanadamu kwa unyenyekevu na upendo</p>
            </div>
            <div className="about-value-item">
              <div className="about-value-item__icon">
                <i className="fas fa-users"></i>
              </div>
              <h4 className="about-value-item__title">Jumuiya</h4>
              <p className="about-value-item__text">Kujenga undugu na umoja miongoni mwa wanafunzi wa seminari</p>
            </div>
          </div>
        </section>

        <section className="about-patron-card">
          <div className="about-patron-card__icon">
            <i className="fas fa-shield-halved"></i>
          </div>
          <div className="about-patron-card__text">
            <h3 className="about-patron-card__title">Mlinzi Wetu</h3>
            <p className="about-patron-card__body">
              Seminari iko chini ya ulinzi wa <strong>Mtakatifu Thomas wa Akwino</strong>.
            </p>
          </div>
        </section>

      </div>
    </div>
  </PublicLayout>
);

export default About;

import PublicLayout from '../../components/layout/PublicLayout';
import './StudentLife.css';

const SCHEDULE = [
  { time: '05:30', label: 'Sala ya Asubuhi na Misa' },
  { time: '07:00', label: 'Kiamsha kinywa' },
  { time: '08:00 - 10:30', label: 'Vipindi vya masomo' },
  { time: '10:30 - 11:10', label: 'Mapumziko ya chai' },
  { time: '11:10 - 13:10', label: 'Vipindi vya masomo' },
  { time: '13:10', label: 'Chakula cha mchana' },
  { time: '14:10 - 16:10', label: 'Kujisomea / shughuli binafsi' },
  { time: '16:00 - 18:00', label: 'Michezo, Kazi na mapumziko' },
  { time: '18:30', label: 'Chakula cha jioni' },
  { time: '19:30', label: 'Kujisomea jioni' },
  { time: '21:00', label: 'Sala ya usiku' },
  { time: '22:00', label: 'Kulala' },
];

const SPIRITUAL = [
  'Misa ya kila siku na ibada ya Ekaristi',
  'Sala za asubuhi na jioni',
  'Kitubio cha kila wiki',
  'Uongozi wa kiroho na ushauri',
  'Mafungo ya kiroho',
];

const EXTRAS = [
  'Kazi za mikono',
  'Kwaya na huduma ya muziki',
  'Michezo',
  'Klabu ya mdahalo',
  'Uhifadhi wa mazingira',
  'Miradi ya huduma kwa jamii',
];

const FACILITIES = [
  'Kanisa na sehemu za sala',
  'Madarasa yenye vifaa vya kutosha',
  'Maktaba na maabara ya kompyuta',
  'Viwanja na kumbi za michezo',
  'Mabweni',
  'Ukumbi wa chakula',
  'Maabara ya Chemistry, Physics, na Biology kwa O-level na A-level',
];

const StudentLife = () => (
  <PublicLayout>
    <div className="sl-page-static">
      <div className="sl-page-static__inner">

        <header className="sl-hero">
          <h1 className="sl-hero__title">Maisha ya Wanafunzi</h1>
          <p className="sl-hero__lead">
            Shughuli za kila siku, ibada, michezo, na maisha ya jumuiya ya seminari.
          </p>
        </header>

        <section className="sl-schedule">
          <h2 className="sl-schedule__title">Ratiba ya Kila Siku</h2>
          <p className="sl-schedule__intro">
            Maisha ya seminari yanafuata ratiba iliyopangiliwa inayoweka uwiano kati ya sala,
            masomo, kazi, michezo na mapumziko:
          </p>
          <div className="sl-schedule-grid">
            {SCHEDULE.map((item, i) => (
              <div key={i} className="sl-schedule-item">
                <span className="sl-schedule-item__time">{item.time}</span>
                <span className="sl-schedule-item__label">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="sl-cards-grid">
          <article className="sl-card-static">
            <div className="sl-card-static__icon-box">
              <i className="fas fa-cross"></i>
            </div>
            <h3 className="sl-card-static__title">Maisha ya Kiroho</h3>
            <ul className="sl-card-static__list">
              {SPIRITUAL.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="sl-card-static">
            <div className="sl-card-static__icon-box">
              <i className="fas fa-futbol"></i>
            </div>
            <h3 className="sl-card-static__title">Shughuli za Ziada</h3>
            <ul className="sl-card-static__list">
              {EXTRAS.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="sl-card-static">
            <div className="sl-card-static__icon-box">
              <i className="fas fa-building"></i>
            </div>
            <h3 className="sl-card-static__title">Miundombinu na Huduma</h3>
            <ul className="sl-card-static__list">
              {FACILITIES.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </article>
        </div>

      </div>
    </div>
  </PublicLayout>
);

export default StudentLife;

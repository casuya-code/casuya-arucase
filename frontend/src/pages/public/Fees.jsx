import PublicLayout from '../../components/layout/PublicLayout';
import './Fees.css';

const FEE_COMPONENTS = [
  'Masomo na ufundishaji',
  'Malazi (bweni)',
  'Chakula (milo minne kwa siku)',
  'Vifaa vya kujifunzia',
  'Huduma za afya',
  'Programu za malezi ya kiroho',
  'Shughuli za ziada',
];

const EXTRA_COSTS = [
  'Sare za shule na mahitaji binafsi',
  'Ada za mitihani (mitihani ya serikali)',
  'Ziara za masomo na matembezi ya hiari',
  'Gharama binafsi za matibabu',
];

const Fees = () => (
  <PublicLayout>
    <div className="fees-page-static">
      <div className="fees-page-static__inner">

        <header className="fees-hero">
          <h1 className="fees-hero__title">Ada ya Shule</h1>
          <p className="fees-hero__lead">
            Muundo wa ada, malipo, na taarifa za kifedha kwa wanafunzi na wazazi.
          </p>
        </header>

        <section className="fees-intro-card">
          <h2 className="fees-intro-card__title">Ada ya Shule</h2>
          <p className="fees-intro-card__text">
            Ada za Seminari yetu zinahusisha masomo, malazi, chakula, vifaa vya kujifunzia,
            huduma za afya, programu za malezi ya kiroho, na shughuli za ziada. Chaguo za
            malipo ni kulipa kwa pamoja, au kwa muhula.
          </p>
        </section>

        <section className="fees-annual">
          <h2 className="fees-annual__title">Ada ya Mwaka</h2>
          <p className="fees-annual__text">
            Seminari inajitahidi kudumisha ada zinazomudu kwa wazazi huku ikihakikisha ubora
            wa elimu na malezi. Muundo wa ada unahusisha:
          </p>
        </section>

        <div className="fees-cards-grid">
          <article className="fees-card-static">
            <div className="fees-card-static__icon-box">
              <i className="fas fa-receipt"></i>
            </div>
            <h3 className="fees-card-static__title">Vipengele vya Ada</h3>
            <ul className="fees-card-static__list">
              {FEE_COMPONENTS.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="fees-card-static">
            <div className="fees-card-static__icon-box">
              <i className="fas fa-calendar-check"></i>
            </div>
            <h3 className="fees-card-static__title">Ratiba ya Malipo</h3>
            <ul className="fees-card-static__list">
              <li><strong>Malipo yote kwa pamoja:</strong> Mwanzo wa mwaka wa masomo</li>
              <li><strong>Malipo kwa muhula:</strong> Mwanzo wa kila muhula (awamu 2)</li>
            </ul>
          </article>

          <article className="fees-card-static">
            <div className="fees-card-static__icon-box">
              <i className="fas fa-money-bill-transfer"></i>
            </div>
            <h3 className="fees-card-static__title">Njia za Malipo</h3>
            <ul className="fees-card-static__list">
              <li>Uhamisho wa benki kwenda akaunti ya seminari</li>
            </ul>
          </article>
        </div>

        <section className="fees-extra">
          <h2 className="fees-extra__title">Gharama za Ziada</h2>
          <p className="fees-extra__text">
            Wanafunzi wanaweza kuwa na gharama za ziada kwa:
          </p>
          <ul className="fees-extra-list">
            {EXTRA_COSTS.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

      </div>
    </div>
  </PublicLayout>
);

export default Fees;

/**
 * Page hero: school name (eyebrow) from School Branding; title from Public Pages row title.
 */
import { Link } from 'react-router-dom';
import { settingValue } from '../../utils/publicPageContent';

function PublicCmsHero({ eyebrow, title, lead, actions, titleIcon = null, className = '' }) {
  if (!title && !eyebrow && !lead && !actions) return null;

  const titleClass = titleIcon
    ? 'public-cms-hero__title public-cms-hero__title--with-icon'
    : 'public-cms-hero__title';

  return (
    <header className={`public-cms-hero ${className}`.trim()}>
      <div className="public-cms-hero__inner">
        <div className="public-cms-hero__text">
          {eyebrow ? <p className="public-cms-hero__eyebrow">{eyebrow}</p> : null}
          {title ? (
            <h1 className={titleClass}>
              {titleIcon ? <i className={titleIcon} aria-hidden /> : null}
              {title}
            </h1>
          ) : null}
          {lead ? <p className="public-cms-hero__lead">{lead}</p> : null}
        </div>
        {actions ? <div className="public-cms-hero__cta">{actions}</div> : null}
      </div>
    </header>
  );
}

export default function PublicPageHero({ page, fallbackTitle, settings, variant = 'default' }) {
  const eyebrow = settingValue(settings, 'school_name');
  const title =
    (page?.title && String(page.title).trim()) ||
    (fallbackTitle && String(fallbackTitle).trim()) ||
    '';

  const contactPhone = settingValue(settings, 'contact_phone');
  const contactEmail = settingValue(settings, 'contact_email');
  const contactWhatsapp = settingValue(settings, 'contact_whatsapp');
  const whatsappNumber = contactWhatsapp.replace(/[+\s]/g, '');
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';

  if (!title && !eyebrow) return null;

  switch (variant) {
    case 'admissions':
      return (
        <PublicCmsHero
          eyebrow={eyebrow}
          title={title}
          lead="Vigezo, utaratibu wa maombi, na taarifa za kuwasiliana — yote hapa chini."
          actions={
            <>
              <Link to="/admissions/apply" className="public-cms-hero__btn public-cms-hero__btn--primary">
                <i className="fas fa-file-signature" aria-hidden />
                Omba Udahili / Apply Online
              </Link>
              {contactPhone ? (
                <a
                  href={`tel:${contactPhone.replace(/\s/g, '')}`}
                  className="public-cms-hero__btn"
                >
                  <i className="fas fa-phone" aria-hidden />
                  {contactPhone}
                </a>
              ) : null}
            </>
          }
        />
      );
    case 'about':
      return (
        <PublicCmsHero
          eyebrow={eyebrow}
          title={title}
          lead="Historia, dhamira, maono, na tunu za msingi za Seminari ya Kikatoliki Arusha."
        />
      );
    case 'contact':
      return (
        <PublicCmsHero
          eyebrow={eyebrow}
          title={title}
          lead="Wasiliana nasi kwa simu, barua pepe, au WhatsApp — ofisi yetu iko chini na ramani."
          actions={
            <>
              {contactPhone ? (
                <a
                  href={`tel:${contactPhone.replace(/\s/g, '')}`}
                  className="public-cms-hero__btn"
                >
                  <i className="fas fa-phone" aria-hidden />
                  {contactPhone}
                </a>
              ) : null}
              {contactEmail ? (
                <a href={`mailto:${contactEmail}`} className="public-cms-hero__btn">
                  <i className="fas fa-envelope" aria-hidden />
                  Barua pepe
                </a>
              ) : null}
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="public-cms-hero__btn public-cms-hero__btn--whatsapp"
                >
                  <i className="fab fa-whatsapp" aria-hidden />
                  WhatsApp
                </a>
              ) : null}
            </>
          }
        />
      );
    case 'staff':
      return (
        <PublicCmsHero
          eyebrow={eyebrow}
          title={title}
          lead="Walimu, mapadre, na watumishi wanaoleta malezi ya kiroho na mafundisho bora."
        />
      );
    case 'fees':
      return (
        <PublicCmsHero
          eyebrow={eyebrow}
          title={title}
          lead="Muundo wa ada, malipo, na taarifa za kifedha kwa wanafunzi na wazazi."
        />
      );
    case 'student-life':
      return (
        <PublicCmsHero
          eyebrow={eyebrow}
          title={title}
          lead="Shughuli za kila siku, ibada, michezo, na maisha ya jumuiya ya seminari."
        />
      );
    case 'privacy':
      return (
        <PublicCmsHero
          eyebrow={eyebrow}
          title={title}
          titleIcon="fas fa-shield-alt"
          lead="Jinsi tunavyokusanya, kutumia, na kulinda taarifa zako unapotumia tovuti hii."
        />
      );
    case 'student-report':
      return (
        <PublicCmsHero
          eyebrow={eyebrow}
          title={title}
          lead="Ingia kwa akaunti yako kuona ripoti za masomo, matokeo, na taarifa za mwanafunzi."
          actions={
            <Link to="/student-login" className="public-cms-hero__btn public-cms-hero__btn--primary">
              <i className="fas fa-sign-in-alt" aria-hidden />
              Ingia kuona ripoti
            </Link>
          }
        />
      );
    case 'admissions-apply':
      return (
        <PublicCmsHero
          title="Maombi ya Udahili"
          titleIcon="fas fa-file-signature"
          lead='Jisajili kwa kutumia barua pepe na namba ya simu, kisha tunza neno lako la siri kwa usalama. Baada ya kujisajili, bonyeza "Ingia" ili kujaza na kutuma fomu ya maombi. Fuatilia akaunti yako mara kwa mara kuona majibu na maelekezo yatakayotolewa na Ofisi ya Udahili.'
          actions={
            <Link to="/admissions" className="public-cms-hero__btn">
              <i className="fas fa-arrow-left" aria-hidden />
              Rudi Udahili
            </Link>
          }
        />
      );
    default:
      return (
        <PublicCmsHero
          eyebrow={eyebrow}
          title={title}
        />
      );
  }
}

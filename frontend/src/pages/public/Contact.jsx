/**
 * Contact — prose from Public Pages (contact slug); phones/emails/hours from Site & Contacts.
 */
import { useQuery } from '@tanstack/react-query';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import { getGoogleMapsEmbedSrc } from '../../utils/googleMapsEmbed';
import { PublicCmsEmpty, PublicCmsPreparedBlock, usePublicPage } from '../../components/public/PublicCmsPage';
import PublicPageHero from '../../components/public/PublicPageHero';
import { hasPublishedPage, settingValue } from '../../utils/publicPageContent';
import './Contact.css';

const Contact = () => {
  const { data: contactPageData, isLoading: cmsLoading } = usePublicPage('contact');
  const contactPage = contactPageData?.data?.page;
  const hasContactCms = hasPublishedPage(contactPage);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      const res = await publicAPI.getHomepage();
      return res.data?.settings || {};
    },
    staleTime: 10 * 60 * 1000,
  });

  if (cmsLoading || settingsLoading) {
    return (
      <PublicLayout>
        <Loading message="Inapakia ukurasa wa mawasiliano..." />
      </PublicLayout>
    );
  }

  const contactAddress = settingValue(settings, 'contact_address');
  const contactPhone = settingValue(settings, 'contact_phone');
  const contactEmail = settingValue(settings, 'contact_email');
  const contactWhatsapp = settingValue(settings, 'contact_whatsapp');
  const whatsappNumber = contactWhatsapp.replace(/[+\s]/g, '');
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '';
  const socialLocation = settingValue(settings, 'social_location');
  const mapEmbedSrc = getGoogleMapsEmbedSrc(socialLocation);
  const socialYoutube = settingValue(settings, 'social_youtube');
  const socialFacebook = settingValue(settings, 'social_facebook');
  const socialInstagram = settingValue(settings, 'social_instagram');
  const socialTwitter = settingValue(settings, 'social_twitter');
  const admissionsEmail = settingValue(settings, 'admissions_email');
  const academicsEmail = settingValue(settings, 'academics_email');
  const bursarEmail = settingValue(settings, 'bursar_email');
  const alumniEmail = settingValue(settings, 'alumni_email');
  const parentsEmail = settingValue(settings, 'parents_email');

  const officeWeekdays = settingValue(settings, 'office_weekdays');
  const officeSaturday = settingValue(settings, 'office_saturday');
  const officeSunday = settingValue(settings, 'office_sunday');
  const officeHolidays = settingValue(settings, 'office_holidays');

  const hasContactInfo = contactAddress || contactPhone || contactEmail || whatsappUrl;
  const hasOfficeHours = officeWeekdays || officeSaturday || officeSunday || officeHolidays;
  const hasDeptEmails =
    admissionsEmail || academicsEmail || bursarEmail || alumniEmail || parentsEmail;
  const hasSocial = socialYoutube || socialFacebook || socialInstagram || socialTwitter;

  return (
    <PublicLayout>
      <div className="contact-page public-immersive-shell">
        <div className="public-immersive-shell__inner">
          <PublicPageHero
            page={contactPage}
            fallbackTitle="Mawasiliano"
            settings={settings}
            variant="contact"
          />

          {hasContactCms ? (
            <PublicCmsPreparedBlock
              page={contactPage}
              themeKey="contact"
              proseClassName="contact-card contact-card--cms"
            />
          ) : (
            <PublicCmsEmpty pageLabel="Mawasiliano" />
          )}

          {hasContactInfo ? (
            <section className="contact-card" aria-labelledby="contact-info-heading">
              <div className="contact-card__head">
                <span className="contact-card__icon" aria-hidden>
                  <i className="fas fa-address-card" />
                </span>
                <h2 id="contact-info-heading" className="contact-card__title">
                  {settingValue(settings, 'contact_info_heading') || 'Mawasiliano'}
                </h2>
              </div>
              <div className="contact-detail-grid">
                {contactAddress ? (
                  <div className="contact-detail-item">
                    <span className="contact-detail-item__icon" aria-hidden>
                      <i className="fas fa-map-marker-alt" />
                    </span>
                    <div className="contact-detail-item__content">
                      <span className="contact-detail-item__key">Anwani</span>
                      <span className="contact-detail-item__value">
                        {contactAddress.split('\n').map((line, idx, arr) => (
                          <span key={idx}>
                            {line}
                            {idx < arr.length - 1 ? <br /> : null}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                ) : null}
                {contactPhone ? (
                  <div className="contact-detail-item">
                    <span className="contact-detail-item__icon" aria-hidden>
                      <i className="fas fa-phone" />
                    </span>
                    <div className="contact-detail-item__content">
                      <span className="contact-detail-item__key">Simu</span>
                      <a className="contact-detail-item__link" href={`tel:${contactPhone.replace(/\s/g, '')}`}>
                        {contactPhone}
                      </a>
                    </div>
                  </div>
                ) : null}
                {contactEmail ? (
                  <div className="contact-detail-item">
                    <span className="contact-detail-item__icon" aria-hidden>
                      <i className="fas fa-envelope" />
                    </span>
                    <div className="contact-detail-item__content">
                      <span className="contact-detail-item__key">Barua pepe</span>
                      <a className="contact-detail-item__link" href={`mailto:${contactEmail}`}>
                        {contactEmail}
                      </a>
                    </div>
                  </div>
                ) : null}
                {whatsappUrl ? (
                  <div className="contact-detail-item">
                    <span className="contact-detail-item__icon contact-detail-item__icon--whatsapp" aria-hidden>
                      <i className="fab fa-whatsapp" />
                    </span>
                    <div className="contact-detail-item__content">
                      <span className="contact-detail-item__key">WhatsApp</span>
                      <a
                        className="contact-detail-item__link"
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {contactWhatsapp}
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {hasOfficeHours || hasDeptEmails ? (
            <div className="contact-page-grid">
              {hasOfficeHours ? (
                <section className="contact-card" aria-labelledby="office-hours-heading">
                  <div className="contact-card__head">
                    <span className="contact-card__icon" aria-hidden>
                      <i className="fas fa-clock" />
                    </span>
                    <h2 id="office-hours-heading" className="contact-card__title">
                      {settingValue(settings, 'office_hours_heading') || 'Saa za ofisi'}
                    </h2>
                  </div>
                  <div className="contact-hours-grid">
                    {officeWeekdays ? (
                      <div className="contact-hours__item">
                        <span className="contact-hours__label">Jumatatu–Ijumaa</span>
                        <span className="contact-hours__value">{officeWeekdays}</span>
                      </div>
                    ) : null}
                    {officeSaturday ? (
                      <div className="contact-hours__item">
                        <span className="contact-hours__label">Jumamosi</span>
                        <span className="contact-hours__value">{officeSaturday}</span>
                      </div>
                    ) : null}
                    {officeSunday ? (
                      <div className="contact-hours__item">
                        <span className="contact-hours__label">Jumapili</span>
                        <span className="contact-hours__value">{officeSunday}</span>
                      </div>
                    ) : null}
                    {officeHolidays ? (
                      <div className="contact-hours__item">
                        <span className="contact-hours__label">Sikukuu</span>
                        <span className="contact-hours__value">{officeHolidays}</span>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {hasDeptEmails ? (
                <section className="contact-card" aria-labelledby="dept-heading">
                  <div className="contact-card__head">
                    <span className="contact-card__icon" aria-hidden>
                      <i className="fas fa-sitemap" />
                    </span>
                    <h2 id="dept-heading" className="contact-card__title">
                      {settingValue(settings, 'department_contacts_heading') || 'Mawasiliano ya idara'}
                    </h2>
                  </div>
                  <ul className="contact-dept-list">
                    {admissionsEmail ? (
                      <li>
                        <span className="contact-dept-list__key">Udahili</span>
                        <a className="contact-dept-list__link" href={`mailto:${admissionsEmail}`}>
                          {admissionsEmail}
                        </a>
                      </li>
                    ) : null}
                    {academicsEmail ? (
                      <li>
                        <span className="contact-dept-list__key">Masomo</span>
                        <a className="contact-dept-list__link" href={`mailto:${academicsEmail}`}>
                          {academicsEmail}
                        </a>
                      </li>
                    ) : null}
                    {bursarEmail ? (
                      <li>
                        <span className="contact-dept-list__key">Fedha</span>
                        <a className="contact-dept-list__link" href={`mailto:${bursarEmail}`}>
                          {bursarEmail}
                        </a>
                      </li>
                    ) : null}
                    {alumniEmail ? (
                      <li>
                        <span className="contact-dept-list__key">Wahitimu</span>
                        <a className="contact-dept-list__link" href={`mailto:${alumniEmail}`}>
                          {alumniEmail}
                        </a>
                      </li>
                    ) : null}
                    {parentsEmail ? (
                      <li>
                        <span className="contact-dept-list__key">Wazazi</span>
                        <a className="contact-dept-list__link" href={`mailto:${parentsEmail}`}>
                          {parentsEmail}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}

          {mapEmbedSrc || socialLocation ? (
            <section className="contact-card contact-card--map" aria-labelledby="map-heading">
              <div className="contact-card__head">
                <span className="contact-card__icon" aria-hidden>
                  <i className="fas fa-map-marked-alt" />
                </span>
                <h2 id="map-heading" className="contact-card__title">
                  {settingValue(settings, 'map_heading') || 'Ramani'}
                </h2>
              </div>
              {mapEmbedSrc ? (
                <div className="contact-map-embed">
                  <iframe
                    title="Ramani ya seminari"
                    src={mapEmbedSrc}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              ) : null}
              {socialLocation ? (
                <div className="map-button-container">
                  <a href={socialLocation} target="_blank" rel="noopener noreferrer" className="map-button">
                    <i className="fas fa-external-link-alt" />{' '}
                    Fungua ramani kamili
                  </a>
                </div>
              ) : null}
            </section>
          ) : null}

          {hasSocial ? (
            <section className="contact-card contact-card--follow" aria-labelledby="follow-heading">
              <div className="contact-card__head">
                <span className="contact-card__icon" aria-hidden>
                  <i className="fas fa-share-alt" />
                </span>
                <h2 id="follow-heading" className="contact-card__title">
                  {settingValue(settings, 'social_heading') || 'Mitandao ya kijamii'}
                </h2>
              </div>
              <div className="social-links-grid">
                {socialYoutube ? (
                  <a href={socialYoutube} target="_blank" rel="noopener noreferrer" className="social-link social-link--youtube">
                    <i className="fab fa-youtube" aria-hidden /> YouTube
                  </a>
                ) : null}
                {socialFacebook ? (
                  <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="social-link social-link--facebook">
                    <i className="fab fa-facebook" aria-hidden /> Facebook
                  </a>
                ) : null}
                {socialInstagram ? (
                  <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="social-link social-link--instagram">
                    <i className="fab fa-instagram" aria-hidden /> Instagram
                  </a>
                ) : null}
                {socialTwitter ? (
                  <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="social-link social-link--twitter">
                    <i className="fab fa-x-twitter" aria-hidden /> X
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </PublicLayout>
  );
};

export default Contact;

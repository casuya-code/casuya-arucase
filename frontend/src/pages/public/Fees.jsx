/**
 * Fees Page - Full Content from Python Template
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout';
import Loading from '../../components/common/Loading';
import { publicAPI } from '../../services/public';
import './Fees.css';

const Fees = () => {
  const { data: pageData, isLoading, isError } = useQuery({
    queryKey: ['page', 'school-fee'],
    queryFn: () => publicAPI.getPage('school-fee'),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  const { data: settings } = useQuery({
    queryKey: ['homepage'],
    queryFn: () => publicAPI.getHomepage(),
    select: (res) => res.data?.settings,
    staleTime: 10 * 60 * 1000,
  });

  const fallbackContent = (
    <div className="fees-page">
      <Link to="/" className="home-button">
        <i className="fas fa-home"></i> Back to Home
      </Link>

      <div className="content-card">
        <h1>Fees Structure</h1>
        
        <p>
          <strong>Answer:</strong> Arusha Catholic Seminary fees include tuition, accommodation, meals, 
          learning materials, medical care, spiritual formation programs, and co-curricular activities. 
          Payment options include full payment, termly payment, or monthly installments.
        </p>
        
        <h2>Annual Fees</h2>
        <p>
          The seminary strives to maintain affordable fees while ensuring quality education and formation. 
          Our fee structure covers:
        </p>
        <ul>
          <li>Tuition and instruction</li>
          <li>Accommodation (boarding)</li>
          <li>Meals (three meals daily)</li>
          <li>Learning materials</li>
          <li>Medical care</li>
          <li>Spiritual formation programs</li>
          <li>Co-curricular activities</li>
        </ul>

        <h3>Payment Schedule</h3>
        <p>Fees can be paid according to the following schedule:</p>
        <ul>
          <li><strong>Full Payment:</strong> At the beginning of the academic year (with small discount)</li>
          <li><strong>Termly Payment:</strong> At the start of each term (3 installments)</li>
          <li><strong>Monthly Payment:</strong> Monthly installments (arranged with bursar)</li>
        </ul>

        <h3>Payment Methods</h3>
        <ul>
          <li>Bank transfer to seminary account</li>
          <li>Mobile money (M-Pesa, Tigo Pesa, Airtel Money)</li>
          <li>Cash payment at bursar's office</li>
          <li>Cheque (payable to Arusha Catholic Seminary)</li>
        </ul>

        <h3>Scholarships and Financial Aid</h3>
        <p>The seminary offers scholarships and financial assistance to deserving students who demonstrate:</p>
        <ul>
          <li>Academic excellence</li>
          <li>Financial need</li>
          <li>Good conduct and discipline</li>
          <li>Strong commitment to their vocation</li>
        </ul>

        <h3>Additional Costs</h3>
        <p>Students may incur additional costs for:</p>
        <ul>
          <li>School uniform and personal items</li>
          <li>Examination fees (government exams)</li>
          <li>Optional field trips and excursions</li>
          <li>Personal medical expenses</li>
        </ul>

        <h3>Fee Inquiries</h3>
        <p>
          For detailed fee information and payment arrangements, please contact:<br />
          <strong>Email:</strong>{' '}
          <a href={`mailto:${settings?.contact_email || 'info@arushacatholicseminary.co.tz'}`} className="contact-link">
            {settings?.contact_email || 'info@arushacatholicseminary.co.tz'}
          </a>
          <br />
          <strong>Phone:</strong>{' '}
          <a href={`tel:${settings?.contact_phone || '+255 123 456 789'}`} className="contact-link">
            {settings?.contact_phone || '+255 123 456 789'}
          </a>
        </p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message="Loading fees page..." />
      </PublicLayout>
    );
  }

  const page = pageData?.data?.page;
  const hasCustomContent = !isError && page && (page.html_content || page.content);

  return (
    <PublicLayout>
      {hasCustomContent ? (
        <div className="fees-page">
          <Link to="/" className="home-button">
            <i className="fas fa-home"></i> Back to Home
          </Link>
          <div 
            className="content-card"
            dangerouslySetInnerHTML={{ __html: page.html_content || page.content || '' }}
          />
        </div>
      ) : (
        fallbackContent
      )}
    </PublicLayout>
  );
};

export default Fees;

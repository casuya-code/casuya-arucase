/**
 * Script to add 50 FAQs to the database
 * Run with: node backend/scripts/addFAQs.js
 */

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const faqs = [
  // General Questions (10)
  { question: 'What is the history of Arusha Catholic Seminary?', answer: 'Arusha Catholic Seminary was established to provide quality Catholic education and formation to students. The seminary has a rich history of academic excellence and spiritual formation.', category: 'General', display_order: 1 },
  { question: 'What are the school hours?', answer: 'Regular school hours are from 7:30 AM to 3:30 PM, Monday through Friday. Some activities may extend beyond these hours.', category: 'General', display_order: 2 },
  { question: 'Is the school co-educational?', answer: 'Yes, Arusha Catholic Seminary is a co-educational institution welcoming both male and female students.', category: 'General', display_order: 3 },
  { question: 'What is the school motto?', answer: 'The school motto reflects our commitment to academic excellence, spiritual growth, and character development.', category: 'General', display_order: 4 },
  { question: 'How can I contact the school?', answer: 'You can contact us via phone at +255 754 92 60 22 or +255 765 394 802, email at arucase@gmail.com, or visit us at P.O BOX 3102 Arusha, Tanzania.', category: 'General', display_order: 5 },
  { question: 'What languages are spoken at the school?', answer: 'The primary language of instruction is English, with Swahili also used for communication. Students are encouraged to be bilingual.', category: 'General', display_order: 6 },
  { question: 'Does the school have a library?', answer: 'Yes, we have a well-equipped library with a wide range of books, reference materials, and digital resources for students.', category: 'General', display_order: 7 },
  { question: 'What facilities are available at the school?', answer: 'The school has modern classrooms, science laboratories, computer labs, library, sports facilities, chapel, and dining facilities.', category: 'General', display_order: 8 },
  { question: 'Is there a school uniform?', answer: 'Yes, students are required to wear the official school uniform which can be purchased from designated suppliers.', category: 'General', display_order: 9 },
  { question: 'What is the school calendar?', answer: 'The academic year typically runs from January to November, divided into three terms with breaks in between.', category: 'General', display_order: 10 },

  // Admissions Questions (10)
  { question: 'What are the admission requirements?', answer: 'Admission requirements include completed application form, previous academic records, birth certificate, and passing the entrance examination.', category: 'Admissions', display_order: 11 },
  { question: 'When does the admission process begin?', answer: 'The admission process typically begins in September for the following academic year. Please check our website for specific dates.', category: 'Admissions', display_order: 12 },
  { question: 'What is the age requirement for admission?', answer: 'Students should be between 13-15 years old for Form I admission. Age requirements may vary for other forms.', category: 'Admissions', display_order: 13 },
  { question: 'Is there an entrance examination?', answer: 'Yes, all prospective students must sit for an entrance examination covering Mathematics, English, and General Knowledge.', category: 'Admissions', display_order: 14 },
  { question: 'What documents are needed for admission?', answer: 'Required documents include birth certificate, previous school reports, passport photos, medical certificate, and completed application form.', category: 'Admissions', display_order: 15 },
  { question: 'Can students transfer from other schools?', answer: 'Yes, transfer students are accepted subject to availability of space and meeting our academic requirements.', category: 'Admissions', display_order: 16 },
  { question: 'What is the admission fee?', answer: 'Admission fees vary by form level. Please contact the admissions office for current fee structure and payment options.', category: 'Admissions', display_order: 17 },
  { question: 'Are scholarships available?', answer: 'Yes, we offer scholarships and financial aid to deserving students based on academic merit and financial need.', category: 'Admissions', display_order: 18 },
  { question: 'How do I apply for admission?', answer: 'You can apply online through our website, download the application form, or collect one from the school office.', category: 'Admissions', display_order: 19 },
  { question: 'What is the student capacity per class?', answer: 'We maintain an average class size of 30-35 students to ensure quality education and individual attention.', category: 'Admissions', display_order: 20 },

  // Academics Questions (10)
  { question: 'What curriculum does the school follow?', answer: 'We follow the Tanzanian National Curriculum for O-Level (Forms I-IV) and A-Level (Forms V-VI) education.', category: 'Academics', display_order: 21 },
  { question: 'What subjects are offered?', answer: 'We offer a wide range of subjects including Mathematics, Sciences, Languages, Social Studies, Religious Education, and more.', category: 'Academics', display_order: 22 },
  { question: 'How are students assessed?', answer: 'Students are assessed through continuous assessment, monthly tests, mid-term exams, and annual examinations.', category: 'Academics', display_order: 23 },
  { question: 'What is the grading system?', answer: 'We use the standard Tanzanian grading system with letter grades A, B, C, D, E, and F, with corresponding percentage ranges.', category: 'Academics', display_order: 24 },
  { question: 'Are there remedial classes?', answer: 'Yes, we provide remedial classes and extra support for students who need additional help in specific subjects.', category: 'Academics', display_order: 25 },
  { question: 'What is the homework policy?', answer: 'Students are expected to complete daily homework assignments. The amount varies by form level and subject.', category: 'Academics', display_order: 26 },
  { question: 'How can parents track student progress?', answer: 'Parents can access student progress through the online portal, parent-teacher meetings, and regular report cards.', category: 'Academics', display_order: 27 },
  { question: 'Are there study groups?', answer: 'Yes, we encourage study groups and peer learning. Teachers also organize group study sessions.', category: 'Academics', display_order: 28 },
  { question: 'What support is available for struggling students?', answer: 'We provide tutoring, counseling, and additional academic support for students facing challenges.', category: 'Academics', display_order: 29 },
  { question: 'How are academic achievements recognized?', answer: 'We recognize academic excellence through awards ceremonies, honor rolls, and special recognition programs.', category: 'Academics', display_order: 30 },

  // Fees Questions (10)
  { question: 'What are the school fees?', answer: 'School fees vary by form level and include tuition, boarding (if applicable), and other charges. Please contact the finance office for details.', category: 'Fees', display_order: 31 },
  { question: 'When are fees due?', answer: 'Fees are typically due at the beginning of each term. Payment plans may be available upon request.', category: 'Fees', display_order: 32 },
  { question: 'What payment methods are accepted?', answer: 'We accept cash, bank transfers, mobile money, and cheques. Please confirm with the finance office.', category: 'Fees', display_order: 33 },
  { question: 'Are there additional fees?', answer: 'Additional fees may include examination fees, activity fees, and other charges as specified in the fee structure.', category: 'Fees', display_order: 34 },
  { question: 'Is there a late payment penalty?', answer: 'Late payment may incur penalties. Please contact the finance office to discuss payment arrangements.', category: 'Fees', display_order: 35 },
  { question: 'Can fees be paid in installments?', answer: 'Payment plans may be available for families facing financial difficulties. Please discuss with the finance office.', category: 'Fees', display_order: 36 },
  { question: 'What happens if fees are not paid?', answer: 'Students with outstanding fees may be restricted from certain activities. Please contact us to make arrangements.', category: 'Fees', display_order: 37 },
  { question: 'Are there discounts for siblings?', answer: 'We may offer discounts for families with multiple children enrolled. Please inquire at the finance office.', category: 'Fees', display_order: 38 },
  { question: 'What is the refund policy?', answer: 'Refund policies vary by circumstance. Please contact the finance office for specific refund procedures.', category: 'Fees', display_order: 39 },
  { question: 'How can I get a fee statement?', answer: 'Fee statements can be obtained from the finance office or accessed through the online portal.', category: 'Fees', display_order: 40 },

  // Student Life Questions (10)
  { question: 'What extracurricular activities are available?', answer: 'We offer sports, music, drama, debate, clubs, and various other extracurricular activities for student development.', category: 'Student Life', display_order: 41 },
  { question: 'Is boarding available?', answer: 'Yes, we have boarding facilities for students who require accommodation. Please inquire about availability.', category: 'Student Life', display_order: 42 },
  { question: 'What is the meal plan?', answer: 'Boarding students receive three meals daily. Day students can purchase meals or bring packed lunches.', category: 'Student Life', display_order: 43 },
  { question: 'Are there sports teams?', answer: 'Yes, we have various sports teams including football, basketball, volleyball, and athletics that compete in inter-school competitions.', category: 'Student Life', display_order: 44 },
  { question: 'What is the discipline policy?', answer: 'We maintain high standards of discipline based on Catholic values. The student handbook outlines our discipline policies.', category: 'Student Life', display_order: 45 },
  { question: 'Is there a student council?', answer: 'Yes, we have an active student council that represents student interests and organizes various activities.', category: 'Student Life', display_order: 46 },
  { question: 'What religious activities are available?', answer: 'Daily Mass, prayer services, retreats, and religious education are integral parts of our Catholic formation.', category: 'Student Life', display_order: 47 },
  { question: 'Are there field trips?', answer: 'Yes, educational field trips are organized throughout the year to enhance learning experiences.', category: 'Student Life', display_order: 48 },
  { question: 'What is the dress code?', answer: 'Students must adhere to the school uniform policy and dress code as outlined in the student handbook.', category: 'Student Life', display_order: 49 },
  { question: 'Is there a health center?', answer: 'Yes, we have a health center with a nurse on duty during school hours to attend to student health needs.', category: 'Student Life', display_order: 50 },
];

async function addFAQs() {
  try {
    console.log('Starting FAQ insertion...');
    let successCount = 0;
    let errorCount = 0;

    for (const faq of faqs) {
      try {
        const id = uuidv4();
        await query(
          `INSERT INTO faqs (id, question, answer, category, display_order, active)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [id, faq.question, faq.answer, faq.category, faq.display_order, true]
        );
        successCount++;
        console.log(`✓ Added FAQ ${successCount}: ${faq.question.substring(0, 50)}...`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Error adding FAQ: ${faq.question.substring(0, 50)}... - ${error.message}`);
      }
    }

    console.log(`\n✅ FAQ insertion completed!`);
    console.log(`   Successfully added: ${successCount} FAQs`);
    console.log(`   Errors: ${errorCount}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

addFAQs();


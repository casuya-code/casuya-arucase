/**
 * Grade Template Page
 * Comprehensive reference page displaying all grading systems, evaluation criteria, and calculation methods
 */
import AdminLayout from '../../components/layout/AdminLayout';
import './Grades.css';

const Grades = () => {
  // O-Level Grades Data
  const oLevelGrades = [
    { grade: 'A', range: '85 – 100', swahili: 'Bora Sana', gradeValue: '1' },
    { grade: 'B', range: '70 – 84', swahili: 'Vizuri Sana', gradeValue: '2' },
    { grade: 'C', range: '50 – 69', swahili: 'Vizuri', gradeValue: '3' },
    { grade: 'D', range: '40 – 49', swahili: 'Dhaifu', gradeValue: '4' },
    { grade: 'F', range: '0 – 39', swahili: 'Feli', gradeValue: '5' },
  ];

  // A-Level Grades Data
  const aLevelGrades = [
    { grade: 'A', minMarks: '85', gradeValue: '1', description: 'Bora Sana' },
    { grade: 'B', minMarks: '75', gradeValue: '2', description: 'Vizuri Sana' },
    { grade: 'C', minMarks: '65', gradeValue: '3', description: 'Vizuri' },
    { grade: 'D', minMarks: '55', gradeValue: '4', description: 'Dhaifu' },
    { grade: 'E', minMarks: '45', gradeValue: '5', description: 'Wastani' },
    { grade: 'S', minMarks: '40', gradeValue: '6', description: 'Kidogo' },
    { grade: 'F', minMarks: '0', gradeValue: '7', description: 'Feli' },
  ];

  // Behavior and Conduct Grades
  const behaviorGrades = [
    { grade: 'A', swahili: 'Vizuri Sana', english: 'Very Good' },
    { grade: 'B', swahili: 'Vizuri', english: 'Good' },
    { grade: 'C', swahili: 'Wastani', english: 'Average' },
    { grade: 'D', swahili: 'Dhaifu', english: 'Poor' },
    { grade: 'F', swahili: 'Mbaya', english: 'Bad' },
  ];

  // Tabia na Mwenendo Evaluation Criteria
  const tabiaCriteria = [
    { code: '901', description: 'Kufanya kazi kwa bidii', english: 'Working diligently' },
    { code: '902', description: 'Ubora wa kazi', english: 'Quality of work' },
    { code: '903', description: 'Kuheshimu kazi', english: 'Respecting work' },
    { code: '904', description: 'Utunzaji wa mali ya shule / binafsi', english: 'Care of school/personal property' },
    { code: '905', description: 'Ushirikiano na wenzake', english: 'Cooperation with peers' },
    { code: '906', description: 'Heshima kwa wenzake / walimu / wafanyakazi', english: 'Respect for peers/teachers/staff' },
    { code: '907', description: 'Sifa za uongozi', english: 'Leadership qualities' },
    { code: '908', description: 'Kutii na kufuata maagizo', english: 'Obedience and following instructions' },
    { code: '909', description: 'Uaminifu', english: 'Honesty' },
    { code: '910', description: 'Usafi binafsi', english: 'Personal cleanliness' },
    { code: '911', description: 'Kushiriki katika Utamaduni / Michezo', english: 'Participation in Culture/Sports' },
  ];

  // Color-Coded Grade System
  const colorGrades = [
    // O-Level Colors
    { level: 'O-Level', grade: 'A', description: 'Excellent (85-100 marks)', color: 'Dark Green Gradient', colorClass: 'color-dark-green' },
    { level: 'O-Level', grade: 'B', description: 'Very Good (70-84 marks)', color: 'Light Green', colorClass: 'color-light-green' },
    { level: 'O-Level', grade: 'C', description: 'Good (50-69 marks, Average ≥ 55)', color: 'Pale Yellow', colorClass: 'color-yellow' },
    { level: 'O-Level', grade: 'C', description: 'Good (Average < 55 marks)', color: 'Light Red', colorClass: 'color-light-red' },
    { level: 'O-Level', grade: 'D', description: 'Satisfactory (40-49 marks)', color: 'Light Red', colorClass: 'color-light-red' },
    { level: 'O-Level', grade: 'F', description: 'Fail (0-39 marks)', color: 'Light Red', colorClass: 'color-light-red' },
    // A-Level Colors
    { level: 'A-Level', grade: 'A', description: 'Excellent (85+ marks)', color: 'Dark Green Gradient', colorClass: 'color-dark-green' },
    { level: 'A-Level', grade: 'B', description: 'Very Good (75-84 marks)', color: 'Green', colorClass: 'color-green' },
    { level: 'A-Level', grade: 'C', description: 'Good (65-74 marks)', color: 'Light Green', colorClass: 'color-light-green' },
    { level: 'A-Level', grade: 'D', description: 'Average (55-64 marks)', color: 'Yellow', colorClass: 'color-yellow' },
    { level: 'A-Level', grade: 'E', description: 'Satisfactory (45-54 marks)', color: 'Light Red', colorClass: 'color-light-red' },
    { level: 'A-Level', grade: 'S', description: 'Subsidiary (40-44 marks)', color: 'Light Red', colorClass: 'color-light-red' },
    { level: 'A-Level', grade: 'F', description: 'Fail (below 40 marks)', color: 'Light Red', colorClass: 'color-light-red' },
  ];

  // Division Point Ranges
  const divisions = [
    { division: 'DIVISION I', range: '7 - 17', description: 'Excellent Performance' },
    { division: 'DIVISION II', range: '18 - 20', description: 'Very Good Performance' },
    { division: 'DIVISION III', range: '21 - 25', description: 'Good Performance' },
    { division: 'DIVISION IV', range: '26 - 33', description: 'Satisfactory Performance' },
    { division: 'DIVISION 0', range: '34 - 35', description: 'Below Average Performance' },
  ];

  // Example calculation data
  const exampleSubjects = [
    { subject: 'Mathematics', grade: 'A', gradeValue: 1 },
    { subject: 'Physics', grade: 'A', gradeValue: 1 },
    { subject: 'Chemistry', grade: 'B', gradeValue: 2 },
    { subject: 'Biology', grade: 'B', gradeValue: 2 },
    { subject: 'English', grade: 'B', gradeValue: 2 },
    { subject: 'Kiswahili', grade: 'C', gradeValue: 3 },
    { subject: 'History', grade: 'C', gradeValue: 3 },
  ];

  const exampleDivisionPoint = exampleSubjects.reduce((sum, subj) => sum + subj.gradeValue, 0);

  return (
    <AdminLayout>
      <div className="grades-page-container">
        {/* O-Level Grades Table */}
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-graduation-cap"></i>
            O-Level Grades (Form I-IV)
          </div>
          <div className="excel-card-body">
            <div className="table-container">
              <table className="grade-table">
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Marks Range</th>
                    <th>Swahili Description</th>
                    <th>Grade Value</th>
                  </tr>
                </thead>
                <tbody>
                  {oLevelGrades.map((grade, index) => (
                    <tr key={index} className="grade-row">
                      <td data-label="Grade">
                        <span className={`grade-badge grade-${grade.grade.toLowerCase()}`}>
                          {grade.grade}
                        </span>
                      </td>
                      <td data-label="Marks Range">{grade.range}</td>
                      <td data-label="Swahili">{grade.swahili}</td>
                      <td data-label="Grade Value">{grade.gradeValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* A-Level Grades Table */}
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-graduation-cap"></i>
            A-Level Grades (Form V-VI)
          </div>
          <div className="excel-card-body">
            <div className="table-container">
              <table className="grade-table">
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Minimum Marks</th>
                    <th>Grade Value</th>
                    <th>Official Swahili Description</th>
                  </tr>
                </thead>
                <tbody>
                  {aLevelGrades.map((grade, index) => (
                    <tr key={index} className="grade-row">
                      <td data-label="Grade">
                        <span className={`grade-badge grade-${grade.grade.toLowerCase()}`}>
                          {grade.grade}
                        </span>
                      </td>
                      <td data-label="Min Marks">{grade.minMarks}</td>
                      <td data-label="Grade Value">{grade.gradeValue}</td>
                      <td data-label="Description">{grade.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Behavior and Conduct Grades */}
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-user-check"></i>
            Behavior and Conduct Grades
          </div>
          <div className="excel-card-body">
            <div className="table-container">
              <table className="grade-table">
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Swahili Description</th>
                    <th>English Translation</th>
                  </tr>
                </thead>
                <tbody>
                  {behaviorGrades.map((grade, index) => (
                    <tr key={index} className="grade-row">
                      <td data-label="Grade">
                        <span className={`grade-badge grade-${grade.grade.toLowerCase()}`}>
                          {grade.grade}
                        </span>
                      </td>
                      <td data-label="Swahili">{grade.swahili}</td>
                      <td data-label="English">{grade.english}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tabia na Mwenendo Evaluation Criteria */}
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-list-check"></i>
            Tabia na Mwenendo Evaluation Criteria
          </div>
          <div className="excel-card-body">
            <div className="table-container">
              <table className="grade-table">
                <thead>
                  <tr>
                    <th>Namba (Number)</th>
                    <th>Kipengele (Criterion)</th>
                    <th>English Translation</th>
                  </tr>
                </thead>
                <tbody>
                  {tabiaCriteria.map((criterion, index) => (
                    <tr key={index} className="grade-row">
                      <td data-label="Code"><strong>{criterion.code}</strong></td>
                      <td data-label="Criterion">{criterion.description}</td>
                      <td data-label="English" className="english-translation">{criterion.english}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Color-Coded Grade System */}
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-palette"></i>
            Color-Coded Grade System
          </div>
          <div className="excel-card-body">
            <div className="table-container">
              <table className="grade-table">
                <thead>
                  <tr>
                    <th>Level</th>
                    <th>Grade</th>
                    <th>Description</th>
                    <th>Color</th>
                    <th>Visual Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {colorGrades.map((item, index) => (
                    <tr key={index} className="grade-row">
                      <td data-label="Level">{item.level}</td>
                      <td data-label="Grade">
                        <span className={`grade-badge grade-${item.grade.toLowerCase()}`}>
                          {item.grade}
                        </span>
                      </td>
                      <td data-label="Description">{item.description}</td>
                      <td data-label="Color">{item.color}</td>
                      <td data-label="Sample">
                        <div className={`color-sample ${item.colorClass}`}></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* O-Level Division Calculation */}
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-calculator"></i>
            O-Level Division Calculation
          </div>
          <div className="excel-card-body">
            <div className="division-section">
              <h3>Calculation Method</h3>
              <p>
                O-Level divisions are calculated using the following method:
              </p>
              <ol>
                <li>Select the seven highest subject grades</li>
                <li>Convert each grade to its grade value (A=1, B=2, C=3, D=4, F=5)</li>
                <li>Sum all grade values to get the division point</li>
                <li>Determine the division based on the division point range</li>
              </ol>
              <p className="note">
                <strong>Note:</strong> Lower division point = better performance. Only O-Level students (Form I-IV) receive divisions.
              </p>

              <h3>Example Calculation</h3>
              <div className="example-calculation">
                <div className="table-container">
                  <table className="grade-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Grade</th>
                        <th>Grade Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exampleSubjects.map((subject, index) => (
                        <tr key={index}>
                          <td data-label="Subject">{subject.subject}</td>
                          <td data-label="Grade">
                            <span className={`grade-badge grade-${subject.grade.toLowerCase()}`}>
                              {subject.grade}
                            </span>
                          </td>
                          <td data-label="Grade Value">{subject.gradeValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="example-result">
                  <div className="result-item">
                    <strong>Division Point:</strong> {exampleDivisionPoint}
                  </div>
                  <div className="result-item">
                    <strong>Final Division:</strong> DIVISION I (Range: 7-17)
                  </div>
                </div>
              </div>

              <h3>Division Point Ranges</h3>
              <div className="table-container">
                <table className="grade-table">
                  <thead>
                    <tr>
                      <th>Division</th>
                      <th>Division Point Range</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisions.map((div, index) => (
                      <tr key={index} className="grade-row">
                        <td data-label="Division"><strong>{div.division}</strong></td>
                        <td data-label="Range">{div.range}</td>
                        <td data-label="Description">{div.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="excel-card">
          <div className="excel-card-header">
            <i className="fas fa-link"></i>
            Quick Links
          </div>
          <div className="excel-card-body">
            <div className="quick-links">
              <a href="/reports/individual" className="excel-btn primary">
                <i className="fas fa-file-alt"></i> View Individual Reports
              </a>
              <a href="/reports/bulk" className="excel-btn secondary">
                <i className="fas fa-copy"></i> View Bulk Reports
              </a>
              <a href="/admin/marks-config" className="excel-btn secondary">
                <i className="fas fa-calendar-alt"></i> Configure Marks Weights
              </a>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Grades;

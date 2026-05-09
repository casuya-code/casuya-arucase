const { query } = require('./config/database');

async function createSampleStudents() {
  try {
    console.log('🔍 SAMPLE DATA: Creating sample PreFormOne students for 2025...');
    
    // Sample students for testing promotion
    const sampleStudents = [
      {
        admission_number: '789ABC001',
        serial_number: 'PF2025001',
        first_name: 'John',
        middle_name: 'Michael',
        surname: 'Smith',
        sex: 'Male',
        parish: 'St. Mary',
        year: 2025
      },
      {
        admission_number: '789ABC002',
        serial_number: 'PF2025002',
        first_name: 'Jane',
        middle_name: 'Elizabeth',
        surname: 'Johnson',
        sex: 'Female',
        parish: 'St. Peter',
        year: 2025
      },
      {
        admission_number: '789ABC003',
        serial_number: 'PF2025003',
        first_name: 'Robert',
        middle_name: 'James',
        surname: 'Brown',
        sex: 'Male',
        parish: 'St. Joseph',
        year: 2025
      },
      {
        admission_number: '789ABC004',
        serial_number: 'PF2025004',
        first_name: 'Mary',
        middle_name: 'Anne',
        surname: 'Davis',
        sex: 'Female',
        parish: 'St. Paul',
        year: 2025
      },
      {
        admission_number: '789ABC005',
        serial_number: 'PF2025005',
        first_name: 'William',
        middle_name: 'Thomas',
        surname: 'Wilson',
        sex: 'Male',
        parish: 'St. James',
        year: 2025
      }
    ];

    // Insert sample students
    for (const student of sampleStudents) {
      const insertResult = await query(
        `INSERT INTO preform_one_students (
          admission_number, serial_number, first_name, middle_name, 
          surname, sex, parish, year
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [
          student.admission_number,
          student.serial_number,
          student.first_name,
          student.middle_name,
          student.surname,
          student.sex,
          student.parish,
          student.year
        ]
      );
      
      console.log(`🔍 SAMPLE DATA: Created student ${student.admission_number} - ${student.first_name} ${student.surname}`);
    }

    console.log(`✅ SAMPLE DATA: Created ${sampleStudents.length} sample PreFormOne students for 2025`);
    
  } catch (error) {
    console.error('🔍 SAMPLE DATA: Error creating sample students:', error);
    throw error;
  }
}

// Run the function
createSampleStudents()
  .then(() => {
    console.log('✅ SAMPLE DATA: Sample data creation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ SAMPLE DATA: Sample data creation failed:', error);
    process.exit(1);
  });

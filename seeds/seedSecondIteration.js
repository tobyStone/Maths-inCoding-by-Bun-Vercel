const mongoose = require('mongoose');
const School = require('../models/schoolModel');
const Teacher = require('../models/teacherModel');
const Student = require('../models/studentModel');
const QuizResult = require('../models/quizResultModel');

const testDbConnectionString = 'mongodb+srv://tstone4:criminalseagull@cluster0.ntuqn.mongodb.net/maths_through_coding_test?retryWrites=true&w=majority';

mongoose.connect(testDbConnectionString, { useNewUrlParser: true, useUnifiedTopology: true });

async function seedDatabase() {
    try {
        // Clear the collections before seeding
        await School.deleteMany({});
        await Teacher.deleteMany({});
        await Student.deleteMany({});
        await QuizResult.deleteMany({});

        // Create a new School
        const school = new School({
            name: 'Test School',
            address: '123 Test Street',
            contactNumber: '123-456-7890'
        });
        await school.save();

        // Create a new Teacher
        const teacher = new Teacher({
            name: 'John Doe',
            email: 'john.doe@testschool.com',
            school: school._id
        });
        await teacher.save();

        // Create a new Student
        const student = new Student({
            name: 'Jane Smith',
            email: 'jane.smith@testschool.com',
            school: school._id,
            teacher: teacher._id
        });
        await student.save();

        // Create a new QuizResult
        const quizResult = new QuizResult({
            student: student._id,
            quizId: 'angles_1',
            score: 85,
            passed: true
        });
        await quizResult.save();

        console.log('Database seeded successfully to the test environment!');
        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding the test database:', error);
        mongoose.connection.close();
    }
}

seedDatabase();

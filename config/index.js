require('dotenv').config();

module.exports = {
    getDbConnectionString: function () {
        const isTestEnv = process.env.NODE_ENV === 'test';
        const dbName = isTestEnv ? 'maths_through_coding_test' : 'maths_through_coding';

        return `mongodb+srv://${process.env.uname}:${process.env.pwd}@cluster0.ntuqn.mongodb.net/${dbName}?retryWrites=true&w=majority`;
    },
    getOpenAiApiKey: function () {
        return process.env.OPENAI_API_KEY;
    }
}

module.exports = {

    getDbConnectionString: function () {
        return 'mongodb+srv://${process.env.DB_UNAME}'
            + ':${process.env.DB_PWD}'
            + '@cluster0.ntuqn.mongodb.net/maths_through_coding?retryWrites=true&w=majority';
    }


}


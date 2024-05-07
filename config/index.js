module.exports = {

    getDbConnectionString: function () {
        return 'mongodb+srv://${process.env.uname}'
            + ':${process.env.pwd}'
            + '@cluster0.ntuqn.mongodb.net/maths_through_coding?retryWrites=true&w=majority';
    }


}


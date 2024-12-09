const { db } = require('./database');

const ServiceModel = {
    createService: (service, callback) => {
        const query = `
            INSERT INTO services (service_name, description)
            VALUES (?, ?)
        `;
        db.run(query, [service.service_name, service.description], callback);
    },

    getAllServices: (callback) => {
        const query = `SELECT * FROM services ORDER BY service_name ASC`;
        db.all(query, [], callback);
    }
};

module.exports = ServiceModel;
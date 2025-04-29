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
    },

    updateService: (serviceId, service, callback) => {
        const query = `
            UPDATE services 
            SET service_name = ?, description = ?, average_service_time = ?
            WHERE service_id = ?
        `;
        db.run(query, [service.service_name, service.description, service.average_service_time, serviceId], callback);
    }
};

module.exports = ServiceModel;
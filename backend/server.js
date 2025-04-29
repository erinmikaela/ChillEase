const express = require('express');
const cors = require('cors'); // Add CORS middleware
const app = express();
const port = process.env.PORT || 3000;
const generateReportRouter = require('./reports/generateReport');

app.use(cors()); // Enable CORS
app.use(express.json());
app.use('/reports', generateReportRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const generateReportRouter = require('./reports/generateReport');

app.use(express.json());
app.use('/reports', generateReportRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

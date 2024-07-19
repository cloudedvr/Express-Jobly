require('dotenv').config();
const express = require('express');
const { NotFoundError, UnauthorizedError, BadRequestError } = require('./expressError');
const db = require('./db');
const { sqlForPartialUpdate } = require('./helpers/sql');
const { ensureAdmin, ensureCorrectUserOrAdmin, authenticateJWT } = require('./middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = express();

const { PORT, JWT_SECRET } = process.env;

app.use(express.json());
app.use(authenticateJWT);  // Middleware for JWT authentication

// Error Handling Middleware
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') console.error(err.stack);
  const status = err.status || 500;
  const message = err.message;
  return res.status(status).json({ error: { message, status } });
});

// Models
class Company {
  // ... [Company methods remain unchanged]
}

class Job {
  // ... [Job methods remain unchanged]
}

class User {
  static async applyToJob(username, jobId) {
    const preCheck = await db.query(
      `SELECT id FROM jobs WHERE id = $1`,
      [jobId]
    );
    const job = preCheck.rows[0];

    if (!job) throw new NotFoundError(`No job: ${jobId}`);

    await db.query(
      `INSERT INTO applications (username, job_id)
       VALUES ($1, $2)`,
      [username, jobId]
    );
  }

  // ... [Other User methods remain unchanged]

  static async register({ username, password, firstName, lastName, email }) {
    const hashedPassword = await bcrypt.hash(password, 14);  // Increased salt rounds
    const result = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING username, first_name AS "firstName", last_name AS "lastName", email, is_admin AS "isAdmin"`,
      [username, hashedPassword, firstName, lastName, email]
    );
    return result.rows[0];
  }

  // ... [authenticate method remains unchanged]
}

// Routes
app.get('/companies', async function (req, res, next) {
  try {
    const q = req.query;
    if (q.minEmployees !== undefined) q.minEmployees = +q.minEmployees;
    if (q.maxEmployees !== undefined) q.maxEmployees = +q.maxEmployees;

    const companies = await Company.findAll(q);
    return res.json({ companies });
  } catch (err) {
    return next(err);
  }
});

app.post('/companies', ensureAdmin, async function (req, res, next) {
  try {
    const { handle, name, description, numEmployees, logoUrl } = req.body;
    if (!handle || !name) {
      throw new BadRequestError("Handle and name are required");
    }
    const company = await Company.create({ handle, name, description, numEmployees, logoUrl });
    return res.status(201).json({ company });
  } catch (err) {
    return next(err);
  }
});

// ... [Other company routes remain unchanged]

app.get('/jobs', async function (req, res, next) {
  try {
    const q = req.query;
    if (q.minSalary !== undefined) q.minSalary = +q.minSalary;
    if (q.hasEquity !== undefined) q.hasEquity = q.hasEquity === "true";

    const jobs = await Job.findAll(q);
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
});

app.post('/jobs', ensureAdmin, async function (req, res, next) {
  try {
    const { title, salary, equity, companyHandle } = req.body;
    if (!title || !companyHandle) {
      throw new BadRequestError("Title and company handle are required");
    }
    const job = await Job.create({ title, salary, equity, companyHandle });
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

// ... [Other job routes remain unchanged]

app.post('/users', async function (req, res, next) {
  try {
    const { username, password, firstName, lastName, email } = req.body;
    if (!username || !password) {
      throw new BadRequestError("Username and password are required");
    }
    const newUser = await User.register({ username, password, firstName, lastName, email });
    return res.status(201).json({ newUser });
  } catch (err) {
    return next(err);
  }
});

app.post('/auth/token', async function (req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new BadRequestError("Username and password are required");
    }
    const user = await User.authenticate(username, password);
    const token = jwt.sign({ username: user.username, isAdmin: user.isAdmin }, JWT_SECRET);
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});

// ... [Other user routes remain unchanged]

// Add a catch-all route for 404 errors
app.use((req, res, next) => {
  return next(new NotFoundError());
});

// Server Setup
const port = PORT || 3001;
app.listen(port, function () {
  console.log(`Server started on port ${port}`);
});
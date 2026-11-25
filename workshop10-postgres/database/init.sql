CREATE TABLE IF NOT EXISTS employees
(
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL
);

INSERT INTO employees
(
    employee_code,
    name,
    department
)
VALUES
    ('260001', 'James', 'IT'),
    ('260002', 'Kevin', 'Engineering');
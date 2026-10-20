(function () {
  "use strict";

  window.QUESTION_BANK = [
    {
      id: "SQL-01",
      category: "CREATE TABLE",
      question: "Using Oracle SQL, create students with columns in this order: student_id NUMBER, name VARCHAR2(50), and age NUMBER. Declare the student_id PRIMARY KEY inline.",
      answer: "CREATE TABLE students (student_id NUMBER PRIMARY KEY, name VARCHAR2(50), age NUMBER);"
    },
    {
      id: "SQL-02",
      category: "CREATE TABLE",
      question: "Using Oracle SQL, create courses with columns in this order: course_id NUMBER as an inline PRIMARY KEY, then title VARCHAR2(100) NOT NULL.",
      answer: "CREATE TABLE courses (course_id NUMBER PRIMARY KEY, title VARCHAR2(100) NOT NULL);"
    },
    {
      id: "SQL-03",
      category: "DROP TABLE",
      question: "Drop the Oracle table temp_results without using PURGE.",
      answer: "DROP TABLE temp_results;"
    },
    {
      id: "SQL-04",
      category: "DROP TABLE",
      question: "Drop the Oracle table old_students without using PURGE.",
      answer: "DROP TABLE old_students;"
    },
    {
      id: "SQL-05",
      category: "RENAME TABLE",
      question: "Rename the table students to learners using Oracle SQL syntax.",
      answer: "RENAME students TO learners;"
    },
    {
      id: "SQL-06",
      category: "RENAME TABLE",
      question: "Rename the table course_list to courses using Oracle SQL syntax.",
      answer: "RENAME course_list TO courses;"
    },
    {
      id: "SQL-07",
      category: "ALTER TABLE",
      question: "Assume students exists and has no email column. Add email VARCHAR2(100) using Oracle's parenthesized ALTER TABLE ADD syntax.",
      answer: "ALTER TABLE students ADD (email VARCHAR2(100));"
    },
    {
      id: "SQL-08",
      category: "ALTER TABLE",
      question: "Assume students.name is VARCHAR2(50). Increase its length to VARCHAR2(100) using Oracle's parenthesized ALTER TABLE MODIFY syntax.",
      answer: "ALTER TABLE students MODIFY (name VARCHAR2(100));"
    },
    {
      id: "SQL-09",
      category: "ALTER TABLE",
      question: "Assume students has an age column. Drop only that column, keeping the table, using the Oracle DROP COLUMN clause.",
      answer: "ALTER TABLE students DROP COLUMN age;"
    },
    {
      id: "SQL-10",
      category: "TRUNCATE TABLE",
      question: "Remove every row from students while keeping the table structure.",
      answer: "TRUNCATE TABLE students;"
    },
    {
      id: "SQL-11",
      category: "TRUNCATE TABLE",
      question: "Remove every row from staging_records while keeping the table structure.",
      answer: "TRUNCATE TABLE staging_records;"
    },
    {
      id: "SQL-12",
      category: "INSERT",
      question: "Insert one row into students with student_id 101, name Asha, and age 20. Use an explicit column list in that order.",
      answer: "INSERT INTO students (student_id, name, age) VALUES (101, 'Asha', 20);"
    },
    {
      id: "SQL-13",
      category: "INSERT",
      question: "Insert one row into courses with course_id 7 and title Database Systems. Use an explicit column list in that order.",
      answer: "INSERT INTO courses (course_id, title) VALUES (7, 'Database Systems');"
    },
    {
      id: "SQL-14",
      category: "UPDATE",
      question: "In students, set age to 21 only for the row whose student_id equals 101.",
      answer: "UPDATE students SET age = 21 WHERE student_id = 101;"
    },
    {
      id: "SQL-15",
      category: "UPDATE",
      question: "In the learners table, set name to Ravi only for the row whose student_id equals 12.",
      answer: "UPDATE learners SET name = 'Ravi' WHERE student_id = 12;"
    },
    {
      id: "SQL-16",
      category: "DELETE",
      question: "Delete the student whose student_id is 101 from students.",
      answer: "DELETE FROM students WHERE student_id = 101;"
    },
    {
      id: "SQL-17",
      category: "DELETE",
      question: "Delete enrollment rows for course_id 4 from enrollments.",
      answer: "DELETE FROM enrollments WHERE course_id = 4;"
    },
    {
      id: "SQL-18",
      category: "SELECT",
      question: "Select every column and every row from students.",
      answer: "SELECT * FROM students;"
    },
    {
      id: "SQL-19",
      category: "SELECT",
      question: "Select the name and age of students whose age is greater than 18.",
      answer: "SELECT name, age FROM students WHERE age > 18;"
    },
    {
      id: "SQL-20",
      category: "SELECT",
      question: "Select course_id and title from courses, ordering by title with ASC explicitly specified.",
      answer: "SELECT course_id, title FROM courses ORDER BY title ASC;"
    },
    {
      id: "SQL-21",
      category: "CREATE TABLE",
      question: "Using Oracle SQL, create employees with columns in this order: emp_id NUMBER with an inline PRIMARY KEY, emp_name VARCHAR2(60) NOT NULL, and salary NUMBER(8,2).",
      answer: "CREATE TABLE employees (emp_id NUMBER PRIMARY KEY, emp_name VARCHAR2(60) NOT NULL, salary NUMBER(8,2));"
    },
    {
      id: "SQL-22",
      category: "CREATE TABLE",
      question: "Using Oracle SQL, create departments with dept_id NUMBER as an inline PRIMARY KEY and dept_name VARCHAR2(40) with an inline UNIQUE constraint. dept_name may be NULL.",
      answer: "CREATE TABLE departments (dept_id NUMBER PRIMARY KEY, dept_name VARCHAR2(40) UNIQUE);"
    },
    {
      id: "SQL-23",
      category: "CREATE TABLE",
      question: "Using Oracle SQL, create books with book_id NUMBER as the primary key, title VARCHAR2(120), and published_year NUMBER(4).",
      answer: "CREATE TABLE books (book_id NUMBER PRIMARY KEY, title VARCHAR2(120), published_year NUMBER(4));"
    },
    {
      id: "SQL-24",
      category: "CREATE TABLE",
      question: "Using Oracle SQL, create products with product_id NUMBER as an inline PRIMARY KEY, product_name VARCHAR2(80), and price NUMBER(10,2) that is NOT NULL and has an inline CHECK constraint requiring price > 0.",
      answer: "CREATE TABLE products (product_id NUMBER PRIMARY KEY, product_name VARCHAR2(80), price NUMBER(10,2) NOT NULL CHECK (price > 0));"
    },
    {
      id: "SQL-25",
      category: "DROP TABLE",
      question: "Drop the Oracle table old_logs without using PURGE.",
      answer: "DROP TABLE old_logs;"
    },
    {
      id: "SQL-26",
      category: "DROP TABLE",
      question: "Drop the Oracle table temp_orders without using PURGE.",
      answer: "DROP TABLE temp_orders;"
    },
    {
      id: "SQL-27",
      category: "DROP TABLE",
      question: "Drop the Oracle table archive_data without using PURGE.",
      answer: "DROP TABLE archive_data;"
    },
    {
      id: "SQL-28",
      category: "DROP TABLE",
      question: "Drop the Oracle table backup_students without using PURGE.",
      answer: "DROP TABLE backup_students;"
    },
    {
      id: "SQL-29",
      category: "RENAME TABLE",
      question: "Rename the table staff to employees using Oracle SQL.",
      answer: "RENAME staff TO employees;"
    },
    {
      id: "SQL-30",
      category: "RENAME TABLE",
      question: "Rename the table results_old to exam_results using Oracle SQL.",
      answer: "RENAME results_old TO exam_results;"
    },
    {
      id: "SQL-31",
      category: "RENAME TABLE",
      question: "Rename the table inventory to stock_items using Oracle SQL.",
      answer: "RENAME inventory TO stock_items;"
    },
    {
      id: "SQL-32",
      category: "ALTER TABLE",
      question: "Assume employees exists and has no phone column. Add phone VARCHAR2(15) using Oracle's parenthesized ALTER TABLE ADD syntax.",
      answer: "ALTER TABLE employees ADD (phone VARCHAR2(15));"
    },
    {
      id: "SQL-33",
      category: "ALTER TABLE",
      question: "Assume courses.title is VARCHAR2(100). Increase its length to VARCHAR2(150) using Oracle's parenthesized ALTER TABLE MODIFY syntax.",
      answer: "ALTER TABLE courses MODIFY (title VARCHAR2(150));"
    },
    {
      id: "SQL-34",
      category: "ALTER TABLE",
      question: "Assume employees exists and has no hire_date column. Add hire_date DATE using Oracle's parenthesized ALTER TABLE ADD syntax.",
      answer: "ALTER TABLE employees ADD (hire_date DATE);"
    },
    {
      id: "SQL-35",
      category: "TRUNCATE TABLE",
      question: "Remove every row from audit_staging while keeping its table structure.",
      answer: "TRUNCATE TABLE audit_staging;"
    },
    {
      id: "SQL-36",
      category: "TRUNCATE TABLE",
      question: "Remove every row from temporary_products while keeping its table structure.",
      answer: "TRUNCATE TABLE temporary_products;"
    },
    {
      id: "SQL-37",
      category: "TRUNCATE TABLE",
      question: "Remove every row from import_queue while keeping its table structure.",
      answer: "TRUNCATE TABLE import_queue;"
    },
    {
      id: "SQL-38",
      category: "TRUNCATE TABLE",
      question: "Remove every row from archived_sessions while keeping its table structure.",
      answer: "TRUNCATE TABLE archived_sessions;"
    },
    {
      id: "SQL-39",
      category: "INSERT",
      question: "Insert one row into employees using this explicit column order: emp_id 201, emp_name Mira, salary 45000.",
      answer: "INSERT INTO employees (emp_id, emp_name, salary) VALUES (201, 'Mira', 45000);"
    },
    {
      id: "SQL-40",
      category: "INSERT",
      question: "Insert one row into departments using this explicit column order: dept_id 5, dept_name Research.",
      answer: "INSERT INTO departments (dept_id, dept_name) VALUES (5, 'Research');"
    },
    {
      id: "SQL-41",
      category: "INSERT",
      question: "Insert one row into books using this explicit column order: book_id 301, title Oracle Basics, published_year 2024.",
      answer: "INSERT INTO books (book_id, title, published_year) VALUES (301, 'Oracle Basics', 2024);"
    },
    {
      id: "SQL-42",
      category: "INSERT",
      question: "Insert one row into products using this explicit column order: product_id 11, product_name Notebook, price 125.50.",
      answer: "INSERT INTO products (product_id, product_name, price) VALUES (11, 'Notebook', 125.50);"
    },
    {
      id: "SQL-43",
      category: "UPDATE",
      question: "In employees, set salary to 50000 only for the row whose emp_id equals 201.",
      answer: "UPDATE employees SET salary = 50000 WHERE emp_id = 201;"
    },
    {
      id: "SQL-44",
      category: "UPDATE",
      question: "In departments, set dept_name to Engineering only for the row whose dept_id equals 5.",
      answer: "UPDATE departments SET dept_name = 'Engineering' WHERE dept_id = 5;"
    },
    {
      id: "SQL-45",
      category: "UPDATE",
      question: "In products, set price to 150 (do not add 150 to the current price) only for the row whose product_id equals 11.",
      answer: "UPDATE products SET price = 150 WHERE product_id = 11;"
    },
    {
      id: "SQL-46",
      category: "UPDATE",
      question: "In books, set title to Advanced Oracle only for the row whose book_id equals 301.",
      answer: "UPDATE books SET title = 'Advanced Oracle' WHERE book_id = 301;"
    },
    {
      id: "SQL-47",
      category: "DELETE",
      question: "Delete employee 201 from employees.",
      answer: "DELETE FROM employees WHERE emp_id = 201;"
    },
    {
      id: "SQL-48",
      category: "DELETE",
      question: "Delete department 5 from departments.",
      answer: "DELETE FROM departments WHERE dept_id = 5;"
    },
    {
      id: "SQL-49",
      category: "DELETE",
      question: "Delete products priced below 10 from products.",
      answer: "DELETE FROM products WHERE price < 10;"
    },
    {
      id: "SQL-50",
      category: "SELECT",
      question: "Count all rows in students and assign the result alias student_count using the AS keyword.",
      answer: "SELECT COUNT(*) AS student_count FROM students;"
    }
  ];
})();
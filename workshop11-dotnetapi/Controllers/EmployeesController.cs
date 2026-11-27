using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using workshop11_dotnetapi.Dtos.Employee;
using workshop11_dotnetapi.Models;

namespace workshop11_dotnetapi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeesController : ControllerBase
    {
        private static readonly List<Employee> Employees =
        [
            new Employee
            {
                Id = 1,
                EmployeeCode = "260001",
                Name = "James",
                Department = "IT",
            },
            new Employee
            {
                Id = 2,
                EmployeeCode = "260002",
                Name = "Kevin",
                Department = "Engineering",
            },
        ];

        [HttpGet]
        public ActionResult<IEnumerable<Employee>> GetAll() => Ok(Employees);

        [HttpGet("{id:int}")]
        public ActionResult<Employee> GetById(int id)
        {
            Employee? employee = Employees.FirstOrDefault(e => e.Id == id);

            if (employee is null)
            {
                return NotFound(new { message = "Employee not found" });
            }

            return Ok(employee);
        }

        [HttpPost]
        public ActionResult<Employee> Create([FromBody] CreateEmployeeRequest request)
        {
            bool exists = Employees.Any(e => e.EmployeeCode == request.EmployeeCode);
            if (exists)
            {
                ModelState.AddModelError(
                    nameof(request.EmployeeCode),
                    "Employee code already exists."
                );
                return ValidationProblem(ModelState);
            }

            Employee employee = new Employee
            {
                Id = Employees.Count + 1,
                EmployeeCode = request.EmployeeCode,
                Department = request.Department,
                Name = request.Name,
            };

            Employees.Add(employee);

            return CreatedAtAction(nameof(GetById), new { id = employee.Id }, employee);
        }
    }
}

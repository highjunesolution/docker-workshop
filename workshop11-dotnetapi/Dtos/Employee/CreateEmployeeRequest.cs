using System;

namespace workshop11_dotnetapi.Dtos.Employee;

public class CreateEmployeeRequest
{
    public string EmployeeCode {get; set;} = string.Empty;

    public string Name {get; set;} = string.Empty;

    public string Department {get; set;} = string.Empty;

}

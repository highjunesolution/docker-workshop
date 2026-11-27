using System;

namespace workshop11_dotnetapi.Models;

public class Employee
{
    public int Id {get; set;}

    public string EmployeeCode {get; set;} = string.Empty;

    public string Name {get; set;} = string.Empty;

    public string Department {get; set;} = string.Empty;
}

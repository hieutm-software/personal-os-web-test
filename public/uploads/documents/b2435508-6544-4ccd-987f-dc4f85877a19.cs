using Abp.Application.Services;
using ERP.Business.LeaveApplication.Dto;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace ERP.Business.LeaveApplication
{
    internal interface IEmployeeAnnualLeaveAppService : IApplicationService
    {
        Task<EmployeeAnnualLeaveDto> GetByeEmployeeId(long id);
        Task<EmployeeAnnualLeaveDto> GetByCode(string code);
        Task Update(EmployeeAnnualLeaveDto input);
    }
}

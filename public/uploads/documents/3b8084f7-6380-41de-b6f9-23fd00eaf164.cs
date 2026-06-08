using Abp.Application.Services;
using ERP.Business.LeaveApplication.Dto;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace ERP.Business.LeaveApplication
{
    internal interface IEmployeeInfoAppService: IApplicationService
    {
        Task<EmployeeInfoDto> GetBySubscriberEmail(string subscriberEmail);
        Task<EmployeeInfoDto> GetById(long id);
        Task<EmployeeInfoDto> GetBySubscriberKPIEmail(string subscriberKPIEmail);
    }
}
